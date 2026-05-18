import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";
import { BusinessError } from "@/shared/lib/actions";

vi.mock("@/modules/wishlist/lib/wishlist-session", () => ({
	getWishlistExpirationDate: () => new Date("2026-06-16T00:00:00Z"),
}));

import { addProductToWishlist } from "../upsert-wishlist-item.service";

const VALID_USER_ID = "cm_user_00000000000000001";
const VALID_SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_PRODUCT_ID = "cm1234567890abcdefghijk12";

function makeTx(overrides: Record<string, unknown> = {}) {
	const tx = {
		product: { findUnique: vi.fn() },
		wishlist: { upsert: vi.fn() },
		wishlistItem: { count: vi.fn(), create: vi.fn() },
		...overrides,
	};
	return tx as unknown as Parameters<typeof addProductToWishlist>[0] & typeof tx;
}

describe("addProductToWishlist", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ----------------------------------------------------------------------
	// Product validation (TOCTOU-safe : inside transaction)
	// ----------------------------------------------------------------------

	it("throws BusinessError PRODUCT_NOT_PUBLIC when product does not exist", async () => {
		const tx = makeTx();
		tx.product.findUnique.mockResolvedValue(null);

		await expect(
			addProductToWishlist(tx, {
				userId: VALID_USER_ID,
				sessionId: null,
				productId: VALID_PRODUCT_ID,
			}),
		).rejects.toBeInstanceOf(BusinessError);

		// Wishlist upsert ne doit PAS être tenté si validation produit échoue
		expect(tx.wishlist.upsert).not.toHaveBeenCalled();
	});

	it("throws BusinessError PRODUCT_NOT_PUBLIC when product is DRAFT", async () => {
		const tx = makeTx();
		tx.product.findUnique.mockResolvedValue({ id: VALID_PRODUCT_ID, status: "DRAFT" });

		await expect(
			addProductToWishlist(tx, {
				userId: VALID_USER_ID,
				sessionId: null,
				productId: VALID_PRODUCT_ID,
			}),
		).rejects.toMatchObject({
			name: "BusinessError",
			code: "PRODUCT_NOT_PUBLIC",
		});
	});

	it("throws BusinessError PRODUCT_NOT_PUBLIC when product is ARCHIVED", async () => {
		const tx = makeTx();
		tx.product.findUnique.mockResolvedValue({ id: VALID_PRODUCT_ID, status: "ARCHIVED" });

		await expect(
			addProductToWishlist(tx, {
				userId: VALID_USER_ID,
				sessionId: null,
				productId: VALID_PRODUCT_ID,
			}),
		).rejects.toBeInstanceOf(BusinessError);
	});

	// ----------------------------------------------------------------------
	// WISHLIST_MAX_ITEMS cap
	// ----------------------------------------------------------------------

	it("throws BusinessError WISHLIST_FULL when wishlist reached 500 items", async () => {
		const tx = makeTx();
		tx.product.findUnique.mockResolvedValue({ id: VALID_PRODUCT_ID, status: "PUBLIC" });
		tx.wishlist.upsert.mockResolvedValue({ id: "wl-1" });
		tx.wishlistItem.count.mockResolvedValue(500);

		await expect(
			addProductToWishlist(tx, {
				userId: VALID_USER_ID,
				sessionId: null,
				productId: VALID_PRODUCT_ID,
			}),
		).rejects.toMatchObject({
			name: "BusinessError",
			code: "WISHLIST_FULL",
		});

		// Create ne doit PAS être tenté si cap atteinte
		expect(tx.wishlistItem.create).not.toHaveBeenCalled();
	});

	it("allows adding when wishlist has exactly 499 items (boundary)", async () => {
		const tx = makeTx();
		tx.product.findUnique.mockResolvedValue({ id: VALID_PRODUCT_ID, status: "PUBLIC" });
		tx.wishlist.upsert.mockResolvedValue({ id: "wl-1" });
		tx.wishlistItem.count.mockResolvedValue(499);
		tx.wishlistItem.create.mockResolvedValue({ id: "wi-new" });

		const result = await addProductToWishlist(tx, {
			userId: VALID_USER_ID,
			sessionId: null,
			productId: VALID_PRODUCT_ID,
		});

		expect(result).toEqual({ wishlistItemId: "wi-new", wishlistId: "wl-1" });
	});

	// ----------------------------------------------------------------------
	// P2002 race condition — laissé remonter au caller
	// ----------------------------------------------------------------------

	it("propagates P2002 unique constraint violation to caller (double-submit race)", async () => {
		const tx = makeTx();
		tx.product.findUnique.mockResolvedValue({ id: VALID_PRODUCT_ID, status: "PUBLIC" });
		tx.wishlist.upsert.mockResolvedValue({ id: "wl-1" });
		tx.wishlistItem.count.mockResolvedValue(10);
		tx.wishlistItem.create.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
				code: "P2002",
				clientVersion: "6.0.0",
			}),
		);

		await expect(
			addProductToWishlist(tx, {
				userId: VALID_USER_ID,
				sessionId: null,
				productId: VALID_PRODUCT_ID,
			}),
		).rejects.toMatchObject({
			code: "P2002",
		});
	});

	// ----------------------------------------------------------------------
	// Happy paths (user + guest)
	// ----------------------------------------------------------------------

	it("creates a wishlist item for an authenticated user (expiresAt=null)", async () => {
		const tx = makeTx();
		tx.product.findUnique.mockResolvedValue({ id: VALID_PRODUCT_ID, status: "PUBLIC" });
		tx.wishlist.upsert.mockResolvedValue({ id: "wl-user-1" });
		tx.wishlistItem.count.mockResolvedValue(5);
		tx.wishlistItem.create.mockResolvedValue({ id: "wi-1" });

		const result = await addProductToWishlist(tx, {
			userId: VALID_USER_ID,
			sessionId: null,
			productId: VALID_PRODUCT_ID,
		});

		expect(tx.wishlist.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId: VALID_USER_ID },
				create: expect.objectContaining({ userId: VALID_USER_ID, expiresAt: null }),
				update: expect.objectContaining({ expiresAt: null }),
			}),
		);
		expect(result).toEqual({ wishlistItemId: "wi-1", wishlistId: "wl-user-1" });
	});

	it("creates a wishlist item for a guest session (expiresAt set to +30d)", async () => {
		const tx = makeTx();
		tx.product.findUnique.mockResolvedValue({ id: VALID_PRODUCT_ID, status: "PUBLIC" });
		tx.wishlist.upsert.mockResolvedValue({ id: "wl-guest-1" });
		tx.wishlistItem.count.mockResolvedValue(0);
		tx.wishlistItem.create.mockResolvedValue({ id: "wi-1" });

		await addProductToWishlist(tx, {
			userId: null,
			sessionId: VALID_SESSION_ID,
			productId: VALID_PRODUCT_ID,
		});

		const upsertCall = tx.wishlist.upsert.mock.calls[0]![0];
		expect(upsertCall.where).toEqual({ sessionId: VALID_SESSION_ID });
		expect(upsertCall.create.expiresAt).toEqual(new Date("2026-06-16T00:00:00Z"));
		expect(upsertCall.update.expiresAt).toEqual(new Date("2026-06-16T00:00:00Z"));
	});
});
