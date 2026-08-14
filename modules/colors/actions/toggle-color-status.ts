"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLOR_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getColorInvalidationTags } from "../constants/cache";
import { toggleColorStatusSchema } from "../schemas/color.schemas";

export async function toggleColorStatus(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin authorization check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLOR_LIMITS.TOGGLE_STATUS);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extract data from FormData
		const rawData = {
			id: formData.get("id"),
			isActive: formData.get("isActive") === "true",
		};

		// Validate data
		const validated = validateInput(toggleColorStatusSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Check that the color exists
		const existingColor = await prisma.color.findUnique({
			where: { id: validatedData.id },
		});

		if (!existingColor) {
			return error("Cette couleur n'existe pas");
		}

		// Short-circuit if status is already the desired value
		if (existingColor.isActive === validatedData.isActive) {
			return success(validatedData.isActive ? "Couleur déjà active" : "Couleur déjà inactive");
		}

		// Update status
		await prisma.color.update({
			where: { id: validatedData.id },
			data: {
				isActive: validatedData.isActive,
			},
		});

		// Cascade : désactiver une couleur doit retirer son swatch des PDP
		// storefront immédiatement (sinon stale jusqu'à 24h, profil `reference`).
		const skus = await prisma.productSku.findMany({
			where: { deletedAt: null, colors: { some: { colorId: validatedData.id } } },
			select: { product: { select: { slug: true } } },
			distinct: ["productId"],
		});
		const affectedProductSlugs = skus.map((s) => s.product.slug).filter(Boolean);

		// Invalidate cache
		const tags = getColorInvalidationTags({
			slug: existingColor.slug,
			affectedProductSlugs,
		});
		tags.forEach((tag) => updateTag(tag));

		return success(
			validatedData.isActive ? "Couleur activée avec succès" : "Couleur désactivée avec succès",
		);
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut de la couleur");
	}
}
