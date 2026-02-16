import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockDeleteFiles, mockUpdateTag } = vi.hoisted(() => ({
	mockPrisma: {
		productReview: { findMany: vi.fn(), deleteMany: vi.fn() },
		newsletterSubscriber: { findMany: vi.fn(), deleteMany: vi.fn() },
		customizationRequest: { findMany: vi.fn(), deleteMany: vi.fn() },
		product: { findMany: vi.fn(), deleteMany: vi.fn() },
		reviewMedia: { findMany: vi.fn() },
		skuMedia: { findMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockDeleteFiles: vi.fn(),
	mockUpdateTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: mockDeleteFiles,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: { LIST: "products-list", COUNTS: "products-counts" },
}));
vi.mock("@/modules/reviews/constants/cache", () => ({
	REVIEWS_CACHE_TAGS: {
		ADMIN_LIST: "reviews-admin-list",
		GLOBAL_STATS: "reviews-global-stats",
	},
}));

import { hardDeleteExpiredRecords } from "../hard-delete-retention.service";
import { BATCH_SIZE_LARGE } from "@/modules/cron/constants/limits";

describe("hardDeleteExpiredRecords", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2036-03-01T08:00:00Z"));
	});

	function setupEmptyResults() {
		mockPrisma.productReview.findMany.mockResolvedValue([]);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue([
			{ count: 0 },
			{ count: 0 },
			{ count: 0 },
			{ count: 0 },
		]);
	}

	it("should return zero counts when no records are expired", async () => {
		setupEmptyResults();

		const result = await hardDeleteExpiredRecords();

		expect(result).toEqual({
			productsDeleted: 0,
			reviewsDeleted: 0,
			newsletterDeleted: 0,
			customizationRequestsDeleted: 0,
			hasMore: false,
		});
	});

	it("should use 10-year retention date for queries", async () => {
		setupEmptyResults();

		await hardDeleteExpiredRecords();

		const call = mockPrisma.productReview.findMany.mock.calls[0][0];
		const retentionDate = call.where.deletedAt.lt;
		expect(retentionDate.getFullYear()).toBe(2026);
	});

	it("should apply batch limit to all findMany queries", async () => {
		setupEmptyResults();

		await hardDeleteExpiredRecords();

		expect(mockPrisma.productReview.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ take: BATCH_SIZE_LARGE })
		);
		expect(mockPrisma.newsletterSubscriber.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ take: BATCH_SIZE_LARGE })
		);
		expect(mockPrisma.customizationRequest.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ take: BATCH_SIZE_LARGE })
		);
		expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ take: BATCH_SIZE_LARGE })
		);
	});

	it("should require ARCHIVED status for product deletion", async () => {
		setupEmptyResults();

		await hardDeleteExpiredRecords();

		expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ status: "ARCHIVED" }),
			})
		);
	});

	it("should delete records by ID in a transaction", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([
			{ id: "review-1" },
			{ id: "review-2" },
		]);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
			{ id: "sub-1" },
		]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([{ id: "prod-1" }]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue([
			{ count: 2 },
			{ count: 1 },
			{ count: 0 },
			{ count: 1 },
		]);

		const result = await hardDeleteExpiredRecords();

		expect(result.reviewsDeleted).toBe(2);
		expect(result.newsletterDeleted).toBe(1);
		expect(result.customizationRequestsDeleted).toBe(0);
		expect(result.productsDeleted).toBe(1);
		expect(result.hasMore).toBe(false);
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
	});

	it("should set hasMore=true when any model reaches batch limit", async () => {
		const reviewIds = Array.from({ length: BATCH_SIZE_LARGE }, (_, i) => ({
			id: `review-${i}`,
		}));
		mockPrisma.productReview.findMany.mockResolvedValue(reviewIds);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue([
			{ count: BATCH_SIZE_LARGE },
			{ count: 0 },
			{ count: 0 },
			{ count: 0 },
		]);

		const result = await hardDeleteExpiredRecords();

		expect(result.hasMore).toBe(true);
	});

	it("should collect and delete UploadThing files after transaction", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([
			{ id: "review-1" },
		]);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([{ id: "prod-1" }]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/review-media-1" },
		]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/sku-media-1", thumbnailUrl: "https://utfs.io/f/sku-thumb-1" },
		]);
		mockPrisma.$transaction.mockResolvedValue([
			{ count: 1 },
			{ count: 0 },
			{ count: 0 },
			{ count: 1 },
		]);
		mockDeleteFiles.mockResolvedValue({ deleted: 1, failed: 0 });

		await hardDeleteExpiredRecords();

		expect(mockDeleteFiles).toHaveBeenCalledWith([
			"https://utfs.io/f/review-media-1",
		]);
		expect(mockDeleteFiles).toHaveBeenCalledWith([
			"https://utfs.io/f/sku-media-1",
			"https://utfs.io/f/sku-thumb-1",
		]);
	});

	it("should invalidate caches when records are deleted", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([
			{ id: "review-1" },
		]);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([{ id: "prod-1" }]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue([
			{ count: 1 },
			{ count: 0 },
			{ count: 0 },
			{ count: 1 },
		]);

		await hardDeleteExpiredRecords();

		expect(mockUpdateTag).toHaveBeenCalledWith("products-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("products-counts");
		expect(mockUpdateTag).toHaveBeenCalledWith("reviews-admin-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("reviews-global-stats");
	});

	it("should skip media collection when no IDs found", async () => {
		setupEmptyResults();

		await hardDeleteExpiredRecords();

		expect(mockPrisma.reviewMedia.findMany).not.toHaveBeenCalled();
		expect(mockPrisma.skuMedia.findMany).not.toHaveBeenCalled();
	});

	it("should not fail when UploadThing review media deletion throws", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([
			{ id: "review-1" },
		]);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/review-media-1" },
		]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue([
			{ count: 1 },
			{ count: 0 },
			{ count: 0 },
			{ count: 0 },
		]);
		mockDeleteFiles.mockRejectedValue(new Error("UploadThing API error"));

		const result = await hardDeleteExpiredRecords();

		expect(result.reviewsDeleted).toBe(1);
		expect(mockDeleteFiles).toHaveBeenCalled();
	});

	it("should not fail when UploadThing sku media deletion throws", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([]);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([{ id: "prod-1" }]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/sku-1", thumbnailUrl: null },
		]);
		mockPrisma.$transaction.mockResolvedValue([
			{ count: 0 },
			{ count: 0 },
			{ count: 0 },
			{ count: 1 },
		]);
		mockDeleteFiles.mockRejectedValue(new Error("UploadThing API error"));

		const result = await hardDeleteExpiredRecords();

		expect(result.productsDeleted).toBe(1);
		expect(mockDeleteFiles).toHaveBeenCalled();
	});

	it("should filter null thumbnailUrls from sku media", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([]);
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([{ id: "prod-1" }]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/sku-1", thumbnailUrl: null },
		]);
		mockPrisma.$transaction.mockResolvedValue([
			{ count: 0 },
			{ count: 0 },
			{ count: 0 },
			{ count: 1 },
		]);
		mockDeleteFiles.mockResolvedValue({ deleted: 1, failed: 0 });

		await hardDeleteExpiredRecords();

		expect(mockDeleteFiles).toHaveBeenCalledWith([
			"https://utfs.io/f/sku-1",
		]);
	});
});
