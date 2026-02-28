import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockUpdateTag, mockDeleteUploadThingFilesFromUrls } = vi.hoisted(() => ({
	mockPrisma: {
		productReview: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
		newsletterSubscriber: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
		customizationRequest: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
		product: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
		reviewMedia: {
			findMany: vi.fn(),
		},
		skuMedia: {
			findMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockUpdateTag: vi.fn(),
	mockDeleteUploadThingFilesFromUrls: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: mockDeleteUploadThingFilesFromUrls,
}));

vi.mock("@/modules/cron/constants/limits", () => ({
	BATCH_DEADLINE_MS: 50_000,
	BATCH_SIZE_LARGE: 50,
	RETENTION: { LEGAL_RETENTION_YEARS: 10 },
}));

vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: { LIST: "products-list", COUNTS: "products-counts" },
}));

vi.mock("@/modules/reviews/constants/cache", () => ({
	REVIEWS_CACHE_TAGS: { ADMIN_LIST: "reviews-admin-list", GLOBAL_STATS: "reviews-global-stats" },
}));

vi.mock("@/modules/customizations/constants/cache", () => ({
	CUSTOMIZATION_CACHE_TAGS: { LIST: "customizations-list", STATS: "customizations-stats" },
}));

vi.mock("@/modules/newsletter/constants/cache", () => ({
	NEWSLETTER_CACHE_TAGS: { LIST: "newsletter-list" },
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_INVENTORY_LIST: "admin-inventory-list",
		ADMIN_BADGES: "admin-badges",
		SITEMAP_IMAGES: "sitemap-images",
	},
}));

import { hardDeleteExpiredRecords } from "../hard-delete-retention.service";

// ============================================================================
// Helpers
// ============================================================================

function setupEmptyBatch() {
	mockPrisma.productReview.findMany.mockResolvedValue([]);
	mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
	mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
	mockPrisma.product.findMany.mockResolvedValue([]);
	mockPrisma.$transaction.mockResolvedValue([
		{ count: 0 },
		{ count: 0 },
		{ count: 0 },
		{ count: 0 },
	]);
}

// ============================================================================
// hardDeleteExpiredRecords — RGPD compliance
// ============================================================================

