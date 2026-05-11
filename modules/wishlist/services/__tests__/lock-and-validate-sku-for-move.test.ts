import { describe, it, expect, vi, beforeEach } from "vitest";
import { BusinessError } from "@/shared/lib/actions";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";
import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages";

import { lockAndValidateSkuForMove } from "../lock-and-validate-sku-for-move";

const VALID_PRODUCT_ID = "cm1234567890abcdefghijk12";
const OTHER_PRODUCT_ID = "cm0000000000000000000xxxx";
const VALID_SKU_ID = "cm9876543210zyxwvutsrqp34";

function makeTx(skuRow: unknown) {
	return {
		$queryRaw: vi.fn().mockResolvedValue(skuRow === null ? [] : [skuRow]),
	} as unknown as Parameters<typeof lockAndValidateSkuForMove>[0];
}

function makeValidSku(overrides: Record<string, unknown> = {}) {
	return {
		inventory: 10,
		isActive: true,
		priceInclTax: 4999,
		deletedAt: null,
		productId: VALID_PRODUCT_ID,
		productStatus: "PUBLIC",
		productDeletedAt: null,
		...overrides,
	};
}

describe("lockAndValidateSkuForMove", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns the SKU row when valid", async () => {
		const tx = makeTx(makeValidSku());

		const sku = await lockAndValidateSkuForMove(tx, VALID_SKU_ID, VALID_PRODUCT_ID);

		expect(sku.productId).toBe(VALID_PRODUCT_ID);
		expect(sku.isActive).toBe(true);
		expect(tx.$queryRaw).toHaveBeenCalled();
	});

	it("throws SKU_NOT_FOUND when raw query returns no rows", async () => {
		const tx = makeTx(null);

		await expect(
			lockAndValidateSkuForMove(tx, VALID_SKU_ID, VALID_PRODUCT_ID),
		).rejects.toThrowError(WISHLIST_ERROR_MESSAGES.SKU_NOT_FOUND);
	});

	it("throws PRODUCT_DELETED when SKU is soft-deleted", async () => {
		const tx = makeTx(makeValidSku({ deletedAt: new Date() }));

		await expect(
			lockAndValidateSkuForMove(tx, VALID_SKU_ID, VALID_PRODUCT_ID),
		).rejects.toThrowError(CART_ERROR_MESSAGES.PRODUCT_DELETED);
	});

	it("throws PRODUCT_DELETED when parent product is soft-deleted", async () => {
		const tx = makeTx(makeValidSku({ productDeletedAt: new Date() }));

		await expect(
			lockAndValidateSkuForMove(tx, VALID_SKU_ID, VALID_PRODUCT_ID),
		).rejects.toThrowError(CART_ERROR_MESSAGES.PRODUCT_DELETED);
	});

	it("throws SKU_INACTIVE when SKU is inactive", async () => {
		const tx = makeTx(makeValidSku({ isActive: false }));

		await expect(
			lockAndValidateSkuForMove(tx, VALID_SKU_ID, VALID_PRODUCT_ID),
		).rejects.toThrowError(WISHLIST_ERROR_MESSAGES.SKU_INACTIVE);
	});

	it("throws PRODUCT_NOT_PUBLIC when product is DRAFT", async () => {
		const tx = makeTx(makeValidSku({ productStatus: "DRAFT" }));

		await expect(
			lockAndValidateSkuForMove(tx, VALID_SKU_ID, VALID_PRODUCT_ID),
		).rejects.toThrowError(WISHLIST_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
	});

	it("throws SKU_NOT_FOUND (anti-tampering) when declared productId mismatches", async () => {
		const tx = makeTx(makeValidSku({ productId: OTHER_PRODUCT_ID }));

		await expect(
			lockAndValidateSkuForMove(tx, VALID_SKU_ID, VALID_PRODUCT_ID),
		).rejects.toThrowError(WISHLIST_ERROR_MESSAGES.SKU_NOT_FOUND);
	});

	it("throws BusinessError instances (not plain Error) for caller pattern matching", async () => {
		const tx = makeTx(null);

		await expect(
			lockAndValidateSkuForMove(tx, VALID_SKU_ID, VALID_PRODUCT_ID),
		).rejects.toBeInstanceOf(BusinessError);
	});
});
