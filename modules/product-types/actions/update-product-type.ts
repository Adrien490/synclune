"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error, notFound } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_TYPE_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";
import { updateProductTypeSchema } from "../schemas/product-type.schemas";

export async function updateProductType(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification de l'authentification et des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TYPE_LIMITS.UPDATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraire les donnees du FormData
		const rawData = {
			id: formData.get("id"),
			label: formData.get("label"),
			description: formData.get("description") ?? undefined,
		};

		// 4. Valider les donnees
		const validated = validateInput(updateProductTypeSchema, rawData);
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 5. Verifier que le type existe (slug nécessaire pour invalidation tag détail)
		const existingType = await prisma.productType.findUnique({
			where: { id: validatedData.id },
			select: { id: true, label: true, slug: true, isSystem: true },
		});

		if (!existingType) {
			return notFound("Type de produit");
		}

		// 6. Protection: Les types systeme ne peuvent pas etre modifies (label/slug)
		if (existingType.isSystem) {
			return error(
				`Le type "${existingType.label}" est un type systeme et ne peut pas etre modifie`,
			);
		}

		// Sanitizer AVANT l'unicité et le slug : l'update écrivait
		// `sanitizeText(label)` alors que les deux contrôles portaient sur le
		// label brut (même raison que create-product-type).
		const sanitizedLabel = sanitizeText(validatedData.label);

		// 7. Verifier l'unicite du label (case-insensitive, sauf si c'est le meme)
		if (sanitizedLabel.toLowerCase() !== existingType.label.toLowerCase()) {
			const labelExists = await prisma.productType.findFirst({
				where: { label: { equals: sanitizedLabel, mode: "insensitive" } },
			});

			if (labelExists) {
				return error("Ce label de type existe déjà. Choisis-en un autre.");
			}
		}

		// 8. Generer un nouveau slug si le label a change.
		// `excludeId` : sans lui, un rename cosmétique (casse/accent) retrouvait
		// son PROPRE slug et suffixait `-2` — l'URL de la catégorie changeait.
		const slug =
			sanitizedLabel !== existingType.label
				? await generateSlug(prisma, "productType", sanitizedLabel, {
						excludeId: validatedData.id,
					})
				: existingType.slug;

		// 9. Mettre a jour le type (updateMany atomique avec guard isSystem=false pour eviter TOCTOU)
		const updateResult = await prisma.productType.updateMany({
			where: { id: validatedData.id, isSystem: false },
			data: {
				label: sanitizedLabel,
				description: validatedData.description ? sanitizeText(validatedData.description) : null,
				slug,
			},
		});

		if (updateResult.count === 0) {
			return error(
				"Le type ne peut plus être modifié (il a été supprimé ou est devenu un type système)",
			);
		}

		// 10. Invalider le cache des types de produits (ancien + nouveau slug si changement)
		const invalidationTags = new Set<string>([
			...getProductTypeInvalidationTags(existingType.slug),
			...getProductTypeInvalidationTags(slug),
		]);
		invalidationTags.forEach((tag) => updateTag(tag));

		return success("Type de produit modifié avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la modification du type de produit");
	}
}
