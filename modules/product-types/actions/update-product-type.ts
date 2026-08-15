"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { validateInput, handleActionError, success, error, notFound } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
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

		// 2. Extraire les donnees du FormData
		const rawData = {
			id: formData.get("id"),
			label: formData.get("label"),
		};

		// 4. Valider les donnees
		const validated = validateInput(updateProductTypeSchema, rawData);
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 5. Verifier que le type existe (slug nécessaire pour invalidation tag détail)
		const existingType = await prisma.productType.findUnique({
			where: { id: validatedData.id },
			select: { id: true, label: true, slug: true },
		});

		if (!existingType) {
			return notFound("Type de produit");
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

		// 9. Mettre a jour le type
		const updateResult = await prisma.productType.updateMany({
			where: { id: validatedData.id },
			data: {
				label: sanitizedLabel,
				slug,
			},
		});

		if (updateResult.count === 0) {
			return error("Le type ne peut plus être modifié (il a été supprimé)");
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
