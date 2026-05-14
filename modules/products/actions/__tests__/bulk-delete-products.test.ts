import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockParseFormIds,
	mockGetProductInvalidationTags,
	mockGetCollectionInvalidationTags,
	mockGetCartInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findMany: vi.fn(), updateMany: vi.fn() },
		productSku: { updateMany: vi.fn() },
		orderItem: { groupBy: vi.fn() },
		cartItem: { findMany: vi.fn(), deleteMany: vi.fn() },
		wishlistItem: { deleteMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn((e: unknown, fallback: string) => ({
		status: "ERROR",
		message: fallback,
	})),
	mockSuccess: vi.fn((message: string, data?: unknown) => ({
		status: "SUCCESS",
		message,
		data,
	})),
	mockError: vi.fn((message: string) => ({ status: "ERROR", message })),
	mockParseFormIds: vi.fn(),
	mockGetProductInvalidationTags: vi.fn(() => ["products-list"]),
	mockGetCollectionInvalidationTags: vi.fn(() => ["collections-list"]),
	mockGetCartInvalidationTags: vi.fn(() => ["cart-user"]),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_BULK_DELETE_LIMIT: "admin-product-bulk-delete",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	parseFormIds: mockParseFormIds,
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../schemas/product.schemas", () => ({ bulkDeleteProductsSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}));
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));
vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
}));

import { bulkDeleteProducts } from "../bulk-delete-products";

const PID_A = "pid_a1";
const PID_B = "pid_b2";
const PRODUCT_IDS = [PID_A, PID_B];

function makeFd(ids: string[] = PRODUCT_IDS) {
	const fd = new FormData();
	fd.set("productIds", JSON.stringify(ids));
	return fd;
}

describe("bulkDeleteProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockParseFormIds.mockReturnValue({ ids: PRODUCT_IDS });
		mockValidateInput.mockReturnValue({ data: { productIds: PRODUCT_IDS } });
		mockHandleActionError.mockImplementation((_, fb: string) => ({
			status: "ERROR",
			message: fb,
		}));
		mockPrisma.orderItem.groupBy.mockResolvedValue([]);
		mockPrisma.cartItem.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) => {
			if (typeof cb === "function") await cb(mockPrisma);
		});
	});

	it("rejects when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: "UNAUTHORIZED", message: "Forbidden" } });
		const r = await bulkDeleteProducts(undefined, makeFd());
		expect(r).toEqual({ status: "UNAUTHORIZED", message: "Forbidden" });
	});

	it("rejects when rate-limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: "RATE_LIMITED", message: "Too many" },
		});
		const r = await bulkDeleteProducts(undefined, makeFd());
		expect(r.status).toBe("RATE_LIMITED");
	});

	it("returns error when no product matches", async () => {
		mockPrisma.product.findMany.mockResolvedValue([]);
		const r = await bulkDeleteProducts(undefined, makeFd());
		expect(r.status).toBe("ERROR");
		expect(r.message).toMatch(/aucun produit/i);
	});

	it("refuses to delete PUBLIC products", async () => {
		mockPrisma.product.findMany.mockResolvedValue([
			{ id: PID_A, slug: "a", status: "PUBLIC", title: "A", collections: [] },
			{ id: PID_B, slug: "b", status: "PUBLIC", title: "B", collections: [] },
		]);
		const r = await bulkDeleteProducts(undefined, makeFd());
		expect(r.status).toBe("ERROR");
		expect(r.message).toMatch(/archivé/i);
	});

	it("skips products with OrderItems and deletes the rest", async () => {
		mockPrisma.product.findMany.mockResolvedValue([
			{ id: PID_A, slug: "a", status: "DRAFT", title: "A", collections: [] },
			{ id: PID_B, slug: "b", status: "ARCHIVED", title: "B", collections: [] },
		]);
		mockPrisma.orderItem.groupBy.mockResolvedValue([{ productId: PID_A, _count: { _all: 3 } }]);

		const r = await bulkDeleteProducts(undefined, makeFd());

		expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith({
			where: { productId: { in: [PID_B] } },
			data: { deletedAt: expect.any(Date) },
		});
		expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
			where: { id: { in: [PID_B] } },
			data: { deletedAt: expect.any(Date), status: "ARCHIVED" },
		});
		expect(r.status).toBe("SUCCESS");
		expect(r.message).toMatch(/1 bijou retiré/);
		expect(r.message).toMatch(/1 produit avec commande conservé/);
	});

	it("returns error when all eligible products are blocked by OrderItems", async () => {
		mockPrisma.product.findMany.mockResolvedValue([
			{ id: PID_A, slug: "a", status: "DRAFT", title: "A", collections: [] },
		]);
		mockPrisma.orderItem.groupBy.mockResolvedValue([{ productId: PID_A, _count: { _all: 2 } }]);

		const r = await bulkDeleteProducts(undefined, makeFd());
		expect(r.status).toBe("ERROR");
		expect(r.message).toMatch(/commandes/i);
	});

	it("invalidates product + collection caches on success", async () => {
		mockPrisma.product.findMany.mockResolvedValue([
			{
				id: PID_A,
				slug: "a",
				status: "DRAFT",
				title: "A",
				collections: [{ collection: { slug: "winter" } }],
			},
		]);
		mockValidateInput.mockReturnValue({ data: { productIds: [PID_A] } });
		mockParseFormIds.mockReturnValue({ ids: [PID_A] });

		await bulkDeleteProducts(undefined, makeFd([PID_A]));

		expect(mockGetProductInvalidationTags).toHaveBeenCalledWith("a", PID_A);
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("winter");
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("invalidates cart caches for affected users", async () => {
		mockPrisma.product.findMany.mockResolvedValue([
			{ id: PID_A, slug: "a", status: "DRAFT", title: "A", collections: [] },
		]);
		mockValidateInput.mockReturnValue({ data: { productIds: [PID_A] } });
		mockParseFormIds.mockReturnValue({ ids: [PID_A] });
		mockPrisma.cartItem.findMany.mockResolvedValue([
			{ cart: { userId: "user-1", sessionId: null } },
		]);

		await bulkDeleteProducts(undefined, makeFd([PID_A]));

		expect(mockGetCartInvalidationTags).toHaveBeenCalledWith("user-1", undefined);
	});
});
