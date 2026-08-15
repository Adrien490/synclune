"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { validateInput, handleActionError, success, error, notFound } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { sanitizeText } from "@/shared/lib/sanitize";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { updateCollectionSchema } from "../schemas/collection.schemas";

export async function updateCollection(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extract and validate data
		const validated = validateInput(updateCollectionSchema, {
			id: formData.get("id"),
			name: formData.get("name"),
			description: formData.get("description") ?? null,
			active: formData.get("active"),
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// Sanitize text inputs
		const sanitizedName = sanitizeText(validatedData.name);
		const sanitizedDescription = validatedData.description
			? sanitizeText(validatedData.description)
			: null;

		// 3. Transaction pour garantir l'atomicite
		const { newSlug, oldSlug } = await prisma.$transaction(async (tx) => {
			// Verifier que la collection existe
			const existingCollection = await tx.collection.findUnique({
				where: { id: validatedData.id },
			});

			if (!existingCollection) {
				throw new Error("NOT_FOUND");
			}

			// Verifier l'unicite du nom (sauf si c'est le meme)
			if (sanitizedName !== existingCollection.name) {
				const nameExists = await tx.collection.findFirst({
					where: { name: sanitizedName },
				});

				if (nameExists) {
					throw new Error("NAME_EXISTS");
				}
			}

			// Generer un nouveau slug si le nom a change.
			// Une collection publiée ne peut pas etre renommee : changer le slug
			// casserait le SEO (backlinks indexes Google) sans 301 redirect.
			const slugChanged = sanitizedName !== existingCollection.name;
			if (slugChanged && existingCollection.active) {
				throw new Error("PUBLIC_RENAME_BLOCKED");
			}
			// `excludeId` : sans lui, un rename cosmétique (casse/accent) retrouvait
			// son PROPRE slug et suffixait `-2` — l'URL changeait sans raison.
			const generatedSlug = slugChanged
				? await generateSlug(tx, "collection", sanitizedName, {
						excludeId: validatedData.id,
					})
				: existingCollection.slug;

			// Mettre a jour la collection
			await tx.collection.update({
				where: { id: validatedData.id },
				data: {
					name: sanitizedName,
					slug: generatedSlug,
					description: sanitizedDescription,
					active: validatedData.active,
				},
			});

			return {
				newSlug: generatedSlug,
				oldSlug: slugChanged ? existingCollection.slug : null,
			};
		});

		// Invalider le cache (nouveau slug + ancien slug si rename)
		getCollectionInvalidationTags(newSlug).forEach((tag) => updateTag(tag));
		if (oldSlug) {
			getCollectionInvalidationTags(oldSlug).forEach((tag) => updateTag(tag));
		}

		return success("Collection modifiée avec succès");
	} catch (e) {
		// Gerer les erreurs metier de la transaction
		if (e instanceof Error) {
			if (e.message === "NOT_FOUND") {
				return notFound("Collection", "f");
			}
			if (e.message === "NAME_EXISTS") {
				return error("Ce nom de collection existe déjà. Choisis-en un autre.");
			}
			if (e.message === "PUBLIC_RENAME_BLOCKED") {
				return error(
					"Une collection publiée ne peut pas être renommée (cela casserait le SEO). Repassez-la en brouillon ou archivez-la d'abord.",
				);
			}
		}
		// Defense-in-depth : la contrainte DB UNIQUE sur Collection.name leve P2002
		// si une race condition slip past le findFirst pre-check.
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
			const target = (e.meta?.target as string[] | undefined) ?? [];
			if (target.includes("name") || target.includes("Collection_name_key")) {
				return error("Ce nom de collection existe déjà. Choisis-en un autre.");
			}
		}
		return handleActionError(e, "Erreur lors de la modification de la collection");
	}
}
