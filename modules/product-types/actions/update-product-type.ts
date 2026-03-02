"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error, notFound } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
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
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

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

		// 5. Verifier que le type existe
		const existingType = await prisma.productType.findUnique({
			where: { id: validatedData.id },
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

		// 7. Verifier l'unicite du label (case-insensitive, sauf si c'est le meme)
		if (validatedData.label.toLowerCase() !== existingType.label.toLowerCase()) {
			const labelExists = await prisma.productType.findFirst({
				where: { label: { equals: validatedData.label, mode: "insensitive" } },
			});

			if (labelExists) {
				return error("Ce label de type existe deja. Veuillez en choisir un autre.");
			}
		}

		// 8. Generer un nouveau slug si le label a change
		const slug =
			validatedData.label !== existingType.label
				? await generateSlug(prisma, "productType", validatedData.label)
				: existingType.slug;

		// 9. Mettre a jour le type
		await prisma.productType.update({
			where: { id: validatedData.id },
			data: {
				label: sanitizeText(validatedData.label),
				description: validatedData.description ? sanitizeText(validatedData.description) : null,
				slug,
			},
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "productType.update",
			targetType: "productType",
			targetId: validatedData.id,
			metadata: { label: validatedData.label },
		});

		// 10. Invalider le cache des types de produits
		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		return success("Type de produit modifié avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la modification du type de produit");
	}
}
