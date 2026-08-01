"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { sanitizeText } from "@/shared/lib/sanitize";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { createCollectionSchema } from "../schemas/collection.schemas";

export async function createCollection(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.CREATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Extract and validate data
		const validated = validateInput(createCollectionSchema, {
			name: formData.get("name"),
			description: formData.get("description") ?? null,
			status: formData.get("status") ?? undefined,
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// Sanitize text inputs
		const sanitizedName = sanitizeText(validatedData.name);
		const sanitizedDescription = validatedData.description
			? sanitizeText(validatedData.description)
			: null;

		// Transaction pour garantir l'atomicite slug + create.
		// Unicite du nom : assuree par la contrainte DB UNIQUE (Prisma P2002 catched ci-dessous).
		const { slug, id } = await prisma.$transaction(async (tx) => {
			const slug = await generateSlug(tx, "collection", sanitizedName);

			const created = await tx.collection.create({
				data: {
					name: sanitizedName,
					slug,
					description: sanitizedDescription,
					status: validatedData.status,
				},
			});

			return { slug, id: created.id };
		});

		// Invalider le cache
		getCollectionInvalidationTags(slug).forEach((tag) => updateTag(tag));

		return success(`Collection « ${sanitizedName} » créée`, {
			id,
			name: sanitizedName,
			collectionStatus: validatedData.status,
		});
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
			const target = (e.meta?.target as string[] | undefined) ?? [];
			if (target.includes("name") || target.includes("Collection_name_key")) {
				return error("Ce nom de collection existe déjà. Veuillez en choisir un autre.");
			}
		}
		return handleActionError(e, "Erreur lors de la création de la collection");
	}
}