describe("hardDeleteExpiredRecords — RGPD compliance", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2037-03-15T12:00:00Z"));
	});

	it("should hard-delete records soft-deleted more than 10 years ago", async () => {
		// Records from 11 years ago (2026) — should be deleted
		const oldReviews = [{ id: "rev-old-1" }, { id: "rev-old-2" }];
		const oldNewsletter = [{ id: "ns-old-1" }];
		const oldCustomization = [{ id: "cust-old-1" }];
		const oldProducts = [{ id: "prod-old-1" }];

		mockPrisma.productReview.findMany.mockResolvedValue(oldReviews);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue(oldNewsletter);
		mockPrisma.customizationRequest.findMany.mockResolvedValue(oldCustomization);
		mockPrisma.product.findMany.mockResolvedValue(oldProducts);

		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([]);

		mockPrisma.$transaction.mockResolvedValue([
			{ count: 2 },
			{ count: 1 },
			{ count: 1 },
			{ count: 1 },
		]);

		const result = await hardDeleteExpiredRecords();

		expect(result.reviewsDeleted).toBe(2);
		expect(result.newsletterDeleted).toBe(1);
		expect(result.customizationRequestsDeleted).toBe(1);
		expect(result.productsDeleted).toBe(1);
		expect(result.hasMore).toBe(false);
	});

	it("should use correct retention date (current year - 10)", async () => {
		setupEmptyBatch();

		await hardDeleteExpiredRecords();

		// System time is 2037-03-15, so retention date = 2027-03-15
		// FindMany should be called with deletedAt < retentionDate
		expect(mockPrisma.productReview.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { deletedAt: { lt: expect.any(Date) } },
			}),
		);

		const actualDate = mockPrisma.productReview.findMany.mock.calls[0]![0].where.deletedAt.lt;
		expect(actualDate.getFullYear()).toBe(2027);
	});

	it("should only delete ARCHIVED products", async () => {
		setupEmptyBatch();

		await hardDeleteExpiredRecords();

		// Product findMany should include status filter
		expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					status: "ARCHIVED",
				}),
			}),
		);
	});

	it("should NOT hard-delete records soft-deleted less than 10 years ago", async () => {
		// No records should match the retention query
		setupEmptyBatch();

		const result = await hardDeleteExpiredRecords();

		expect(result.productsDeleted).toBe(0);
		expect(result.reviewsDeleted).toBe(0);
		expect(result.newsletterDeleted).toBe(0);
		expect(result.customizationRequestsDeleted).toBe(0);
	});

	it("should report hasMore=true when any query hits the batch limit (50)", async () => {
		const reviews50 = Array.from({ length: 50 }, (_, i) => ({ id: `rev-${i}` }));
		mockPrisma.productReview.findMany.mockResolvedValue(reviews50);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([]);

		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);

		mockPrisma.$transaction.mockResolvedValue([
			{ count: 50 },
			{ count: 0 },
			{ count: 0 },
			{ count: 0 },
		]);

		const result = await hardDeleteExpiredRecords();

		expect(result.hasMore).toBe(true);
	});

	it("should collect and delete UploadThing media for reviews", async () => {
		const oldReviews = [{ id: "rev-1" }];
		mockPrisma.productReview.findMany.mockResolvedValue(oldReviews);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([]);

		mockPrisma.reviewMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/review-img-1.jpg" },
			{ url: "https://utfs.io/f/review-img-2.jpg" },
		]);

		mockPrisma.$transaction.mockResolvedValue([
			{ count: 1 },
			{ count: 0 },
			{ count: 0 },
			{ count: 0 },
		]);

		mockDeleteUploadThingFilesFromUrls.mockResolvedValue({ deleted: 2 });

		await hardDeleteExpiredRecords();

		expect(mockDeleteUploadThingFilesFromUrls).toHaveBeenCalledWith([
			"https://utfs.io/f/review-img-1.jpg",
			"https://utfs.io/f/review-img-2.jpg",
		]);
	});

	it("should collect and delete UploadThing media for product SKUs", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([]);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([{ id: "prod-1" }]);

		mockPrisma.skuMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/sku-img.jpg", thumbnailUrl: "https://utfs.io/f/sku-thumb.jpg" },
			{ url: "https://utfs.io/f/sku-img2.jpg", thumbnailUrl: null },
		]);

		mockPrisma.$transaction.mockResolvedValue([
			{ count: 0 },
			{ count: 0 },
			{ count: 0 },
			{ count: 1 },
		]);

		mockDeleteUploadThingFilesFromUrls.mockResolvedValue({ deleted: 3 });

		await hardDeleteExpiredRecords();

		expect(mockDeleteUploadThingFilesFromUrls).toHaveBeenCalledWith([
			"https://utfs.io/f/sku-img.jpg",
			"https://utfs.io/f/sku-thumb.jpg",
			"https://utfs.io/f/sku-img2.jpg",
		]);
	});

	it("should continue gracefully when UploadThing deletion fails", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([{ id: "rev-1" }]);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([]);

		mockPrisma.reviewMedia.findMany.mockResolvedValue([{ url: "https://utfs.io/f/fail.jpg" }]);

		mockPrisma.$transaction.mockResolvedValue([
			{ count: 1 },
			{ count: 0 },
			{ count: 0 },
			{ count: 0 },
		]);

		mockDeleteUploadThingFilesFromUrls.mockRejectedValue(new Error("UploadThing API down"));

		const result = await hardDeleteExpiredRecords();

		// Should still return results despite UploadThing failure
		expect(result.reviewsDeleted).toBe(1);
	});

	it("should invalidate product caches when products are deleted", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([]);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([{ id: "prod-1" }]);

		mockPrisma.skuMedia.findMany.mockResolvedValue([]);

		mockPrisma.$transaction.mockResolvedValue([
			{ count: 0 },
			{ count: 0 },
			{ count: 0 },
			{ count: 1 },
		]);

		await hardDeleteExpiredRecords();

		expect(mockUpdateTag).toHaveBeenCalledWith("products-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("products-counts");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-inventory-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith("sitemap-images");
	});

	it("should invalidate review caches when reviews are deleted", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([{ id: "rev-1" }]);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([]);

		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);

		mockPrisma.$transaction.mockResolvedValue([
			{ count: 1 },
			{ count: 0 },
			{ count: 0 },
			{ count: 0 },
		]);

		await hardDeleteExpiredRecords();

		expect(mockUpdateTag).toHaveBeenCalledWith("reviews-admin-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("reviews-global-stats");
	});

	it("should invalidate newsletter caches when newsletter subscribers are deleted", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([]);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([{ id: "ns-1" }]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([]);

		mockPrisma.$transaction.mockResolvedValue([
			{ count: 0 },
			{ count: 1 },
			{ count: 0 },
			{ count: 0 },
		]);

		await hardDeleteExpiredRecords();

		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	it("should invalidate customization caches when customization requests are deleted", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([]);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([{ id: "cust-1" }]);
		mockPrisma.product.findMany.mockResolvedValue([]);

		mockPrisma.$transaction.mockResolvedValue([
			{ count: 0 },
			{ count: 0 },
			{ count: 1 },
			{ count: 0 },
		]);

		await hardDeleteExpiredRecords();

		expect(mockUpdateTag).toHaveBeenCalledWith("customizations-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("customizations-stats");
	});

	it("should NOT invalidate caches when nothing is deleted", async () => {
		setupEmptyBatch();

		await hardDeleteExpiredRecords();

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should batch all deletes in a single transaction", async () => {
		const reviews = [{ id: "rev-1" }];
		const newsletter = [{ id: "ns-1" }];
		const customizations = [{ id: "cust-1" }];
		const products = [{ id: "prod-1" }];

		mockPrisma.productReview.findMany.mockResolvedValue(reviews);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue(newsletter);
		mockPrisma.customizationRequest.findMany.mockResolvedValue(customizations);
		mockPrisma.product.findMany.mockResolvedValue(products);

		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([]);

		mockPrisma.$transaction.mockResolvedValue([
			{ count: 1 },
			{ count: 1 },
			{ count: 1 },
			{ count: 1 },
		]);

		await hardDeleteExpiredRecords();

		// $transaction should be called once with array of 4 operations
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		const transactionArg = mockPrisma.$transaction.mock.calls[0]![0];
		expect(transactionArg).toHaveLength(4);
	});
});
