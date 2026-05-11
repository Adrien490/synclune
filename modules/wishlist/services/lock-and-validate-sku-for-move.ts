import type { Prisma } from "@/app/generated/prisma/client";
import { BusinessError } from "@/shared/lib/actions";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";
import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages";

/**
 * Locked SKU snapshot returned by {@link lockAndValidateSkuForMove}.
 * Mirrors the columns selected by the underlying `FOR UPDATE` raw query.
 */
export interface LockedSku {
	inventory: number;
	isActive: boolean;
	priceInclTax: number;
	deletedAt: Date | null;
	productId: string;
	productStatus: string;
	productDeletedAt: Date | null;
}

/**
 * Transactional service shared by `move-to-cart` action: acquires a `FOR UPDATE`
 * lock on the SKU row, then runs the business validation chain
 * (existence / not soft-deleted / active / parent product PUBLIC / SKU↔Product binding).
 *
 * Layering note: contient un read + lock acquisition partagé entre wishlist et
 * potentiellement cart, et la cohérence ne tient que dans le transactional scope
 * (le lock ne survit pas hors `$transaction`) — cf. exception documentée
 * `01-conventions.md § Services transactionnels partagés`.
 *
 * @throws BusinessError when the SKU is missing, deleted, inactive, archived,
 *         or when the declared productId does not match the SKU's productId.
 */
export async function lockAndValidateSkuForMove(
	tx: Prisma.TransactionClient,
	skuId: string,
	productId: string,
): Promise<LockedSku> {
	const skuRows = await tx.$queryRaw<LockedSku[]>`
		SELECT
			s.inventory,
			s."isActive",
			s."priceInclTax",
			s."deletedAt",
			s."productId",
			p.status AS "productStatus",
			p."deletedAt" AS "productDeletedAt"
		FROM "ProductSku" s
		JOIN "Product" p ON s."productId" = p.id
		WHERE s.id = ${skuId}
		FOR UPDATE OF s
	`;

	const sku = skuRows[0];

	if (!sku) {
		throw new BusinessError(WISHLIST_ERROR_MESSAGES.SKU_NOT_FOUND);
	}
	if (sku.deletedAt || sku.productDeletedAt) {
		throw new BusinessError(CART_ERROR_MESSAGES.PRODUCT_DELETED);
	}
	if (!sku.isActive) {
		throw new BusinessError(WISHLIST_ERROR_MESSAGES.SKU_INACTIVE);
	}
	if (sku.productStatus !== "PUBLIC") {
		throw new BusinessError(WISHLIST_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
	}
	// Anti-tampering: skuId must belong to the declared productId
	if (sku.productId !== productId) {
		throw new BusinessError(WISHLIST_ERROR_MESSAGES.SKU_NOT_FOUND);
	}

	return sku;
}
