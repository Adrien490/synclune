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
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findMany: vi.fn(), updateMany: vi.fn() },
		productSku: { updateMany: vi.fn() },
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
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_BULK_ARCHIVE_LIMIT: "admin-product-bulk-archive",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	parseFormIds: mockParseFormIds,
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../schemas/product.schemas", () => ({ bulkArchiveProductsSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}));
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));

import { bulkArchiveProducts } from "../bulk-archive-products";

const PRODUCT_IDS = ["pid_a1", "pid_b2"];

function makeFd(targetStatus = "ARCHIVED") {
	const fd = new FormData();
	fd.set("productIds", JSON.stringify(PRODUCT_IDS));
	fd.set("targetStatus", targetStatus);
	return fd;
}

describe("bulkArchiveProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockParseFormIds.mockReturnValue({ ids: PRODUCT_IDS });
		mockValidateInput.mockReturnValue({
			data: { productIds: PRODUCT_IDS, targetStatus: "ARCHIVED" },
		});
		mockHandleActionError.mockImplementation((_, fb: string) => ({
			status: "ERROR",
			message: fb,
		}));
	});

	it("rejects when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: "UNAUTHORIZED", message: "Forbidden" } });
		const r = await bulkArchiveProducts(undefined, makeFd());
		expect(r).toEqual({ status: "UNAUTHORIZED", message: "Forbidden" });
	});

	it("rejects when rate-limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: "RATE_LIMITED", message: "Too many" },
		});
		const r = await bulkArchiveProducts(undefined, makeFd());
		expect(r.status).toBe("RATE_LIMITED");
	});

	it("returns error when no product matches", async () => {
		mockPrisma.product.findMany.mockResolvedValue([]);
		const r = await bulkArchiveProducts(undefined, makeFd());
		expect(r.status).toBe("ERROR");
		expect(r.message).toMatch(/aucun produit/i);
	});

	it("returns error when all already archived", async () => {
		mockPrisma.product.findMany.mockResolvedValue([
			{ id: PRODUCT_IDS[0], slug: "a", status: "ARCHIVED", title: "A", collections: [] },
			{ id: PRODUCT_IDS[1], slug: "b", status: "ARCHIVED", title: "B", collections: [] },
		]);
		const r = await bulkArchiveProducts(undefined, makeFd("ARCHIVED"));
		expect(r.status).toBe("ERROR");
		expect(r.message).toMatch(/déjà archivés/i);
	});

	it("archives eligible products and invalidates cache", async () => {
		mockPrisma.product.findMany.mockResolvedValue([
			{
				id: PRODUCT_IDS[0],
				slug: "a",
				status: "PUBLIC",
				title: "A",
				collections: [{ collection: { slug: "bijoux" } }],
			},
			{
				id: PRODUCT_IDS[1],
				slug: "b",
				status: "ARCHIVED",
				title: "B",
				collections: [],
			},
		]);
		mockPrisma.$transaction.mockImplementation(
			async (cb: (tx: typeof mockPrisma) => Promise<void>) => cb(mockPrisma),
		);

		const r = await bulkArchiveProducts(undefined, makeFd("ARCHIVED"));

		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		expect(mockUpdateTag).toHaveBeenCalled();
		expect(r.status).toBe("SUCCESS");
		expect(r.data).toEqual({ count: 1, targetStatus: "ARCHIVED" });
	});

	it("restores products to PUBLIC when targetStatus is PUBLIC", async () => {
		mockValidateInput.mockReturnValue({
			data: { productIds: PRODUCT_IDS, targetStatus: "PUBLIC" },
		});
		mockPrisma.product.findMany.mockResolvedValue([
			{
				id: PRODUCT_IDS[0],
				slug: "a",
				status: "ARCHIVED",
				title: "A",
				collections: [],
			},
		]);
		mockPrisma.$transaction.mockImplementation(
			async (cb: (tx: typeof mockPrisma) => Promise<void>) => cb(mockPrisma),
		);

		const r = await bulkArchiveProducts(undefined, makeFd("PUBLIC"));

		expect(mockPrisma.productSku.updateMany).not.toHaveBeenCalled();
		expect(r.status).toBe("SUCCESS");
		expect(r.message).toMatch(/restauré/i);
	});
});
