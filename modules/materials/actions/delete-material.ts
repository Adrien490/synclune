"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import {
	handleActionError,
	success,
	error,
	validateInput,
	BusinessError,
} from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getMaterialInvalidationTags } from "../constants/cache";
import { deleteMaterialSchema } from "../schemas/materials.schemas";

export async function deleteMaterial(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_MATERIAL_LIMITS.DELETE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraire les donnees du FormData
		const rawData = {
			id: formData.get("id"),
		};

		// Valider les donnees
		const validated = validateInput(deleteMaterialSchema, rawData);
		if ("error" in validated) return validated.error;
		const validatedData = validated.data;

		// Check existence + SKU usage and delete atomically
		const existingMaterial = await prisma.$transaction(async (tx) => {
			const material = await tx.material.findUnique({
				where: { id: validatedData.id },
				include: {
					_count: {
						select: {
							skus: true,
						},
					},
				},
			});

			if (!material) return null;

			const skuCount = material._count.skus;
			if (skuCount > 0) {
				throw new BusinessError(
					`Ce materiau est utilise par ${skuCount} variante${skuCount > 1 ? "s" : ""}. Veuillez modifier ces variantes avant de supprimer le materiau.`,
				);
			}

			await tx.material.delete({
				where: { id: validatedData.id },
			});

			return material;
		});

		if (!existingMaterial) {
			return error("Ce materiau n'existe pas");
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "material.delete",
			targetType: "material",
			targetId: validatedData.id,
			metadata: { name: existingMaterial.name },
		});

		// Invalider le cache
		const tags = getMaterialInvalidationTags(existingMaterial.slug);
		tags.forEach((tag) => updateTag(tag));

		return success("Matériau supprimé avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer le materiau");
	}
}
