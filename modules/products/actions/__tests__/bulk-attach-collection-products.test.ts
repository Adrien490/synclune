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
	mockNotFound,
	mockParseFormIds,
	mockGetProductInvalidationTags,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		collection: { findUnique: vi.fn() },
		product: { findMany: vi.fn() },
		productCollection: { findMany: vi.fn(), createMany: vi.fn() },
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
	mockNotFound: vi.fn((entity: string) => ({
		status: "NOT_FOUND",
		message: `${entity} introuvable`,
	})),
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
	ADMIN_PRODUCT_BULK_ATTACH_COLLECTION_LIMIT: "admin-product-bulk-attach-collection",
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
	notFound: mockNotFound,
}));
vi.mock("../../schemas/product.schemas", () => ({ bulkAttachCollectionProductsSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}));
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));

import { bulkAttachCollectionProducts } from "../bulk-attach-collection-products";

const PID_A = "pid_a1";
const PID_B = "pid_b2";
const PRODUCT_IDS = [PID_A, PID_B];
const COLLECTION_ID = "cid_x9";

function makeFd(ids: string[] = PRODUCT_IDS, collectionId = COLLECTION_ID) {
	const fd = new FormData();
	fd.set("productIds", JSON.stringify(ids));
	fd.set("collectionId", collectionId);
	return fd;
}

describe("bulkAttachCollectionProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockParseFormIds.mockReturnValue({ ids: PRODUCT_IDS });
		mockValidateInput.mockReturnValue({
			data: { productIds: PRODUCT_IDS, collectionId: COLLECTION_ID },
		});
		mockHandleActionError.mockImplementation((_, fb: string) => ({
			status: "ERROR",
			message: fb,
		}));
		mockPrisma.collection.findUnique.mockResolvedValue({
			id: COLLECTION_ID,
			name: "Hiver",
			slug: "hiver",
		});
		mockPrisma.productCollection.findMany.mockResolvedValue([]);
	});

	it("rejects when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: "UNAUTHORIZED", message: "Forbidden" } });
		const r = await bulkAttachCollectionProducts(undefined, makeFd());
		expect(r).toEqual({ status: "UNAUTHORIZED", message: "Forbidden" });
	});

	it("rejects when rate-limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: "RATE_LIMITED", message: "Too many" },
		});
		const r = await bulkAttachCollectionProducts(undefined, makeFd());
		expect(r.status).toBe("RATE_LIMITED");
	});

	it("returns notFound when collection doesn't exist", async () => {
		mockPrisma.collection.findUnique.mockResolvedValue(null);
		const r = await bulkAttachCollectionProducts(undefined, makeFd());
		expect(r.status).toBe("NOT_FOUND");
	});

	it("returns error when no product matches", async () => {
		mockPrisma.product.findMany.mockResolvedValue([]);
		const r = await bulkAttachCollectionProducts(undefined, makeFd());
		expect(r.status).toBe("ERROR");
		expect(r.message).toMatch(/aucun produit/i);
	});

	it("returns error when all products already linked", async () => {
		mockPrisma.product.findMany.mockResolvedValue([
			{ id: PID_A, slug: "a", title: "A" },
			{ id: PID_B, slug: "b", title: "B" },
		]);
		mockPrisma.productCollection.findMany.mockResolvedValue([
			{ productId: PID_A },
			{ productId: PID_B },
		]);
		const r = await bulkAttachCollectionProducts(undefined, makeFd());
		expect(r.status).toBe("ERROR");
		expect(r.message).toMatch(/déjà dans/i);
	});

	it("creates links for products not yet linked, skips existing", async () => {
		mockPrisma.product.findMany.mockResolvedValue([
			{ id: PID_A, slug: "a", title: "A" },
			{ id: PID_B, slug: "b", title: "B" },
		]);
		mockPrisma.productCollection.findMany.mockResolvedValue([
			{ productId: PID_A }, // a déjà lié
		]);

		const r = await bulkAttachCollectionProducts(undefined, makeFd());

		expect(mockPrisma.productCollection.createMany).toHaveBeenCalledWith({
			data: [{ productId: PID_B, collectionId: COLLECTION_ID, isFeatured: false }],
			skipDuplicates: true,
		});
		expect(r.status).toBe("SUCCESS");
		expect(r.message).toMatch(/1 bijou ajouté/);
		expect(r.message).toMatch(/Hiver/);
		expect(r.message).toMatch(/1 déjà présent/);
	});

	it("invalidates product + collection caches", async () => {
		mockPrisma.product.findMany.mockResolvedValue([{ id: PID_A, slug: "a", title: "A" }]);
		mockValidateInput.mockReturnValue({
			data: { productIds: [PID_A], collectionId: COLLECTION_ID },
		});
		mockParseFormIds.mockReturnValue({ ids: [PID_A] });

		await bulkAttachCollectionProducts(undefined, makeFd([PID_A]));

		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("hiver");
		expect(mockGetProductInvalidationTags).toHaveBeenCalledWith("a", PID_A);
		expect(mockUpdateTag).toHaveBeenCalled();
	});
});
