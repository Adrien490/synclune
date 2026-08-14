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
	BusinessError,
} from "@/shared/lib/actions";
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
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
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

		// Check existence + SKU usage and delete atomically.
		// La FK ProductSkuMaterial.materialId est en ON DELETE RESTRICT (cf. migration
		// 20260514163156_add_sku_materials_m2m) : le delete lèverait P2003 si un
		// SKU concurrent est créé entre le count et le delete. La pré-vérification
		// reste pour produire un message UI lisible avant d'atteindre la contrainte DB.
		const existingMaterial = await prisma.$transaction(async (tx) => {
			const material = await tx.material.findUnique({
				where: { id: validatedData.id },
				include: {
					_count: {
						select: {
							// Ne compter que les variantes VIVANTES : un lien porte par un SKU
							// soft-deleted (produit supprime) renvoyait « utilise par N
							// variante(s) » vers des variantes invisibles dans l'admin, rendant
							// le materiau indelebile a jamais. Le vrai garde-fou reste la FK
							// `ON DELETE RESTRICT`, rattrapee en P2003 plus bas.
							skuMaterials: { where: { sku: { deletedAt: null } } },
						},
					},
				},
			});

			if (!material) return null;

			const skuCount = material._count.skuMaterials;
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
			return error("Ce matériau n'existe pas");
		}

		// Invalider le cache
		const tags = getMaterialInvalidationTags(existingMaterial.slug);
		tags.forEach((tag) => updateTag(tag));

		return success("Matériau supprimé avec succès");
	} catch (e) {
		// P2003 : violation FK Restrict. Deux causes possibles — un SKU cree en
		// concurrence apres la pre-verification, ou un lien porte par une variante
		// soft-deleted (le pre-check les ignore desormais, la FK non). Message
		// explicite sur le second cas, sinon l'admin cherche une variante fantome.
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
			return error(
				"Ce matériau reste rattaché à au moins une variante (éventuellement celle d'un bijou supprimé). Il ne peut pas être supprimé — désactivez-le pour le retirer des choix proposés.",
			);
		}
		return handleActionError(e, "Impossible de supprimer le matériau");
	}
}
