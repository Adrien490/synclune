"use server";

import { updateTag } from "next/cache";

import { ProductStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { logAudit } from "@/shared/lib/audit-log";
import {
	error,
	handleActionError,
	parseFormIds,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_PRODUCT_BULK_DELETE_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { bulkDeleteProductsSchema } from "../schemas/product.schemas";
import { getProductInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action — suppression en lot (soft-delete).
 *
 * Refuse PUBLIC pour safety : seuls les DRAFT et ARCHIVED sont supprimables
 * en bulk. Les SKUs sont soft-deleted en cascade, les CartItems et
 * WishlistItems referencant les SKUs sont purges (parite avec `deleteProduct`).
 * Les fichiers UploadThing sont preserves jusqu'au hard delete (retention 10 ans).
 *
 * Refuse aussi les produits avec OrderItems associes (conservation historique).
 *
 * formData :
 * - `productIds` : JSON array de cuid2 (1..100)
 */
export async function bulkDeleteProducts(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_PRODUCT_BULK_DELETE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "productIds");
		if ("error" in idsResult) return idsResult.error;

		const validation = validateInput(bulkDeleteProductsSchema, { productIds: idsResult.ids });
		if ("error" in validation) return validation.error;

		const { productIds } = validation.data;

		const products = await prisma.product.findMany({
			where: { id: { in: productIds }, deletedAt: null },
			select: {
				id: true,
				title: true,
				slug: true,
				status: true,
				collections: { select: { collection: { select: { slug: true } } } },
			},
		});

		if (products.length === 0) {
			return error("Aucun produit valide trouvé");
		}

		const eligible = products.filter((p) => p.status !== ProductStatus.PUBLIC);

		if (eligible.length === 0) {
			return error(
				"Suppression refusée : un produit publié doit être archivé avant suppression définitive.",
			);
		}

		const eligibleIds = eligible.map((p) => p.id);

		const orderItemsCounts = await prisma.orderItem.groupBy({
			by: ["productId"],
			where: { productId: { in: eligibleIds } },
			_count: { _all: true },
		});

		const blockedIds = new Set(orderItemsCounts.map((row) => row.productId).filter(Boolean));
		const deletableIds = eligibleIds.filter((id) => !blockedIds.has(id));

		if (deletableIds.length === 0) {
			return error(
				"Aucun produit supprimable : tous sont associés à des commandes. Archivez-les pour conserver l'historique.",
			);
		}

		const affectedCarts = await prisma.cartItem.findMany({
			where: { sku: { productId: { in: deletableIds } } },
			select: { cart: { select: { userId: true, sessionId: true } } },
			distinct: ["cartId"],
		});

		const now = new Date();
		await prisma.$transaction(async (tx) => {
			await tx.cartItem.deleteMany({
				where: { sku: { productId: { in: deletableIds } } },
			});
			await tx.wishlistItem.deleteMany({
				where: { productId: { in: deletableIds } },
			});
			await tx.productSku.updateMany({
				where: { productId: { in: deletableIds } },
				data: { deletedAt: now },
			});
			await tx.product.updateMany({
				where: { id: { in: deletableIds } },
				data: { deletedAt: now, status: ProductStatus.ARCHIVED },
			});
		});

		for (const { cart } of affectedCarts) {
			const cartTags = getCartInvalidationTags(
				cart.userId ?? undefined,
				cart.sessionId ?? undefined,
			);
			cartTags.forEach((tag) => updateTag(tag));
		}

		const deletableSet = new Set(deletableIds);
		const tags = new Set<string>();
		for (const p of eligible) {
			if (!deletableSet.has(p.id)) continue;
			getProductInvalidationTags(p.slug, p.id).forEach((tag) => tags.add(tag));
			for (const link of p.collections) {
				getCollectionInvalidationTags(link.collection.slug).forEach((tag) => tags.add(tag));
			}
		}
		tags.forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "product.bulkDelete",
			targetType: "product",
			targetId: deletableIds.join(","),
			metadata: { count: deletableIds.length, productIds: deletableIds },
		});

		const blockedCount = blockedIds.size;
		const plural = deletableIds.length > 1 ? "s" : "";
		const baseMessage = `${deletableIds.length} bijou${plural} retiré${plural} de l'atelier`;
		const suffix =
			blockedCount > 0
				? `. ${blockedCount} produit${blockedCount > 1 ? "s" : ""} avec commande${blockedCount > 1 ? "s" : ""} conservé${blockedCount > 1 ? "s" : ""}.`
				: ".";

		return success(`${baseMessage}${suffix}`, {
			count: deletableIds.length,
			blockedCount,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la suppression groupée");
	}
}
