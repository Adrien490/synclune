"use server";

import { prisma } from "@/shared/lib/prisma";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import type { ActionState } from "@/shared/types/server-action";
import {
	success,
	notFound,
	handleActionError,
	isUniqueConstraintError,
	safeFormGet,
	error,
} from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { updateProductVariantSchema } from "../schemas/variant.schemas";
import { getVariantInvalidationTags } from "../utils/cache.utils";
import { applyStockDeltaTx } from "../services/apply-stock-delta.service";

/**
 * Server Action ADMIN pour modifier une variante — schéma lean (lot 2).
 * Stock en DELTA relatif sous verrou (SSOT applyStockDeltaTx, anti stock
 * fantôme). `path` Zod requis → safeParse direct (convention documentée).
 */
export async function updateVariant(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extraction + validation
		const parsed = updateProductVariantSchema.safeParse({
			variantId: safeFormGet(formData, "variantId"),
			priceEuros: safeFormGet(formData, "priceEuros") ?? "",
			stock: safeFormGet(formData, "stock"),
			originalStock: safeFormGet(formData, "originalStock") ?? undefined,
			active: safeFormGet(formData, "active"),
			colorId: safeFormGet(formData, "colorId") ?? "",
			materialId: safeFormGet(formData, "materialId") ?? "",
			size: safeFormGet(formData, "size") ?? "",
		});
		if (!parsed.success) {
			return error(parsed.error.issues[0]?.message ?? "Données invalides");
		}
		const data = parsed.data;

		// 3. Variante + contexte
		const existing = await prisma.productVariant.findUnique({
			where: { id: data.variantId },
			select: {
				id: true,
				stock: true,
				active: true,
				colorId: true,
				materialId: true,
				product: {
					select: {
						id: true,
						slug: true,
						active: true,
						variants: { select: { id: true, active: true } },
					},
				},
			},
		});
		if (!existing) return notFound("Variante", "f");

		// 4. Garde : ne pas désactiver la DERNIÈRE variante active d'un produit
		// actif (règle « chaque produit a au moins une variante » côté vitrine).
		if (existing.active && !data.active && existing.product.active) {
			const otherActive = existing.product.variants.some((v) => v.id !== existing.id && v.active);
			if (!otherActive) {
				return error(
					"Impossible de désactiver la dernière variante active d'un produit en vente. Masque d'abord le produit.",
				);
			}
		}

		// 5. Écriture en transaction (verrou + delta stock)
		await prisma.$transaction(
			async (tx) => {
				const stockDelta = await applyStockDeltaTx(tx, {
					variantId: data.variantId,
					targetStock: data.stock,
					originalStock: data.originalStock,
					fallbackStock: existing.stock,
				});

				await tx.productVariant.update({
					where: { id: data.variantId },
					data: {
						priceCents: data.priceEuros ? Math.round(data.priceEuros * 100) : null,
						stock: { increment: stockDelta },
						active: data.active,
						colorId: data.colorId ?? null,
						materialId: data.materialId ?? null,
						size: data.size?.trim() ?? null,
					},
				});
			},
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		// 6. Invalidation (anciens + nouveaux ids couleur/matériau)
		getVariantInvalidationTags({
			variantId: data.variantId,
			productId: existing.product.id,
			productSlug: existing.product.slug,
			colorIds: [existing.colorId, data.colorId],
			materialIds: [existing.materialId, data.materialId],
		}).forEach((tag) => updateTag(tag));

		// 7. Succès
		return success("Variante mise à jour");
	} catch (e) {
		if (isUniqueConstraintError(e)) {
			return error(
				"Une variante identique (même taille, couleur et matériau) existe déjà pour ce produit.",
			);
		}
		return handleActionError(e, "Impossible de modifier la variante");
	}
}
