"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getProductTypeInvalidationTags } from "../utils/cache.utils";
import { createProductTypeSchema } from "../schemas/product-type.schemas";

export async function createProductType(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification de l'authentification et des droits admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extraire les donnees du FormData
		const rawData = {
			label: formData.get("label"),
		};

		// 4. Valider les donnees
		const validated = validateInput(createProductTypeSchema, rawData);
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// Sanitizer AVANT l'unicité et le slug : l'insert écrivait
		// `sanitizeText(label)` alors que les deux contrôles portaient sur le
		// label brut — un label qui ne diffère que par le contenu sanitizé
		// contournait l'unicité et générait un slug depuis la version brute.
		const sanitizedLabel = sanitizeText(validatedData.label);

		// 5. Verifier l'unicite du label (case-insensitive)
		const existingLabel = await prisma.productType.findFirst({
			where: { label: { equals: sanitizedLabel, mode: "insensitive" } },
		});

		if (existingLabel) {
			return error("Ce label de type existe déjà. Choisis-en un autre.");
		}

		// 6. Generer un slug unique automatiquement
		const slug = await generateSlug(prisma, "productType", sanitizedLabel);

		// 7. Creer le type de produit
		const created = await prisma.productType.create({
			data: {
				label: sanitizedLabel,
				slug,
			},
		});

		// 8. Invalider le cache des types de produits
		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		return success("Type de produit créé avec succès", { id: created.id, label: created.label });
	} catch (e) {
		return handleActionError(e, "Erreur lors de la création du type de produit");
	}
}
