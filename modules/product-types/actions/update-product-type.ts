"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";
import { updateProductTypeSchema } from "../schemas/product-type.schemas";

export async function updateProductType(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification de l'authentification et des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraire les donnees du FormData
		const rawData = {
			id: formData.get("id"),
			label: formData.get("label"),
			description: formData.get("description") || undefined,
		};

		// 3. Valider les donnees
		const validated = validateInput(updateProductTypeSchema, rawData);
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 4. Verifier que le type existe
		const existingType = await prisma.productType.findUnique({
			where: { id: validatedData.id },
		});

		if (!existingType) {
			return error("Ce type de produit n'existe pas");
		}

		// 5. Protection: Les types systeme ne peuvent pas etre modifies (label/slug)
		if (existingType.isSystem) {
			return error(`Le type "${existingType.label}" est un type systeme et ne peut pas etre modifie`);
		}

		// 6. Verifier l'unicite du label (sauf si c'est le meme)
		if (validatedData.label !== existingType.label) {
			const labelExists = await prisma.productType.findFirst({
				where: { label: validatedData.label },
			});

			if (labelExists) {
				return error("Ce label de type existe deja. Veuillez en choisir un autre.");
			}
		}

		// 7. Generer un nouveau slug si le label a change
		const slug =
			validatedData.label !== existingType.label
				? await generateSlug(prisma, "productType", validatedData.label)
				: existingType.slug;

		// 8. Mettre a jour le type
		await prisma.productType.update({
			where: { id: validatedData.id },
			data: {
				label: sanitizeText(validatedData.label),
				description: validatedData.description
					? sanitizeText(validatedData.description)
					: undefined,
				slug,
			},
		});

		// 9. Invalider le cache des types de produits
		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		return success("Type de produit modifié avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la modification du type de produit");
	}
}
