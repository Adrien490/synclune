"use server";

import { updateTag } from "next/cache";

import { Prisma } from "@/app/generated/prisma/client";
import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	handleActionError,
	success,
	error,
	validateInput,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getMaterialInvalidationTags } from "../constants/cache";
import { updateMaterialSchema } from "../schemas/materials.schemas";

export async function updateMaterial(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_MATERIAL_LIMITS.UPDATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraire les donnees du FormData
		const rawData = {
			id: formData.get("id"),
			name: sanitizeText(safeFormGet(formData, "name") ?? ""),
			description: safeFormGet(formData, "description")
				? sanitizeText(safeFormGet(formData, "description")!)
				: null,
			isActive: formData.get("isActive") === "true",
		};

		// Valider les donnees
		const validated = validateInput(updateMaterialSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Verifier que le materiau existe
		const existingMaterial = await prisma.material.findUnique({
			where: { id: validatedData.id },
		});

		if (!existingMaterial) {
			return error("Ce matériau n'existe pas");
		}

		// Verifier l'unicite du nom (sauf si c'est le meme) — insensible à la
		// casse (aligné sur les types de bijoux). `id: { not }` : un rename
		// purement cosmétique se retrouverait lui-même en insensible et serait
		// rejeté à tort.
		if (validatedData.name !== existingMaterial.name) {
			const nameExists = await prisma.material.findFirst({
				where: {
					name: { equals: validatedData.name, mode: "insensitive" },
					id: { not: validatedData.id },
				},
			});

			if (nameExists) {
				return error("Ce nom de matériau existe déjà. Choisis-en un autre.");
			}
		}

		// Generer un nouveau slug si le nom a change.
		// `excludeId` : sans lui, un rename cosmétique (casse/accent) retrouvait
		// son PROPRE slug et suffixait `-2` — l'URL changeait sans raison.
		const slug =
			validatedData.name !== existingMaterial.name
				? await generateSlug(prisma, "material", validatedData.name, {
						excludeId: validatedData.id,
					})
				: existingMaterial.slug;

		// Mettre a jour le materiau
		await prisma.material.update({
			where: { id: validatedData.id },
			data: {
				name: validatedData.name,
				slug,
				description: validatedData.description,
				isActive: validatedData.isActive,
			},
		});

		// Cascade : si le nom (ou isActive) change, les PDP storefront affichant
		// ce matériau dans les badges/swatches SKU doivent être réinvalidés.
		const nameChanged = validatedData.name !== existingMaterial.name;
		const activeChanged = validatedData.isActive !== existingMaterial.isActive;
		const affectedProductSlugs: string[] = [];
		if (nameChanged || activeChanged) {
			const skus = await prisma.productSku.findMany({
				where: {
					deletedAt: null,
					materials: { some: { materialId: validatedData.id } },
				},
				select: { product: { select: { slug: true } } },
				distinct: ["productId"],
			});
			for (const s of skus) {
				if (s.product.slug) affectedProductSlugs.push(s.product.slug);
			}
		}

		// Invalider le cache — dedupe via Set sur (ancien slug ∪ nouveau slug)
		// avec cascade product slugs.
		const tagSet = new Set<string>(
			getMaterialInvalidationTags({ slug: existingMaterial.slug, affectedProductSlugs }),
		);
		if (slug !== existingMaterial.slug) {
			getMaterialInvalidationTags({ slug, affectedProductSlugs }).forEach((t) => tagSet.add(t));
		}
		tagSet.forEach((tag) => updateTag(tag));

		return success("Matériau modifié avec succès");
	} catch (e) {
		// Race TOC: même si le pre-check passe, deux mises à jour concurrentes peuvent
		// violer la contrainte `@unique` sur `name`. Message aligné avec le pre-check.
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
			return error("Ce nom de matériau existe déjà. Choisis-en un autre.");
		}
		return handleActionError(e, "Impossible de modifier le matériau");
	}
}
