import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { WISHLIST_MAX_ITEMS } from "@/modules/wishlist/constants/wishlist.constants";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";

// Valid cuid2 for tests
const VALID_PRODUCT_ID = "cm1234567890abcdefghijk12";
const OTHER_PRODUCT_ID = "cm1234567890abcdefghijk34";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockReadWishlistCookie, mockWriteWishlistCookie, mockEnforceRateLimit } =
	vi.hoisted(() => ({
		mockPrisma: {
			product: { findUnique: vi.fn() },
		},
		mockReadWishlistCookie: vi.fn(),
		mockWriteWishlistCookie: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/wishlist/lib/wishlist-cookie", () => ({
	readWishlistCookie: mockReadWishlistCookie,
	writeWishlistCookie: mockWriteWishlistCookie,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

import { toggleWishlistItem } from "../toggle-wishlist-item";
import { addToWishlist } from "../add-to-wishlist";
import { removeFromWishlist } from "../remove-from-wishlist";

function formDataWith(productId: string | undefined) {
	const fd = new FormData();
	if (productId !== undefined) fd.set("productId", productId);
	return fd;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockEnforceRateLimit.mockResolvedValue({ success: true });
	mockReadWishlistCookie.mockResolvedValue([]);
	mockWriteWishlistCookie.mockResolvedValue(undefined);
	mockPrisma.product.findUnique.mockResolvedValue({ id: VALID_PRODUCT_ID });
});

// ============================================================================
// toggleWishlistItem
// ============================================================================

describe("toggleWishlistItem", () => {
	it("ajoute (en tête de liste) quand le produit est absent du cookie", async () => {
		mockReadWishlistCookie.mockResolvedValue([OTHER_PRODUCT_ID]);

		const result = await toggleWishlistItem(undefined, formDataWith(VALID_PRODUCT_ID));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toMatchObject({ action: "added" });
		expect(mockWriteWishlistCookie).toHaveBeenCalledWith([VALID_PRODUCT_ID, OTHER_PRODUCT_ID]);
	});

	it("retire quand le produit est présent dans le cookie", async () => {
		mockReadWishlistCookie.mockResolvedValue([VALID_PRODUCT_ID, OTHER_PRODUCT_ID]);

		const result = await toggleWishlistItem(undefined, formDataWith(VALID_PRODUCT_ID));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toMatchObject({ action: "removed" });
		expect(mockWriteWishlistCookie).toHaveBeenCalledWith([OTHER_PRODUCT_ID]);
		// Le retrait ne valide pas le produit (on doit pouvoir retirer un archivé)
		expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
	});

	it("refuse l'ajout quand le cap est atteint, sans écrire", async () => {
		mockReadWishlistCookie.mockResolvedValue(
			Array.from({ length: WISHLIST_MAX_ITEMS }, (_, i) => `id${i}`),
		);

		const result = await toggleWishlistItem(undefined, formDataWith(VALID_PRODUCT_ID));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(WISHLIST_ERROR_MESSAGES.WISHLIST_FULL);
		expect(mockWriteWishlistCookie).not.toHaveBeenCalled();
	});

	it("refuse l'ajout d'un produit non PUBLIC (id forgé ou produit archivé), sans écrire", async () => {
		mockPrisma.product.findUnique.mockResolvedValue(null);

		const result = await toggleWishlistItem(undefined, formDataWith(VALID_PRODUCT_ID));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(WISHLIST_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
		expect(mockWriteWishlistCookie).not.toHaveBeenCalled();
	});

	it("valide le produit avec le filtre PUBLIC + deletedAt null", async () => {
		await toggleWishlistItem(undefined, formDataWith(VALID_PRODUCT_ID));

		expect(mockPrisma.product.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_PRODUCT_ID, status: "PUBLIC", deletedAt: null },
			}),
		);
	});

	it("rejette un productId invalide sans lire ni écrire le cookie produit", async () => {
		const result = await toggleWishlistItem(undefined, formDataWith("NOT-A-CUID2"));

		expect(result.status).not.toBe(ActionStatus.SUCCESS);
		expect(mockWriteWishlistCookie).not.toHaveBeenCalled();
	});

	it("s'arrête sur le rate limit AVANT toute lecture", async () => {
		const rateLimitError = {
			status: ActionStatus.ERROR,
			message: "Trop de tentatives",
		};
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await toggleWishlistItem(undefined, formDataWith(VALID_PRODUCT_ID));

		expect(result).toBe(rateLimitError);
		expect(mockReadWishlistCookie).not.toHaveBeenCalled();
		expect(mockWriteWishlistCookie).not.toHaveBeenCalled();
	});
});

// ============================================================================
// addToWishlist
// ============================================================================

describe("addToWishlist", () => {
	it("ajoute en tête de liste", async () => {
		mockReadWishlistCookie.mockResolvedValue([OTHER_PRODUCT_ID]);

		const result = await addToWishlist(undefined, formDataWith(VALID_PRODUCT_ID));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockWriteWishlistCookie).toHaveBeenCalledWith([VALID_PRODUCT_ID, OTHER_PRODUCT_ID]);
	});

	it("est idempotente : produit déjà présent = succès sans écriture (chemin de l'undo)", async () => {
		mockReadWishlistCookie.mockResolvedValue([VALID_PRODUCT_ID]);

		const result = await addToWishlist(undefined, formDataWith(VALID_PRODUCT_ID));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockWriteWishlistCookie).not.toHaveBeenCalled();
	});

	it("refuse un produit non PUBLIC", async () => {
		mockPrisma.product.findUnique.mockResolvedValue(null);

		const result = await addToWishlist(undefined, formDataWith(VALID_PRODUCT_ID));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockWriteWishlistCookie).not.toHaveBeenCalled();
	});

	it("refuse quand le cap est atteint", async () => {
		mockReadWishlistCookie.mockResolvedValue(
			Array.from({ length: WISHLIST_MAX_ITEMS }, (_, i) => `id${i}`),
		);

		const result = await addToWishlist(undefined, formDataWith(VALID_PRODUCT_ID));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(WISHLIST_ERROR_MESSAGES.WISHLIST_FULL);
	});
});

// ============================================================================
// removeFromWishlist
// ============================================================================

describe("removeFromWishlist", () => {
	it("retire le produit et réécrit le cookie", async () => {
		mockReadWishlistCookie.mockResolvedValue([VALID_PRODUCT_ID, OTHER_PRODUCT_ID]);

		const result = await removeFromWishlist(undefined, formDataWith(VALID_PRODUCT_ID));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toMatchObject({ removed: true });
		expect(mockWriteWishlistCookie).toHaveBeenCalledWith([OTHER_PRODUCT_ID]);
	});

	it("signale un produit absent des favoris sans écrire", async () => {
		mockReadWishlistCookie.mockResolvedValue([OTHER_PRODUCT_ID]);

		const result = await removeFromWishlist(undefined, formDataWith(VALID_PRODUCT_ID));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(WISHLIST_ERROR_MESSAGES.ITEM_NOT_FOUND);
		expect(mockWriteWishlistCookie).not.toHaveBeenCalled();
	});

	it("ne valide jamais le statut produit (retrait d'un archivé possible)", async () => {
		mockReadWishlistCookie.mockResolvedValue([VALID_PRODUCT_ID]);

		await removeFromWishlist(undefined, formDataWith(VALID_PRODUCT_ID));

		expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
	});
});
