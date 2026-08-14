"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
import { ADMIN_SKU_TOGGLE_STATUS_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	BusinessError,
	handleActionError,
	success,
	safeFormGet,
} from "@/shared/lib/actions";
import { updateProductSkuStatusSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";
import { assertPublicProductKeepsActiveSku } from "../services/validate-public-active-sku.service";
import { assertUniqueVariantCombination } from "../services/persist-sku-helpers.service";

/**
 * Server Action pour mettre a jour le statut actif/inactif d'un SKU
 * Compatible avec useActionState de React 19
 */
export async function updateProductSkuStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_TOGGLE_STATUS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraction des donnees du FormData
		const rawData = {
			skuId: safeFormGet(formData, "skuId"),
			isActive: formData.get("isActive") === "true",
		};

		// 4. Validation avec Zod
		const validated = validateInput(updateProductSkuStatusSchema, rawData);
		if ("error" in validated) return validated.error;

		const { skuId: validatedSkuId, isActive: validatedIsActive } = validated.data;

		// 5. Vérifier existence, règles métier, et mettre à jour dans une transaction
		const { existingSku, updatedSku } = await prisma.$transaction(
			async (tx) => {
				// `deletedAt: null` — réactiver un SKU soft-deleted (produit supprimé)
				// fabriquerait une variante vivante sur un produit invisible : anomalie,
				// même garde que les 5 autres mutateurs SKU.
				const existing = await tx.productSku.findUnique({
					where: { id: validatedSkuId, deletedAt: null },
					select: {
						id: true,
						sku: true,
						isActive: true,
						position: true,
						productId: true,
						// Requis par la garde d'identité de variante à l'activation (cf. plus bas).
						size: true,
						colors: { select: { colorId: true } },
						product: {
							select: {
								slug: true,
								status: true,
								_count: {
									select: {
										skus: { where: { isActive: true, deletedAt: null } },
									},
								},
							},
						},
					},
				});

				if (!existing) {
					throw new BusinessError("La variante de produit n'existe pas.");
				}

				// Verifier qu'on ne desactive pas la variante principale — le rang 0
				// de (position asc, id asc), depuis le remplacement d'`isDefault` par
				// `position` (audit schéma V5, lot A2).
				if (!validatedIsActive) {
					const rankZero = await tx.productSku.findFirst({
						where: { productId: existing.productId, deletedAt: null },
						orderBy: [{ position: "asc" }, { id: "asc" }],
						select: { id: true },
					});
					if (rankZero?.id === existing.id) {
						throw new BusinessError(
							"Impossible de désactiver la variante principale d'un produit. Définis d'abord une autre variante comme principale.",
						);
					}
				}

				// Produit PUBLIC: garantir qu'au moins 1 SKU actif reste apres desactivation
				if (!validatedIsActive && existing.isActive) {
					assertPublicProductKeepsActiveSku({
						productStatus: existing.product.status,
						activeTotal: existing.product._count.skus,
						activeAffected: 1,
					});
				}

				// ACTIVATION : re-vérifier l'identité de variante (produit × taille × set de
				// couleurs). Aucune contrainte DB ne la garantit — elle dépend d'une table de
				// jointure — donc c'est ce chemin applicatif ou rien.
				//
				// Pourquoi ici et pas seulement dans create/update-sku : `duplicate-sku`
				// crée volontairement une copie à l'identité IDENTIQUE (même taille, même
				// couleurs), simplement `isActive: false` — c'est un brouillon que l'admin
				// est censé éditer. Rien ne l'y oblige : « Dupliquer » puis « Activer »
				// suffisait à publier deux variantes indistinguables, et le sélecteur du
				// storefront (qui filtre `isActive: true`) devenait ambigu.
				// La désactivation, elle, ne peut jamais créer de collision → pas de garde.
				// Audit schéma 2026-07-26.
				if (validatedIsActive && !existing.isActive) {
					await assertUniqueVariantCombination(tx, {
						productId: existing.productId,
						colorIds: existing.colors.map((c) => c.colorId),
						size: existing.size,
						excludeSkuId: existing.id,
					});
				}

				const updated = await tx.productSku.update({
					where: { id: validatedSkuId },
					data: { isActive: validatedIsActive },
					select: {
						id: true,
						sku: true,
						isActive: true,
					},
				});

				return { existingSku: existing, updatedSku: updated };
			},
			// Cette transaction tient advisory lock d'identité de variante (à l'activation).
			// Le défaut Prisma (5 s) la faisait échouer en P2028 sous contention avec le
			// webhook d'encaissement, qui verrouille les mêmes lignes avec 30 s — l'admin
			// voyait une erreur générique non déterministe. Prescrit par prisma-tx-options.
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		// 6. Invalider les cache tags concernes
		const tags = getSkuInvalidationTags(
			updatedSku.sku,
			existingSku.productId,
			existingSku.product.slug,
			updatedSku.id,
		);
		tags.forEach((tag) => updateTag(tag));

		// 7. Audit log

		// 8. Success
		return success(
			`Variante ${updatedSku.sku} ${validatedIsActive ? "activée" : "désactivée"} avec succès.`,
			updatedSku,
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour du statut");
	}
}
