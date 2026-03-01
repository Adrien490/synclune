"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_TYPE_LIMITS } from "@/shared/lib/rate-limit-config";
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
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_TYPE_LIMITS.CREATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraire les donnees du FormData
		const rawData = {
			label: formData.get("label"),
			description: formData.get("description") || undefined,
		};

		// 3. Valider les donnees
		const validated = validateInput(createProductTypeSchema, rawData);
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 4. Verifier l'unicite du label
		const existingLabel = await prisma.productType.findFirst({
			where: { label: validatedData.label },
		});

		if (existingLabel) {
			return error("Ce label de type existe deja. Veuillez en choisir un autre.");
		}

		// 5. Generer un slug unique automatiquement
		const slug = await generateSlug(prisma, "productType", validatedData.label);

		// 6. Creer le type de produit
		const created = await prisma.productType.create({
			data: {
				label: sanitizeText(validatedData.label),
				description: validatedData.description
					? sanitizeText(validatedData.description)
					: undefined,
				slug,
				isActive: true,
				isSystem: false, // Les types crees manuellement ne sont pas systeme
			},
		});

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name || adminUser.email,
			action: "productType.create",
			targetType: "productType",
			targetId: created.id,
			metadata: { label: validatedData.label },
		});

		// 7. Invalider le cache des types de produits
		getProductTypeInvalidationTags().forEach((tag) => updateTag(tag));

		return success("Type de produit créé avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la création du type de produit");
	}
}
