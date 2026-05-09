import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockUpdateTag, mockDeleteUploadThingFilesFromUrls, mockLogger } = vi.hoisted(
	() => ({
		mockPrisma: {
			productReview: { findMany: vi.fn(), deleteMany: vi.fn() },
			product: { findMany: vi.fn(), deleteMany: vi.fn() },
			reviewMedia: { findMany: vi.fn() },
			skuMedia: { findMany: vi.fn() },
			$transaction: vi.fn(),
		},
		mockUpdateTag: vi.fn(),
		mockDeleteUploadThingFilesFromUrls: vi.fn(),
		mockLogger: {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		},
	}),
);

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: mockDeleteUploadThingFilesFromUrls,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));

import { hardDeleteExpiredRecords } from "../hard-delete-retention.service";
import { BATCH_SIZE_LARGE, RETENTION } from "@/modules/cron/constants/limits";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { REVIEWS_CACHE_TAGS } from "@/modules/reviews/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

const buildIds = (prefix: string, count: number) =>
	Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}` }));

describe("hardDeleteExpiredRecords", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.productReview.findMany.mockResolvedValue([]);
		mockPrisma.product.findMany.mockResolvedValue([]);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue([{ count: 0 }, { count: 0 }]);
		mockDeleteUploadThingFilesFromUrls.mockResolvedValue({ deleted: 0 });
	});

	it("happy path: deletes batch of products and reviews, invalidates 7 cache tags, calls UploadThing twice", async () => {
		const reviewIds = buildIds("review", BATCH_SIZE_LARGE);
		const productIds = buildIds("product", BATCH_SIZE_LARGE);

		mockPrisma.productReview.findMany.mockResolvedValue(reviewIds);
		mockPrisma.product.findMany.mockResolvedValue(productIds);
		mockPrisma.reviewMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/review-1" },
			{ url: "https://utfs.io/f/review-2" },
		]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/sku-1", thumbnailUrl: "https://utfs.io/f/sku-thumb-1" },
			{ url: "https://utfs.io/f/sku-2", thumbnailUrl: null },
		]);
		mockPrisma.$transaction.mockResolvedValue([
			{ count: BATCH_SIZE_LARGE },
			{ count: BATCH_SIZE_LARGE },
		]);
		mockDeleteUploadThingFilesFromUrls.mockResolvedValue({ deleted: 4 });

		const result = await hardDeleteExpiredRecords();

		expect(result).toEqual({
			productsDeleted: BATCH_SIZE_LARGE,
			reviewsDeleted: BATCH_SIZE_LARGE,
			hasMore: true,
		});

		expect(mockUpdateTag).toHaveBeenCalledWith(PRODUCTS_CACHE_TAGS.LIST);
		expect(mockUpdateTag).toHaveBeenCalledWith(PRODUCTS_CACHE_TAGS.COUNTS);
		expect(mockUpdateTag).toHaveBeenCalledWith(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST);
		expect(mockUpdateTag).toHaveBeenCalledWith(SHARED_CACHE_TAGS.ADMIN_BADGES);
		expect(mockUpdateTag).toHaveBeenCalledWith(SHARED_CACHE_TAGS.SITEMAP_IMAGES);
		expect(mockUpdateTag).toHaveBeenCalledWith(REVIEWS_CACHE_TAGS.ADMIN_LIST);
		expect(mockUpdateTag).toHaveBeenCalledWith(REVIEWS_CACHE_TAGS.GLOBAL_STATS);
		expect(mockUpdateTag).toHaveBeenCalledTimes(7);

		expect(mockDeleteUploadThingFilesFromUrls).toHaveBeenCalledTimes(2);
		expect(mockDeleteUploadThingFilesFromUrls).toHaveBeenCalledWith([
			"https://utfs.io/f/review-1",
			"https://utfs.io/f/review-2",
		]);
		expect(mockDeleteUploadThingFilesFromUrls).toHaveBeenCalledWith([
			"https://utfs.io/f/sku-1",
			"https://utfs.io/f/sku-thumb-1",
			"https://utfs.io/f/sku-2",
		]);
	});

	it("returns zero counts and skips cache invalidation + UploadThing when no records eligible", async () => {
		const result = await hardDeleteExpiredRecords();

		expect(result).toEqual({
			productsDeleted: 0,
			reviewsDeleted: 0,
			hasMore: false,
		});
		expect(mockUpdateTag).not.toHaveBeenCalled();
		expect(mockDeleteUploadThingFilesFromUrls).not.toHaveBeenCalled();
	});

	it("invalidates only product tags when reviews are empty", async () => {
		mockPrisma.product.findMany.mockResolvedValue(buildIds("product", 5));
		mockPrisma.skuMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue([{ count: 0 }, { count: 5 }]);

		await hardDeleteExpiredRecords();

		expect(mockUpdateTag).toHaveBeenCalledWith(PRODUCTS_CACHE_TAGS.LIST);
		expect(mockUpdateTag).toHaveBeenCalledWith(PRODUCTS_CACHE_TAGS.COUNTS);
		expect(mockUpdateTag).toHaveBeenCalledWith(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST);
		expect(mockUpdateTag).toHaveBeenCalledWith(SHARED_CACHE_TAGS.ADMIN_BADGES);
		expect(mockUpdateTag).toHaveBeenCalledWith(SHARED_CACHE_TAGS.SITEMAP_IMAGES);
		expect(mockUpdateTag).not.toHaveBeenCalledWith(REVIEWS_CACHE_TAGS.ADMIN_LIST);
		expect(mockUpdateTag).not.toHaveBeenCalledWith(REVIEWS_CACHE_TAGS.GLOBAL_STATS);
	});

	it("invalidates only review tags when products are empty", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue(buildIds("review", 5));
		mockPrisma.reviewMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockResolvedValue([{ count: 5 }, { count: 0 }]);

		await hardDeleteExpiredRecords();

		expect(mockUpdateTag).toHaveBeenCalledWith(REVIEWS_CACHE_TAGS.ADMIN_LIST);
		expect(mockUpdateTag).toHaveBeenCalledWith(REVIEWS_CACHE_TAGS.GLOBAL_STATS);
		expect(mockUpdateTag).not.toHaveBeenCalledWith(PRODUCTS_CACHE_TAGS.LIST);
		expect(mockUpdateTag).not.toHaveBeenCalledWith(PRODUCTS_CACHE_TAGS.COUNTS);
		expect(mockUpdateTag).not.toHaveBeenCalledWith(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST);
		expect(mockUpdateTag).not.toHaveBeenCalledWith(SHARED_CACHE_TAGS.ADMIN_BADGES);
		expect(mockUpdateTag).not.toHaveBeenCalledWith(SHARED_CACHE_TAGS.SITEMAP_IMAGES);
	});

	it("returns hasMore=false when batch size limit is not reached on either model", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue(buildIds("review", 25));
		mockPrisma.product.findMany.mockResolvedValue(buildIds("product", 25));
		mockPrisma.$transaction.mockResolvedValue([{ count: 25 }, { count: 25 }]);

		const result = await hardDeleteExpiredRecords();

		expect(result.hasMore).toBe(false);
	});

	it("queries Product with status=ARCHIVED and retention cutoff, ProductReview with retention cutoff only", async () => {
		await hardDeleteExpiredRecords();

		const reviewCall = mockPrisma.productReview.findMany.mock.calls[0]![0];
		const productCall = mockPrisma.product.findMany.mock.calls[0]![0];

		expect(reviewCall.where).toEqual({ deletedAt: { lt: expect.any(Date) } });
		expect(reviewCall.select).toEqual({ id: true });
		expect(reviewCall.take).toBe(BATCH_SIZE_LARGE);

		expect(productCall.where).toEqual({
			deletedAt: { lt: expect.any(Date) },
			status: "ARCHIVED",
		});
		expect(productCall.select).toEqual({ id: true });
		expect(productCall.take).toBe(BATCH_SIZE_LARGE);

		const cutoff = reviewCall.where.deletedAt.lt as Date;
		const expectedYear = new Date().getFullYear() - RETENTION.LEGAL_RETENTION_YEARS;
		expect(cutoff.getFullYear()).toBe(expectedYear);
	});

	it("skips UploadThing cleanup when deadline is exceeded but still invalidates caches", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue(buildIds("review", 5));
		mockPrisma.product.findMany.mockResolvedValue(buildIds("product", 5));
		mockPrisma.reviewMedia.findMany.mockResolvedValue([{ url: "https://utfs.io/f/review-1" }]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/sku-1", thumbnailUrl: null },
		]);
		mockPrisma.$transaction.mockResolvedValue([{ count: 5 }, { count: 5 }]);

		const initialNow = Date.now();
		let callCount = 0;
		vi.spyOn(Date, "now").mockImplementation(() => {
			callCount += 1;
			// First call sets the deadline. Subsequent calls (deadline check at l114)
			// return a value past the deadline to trigger the UploadThing cleanup skip.
			if (callCount === 1) return initialNow;
			return initialNow + 60_000;
		});

		const result = await hardDeleteExpiredRecords();

		expect(result).toEqual({
			productsDeleted: 5,
			reviewsDeleted: 5,
			hasMore: false,
		});
		expect(mockUpdateTag).toHaveBeenCalledTimes(7);
		expect(mockDeleteUploadThingFilesFromUrls).not.toHaveBeenCalled();
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("Approaching timeout"),
			expect.objectContaining({ cronJob: "hard-delete-retention" }),
		);

		vi.spyOn(Date, "now").mockRestore();
	});

	it("does not throw when UploadThing rejects (non-blocking with logger.warn)", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue(buildIds("review", 3));
		mockPrisma.product.findMany.mockResolvedValue(buildIds("product", 3));
		mockPrisma.reviewMedia.findMany.mockResolvedValue([{ url: "https://utfs.io/f/review-1" }]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([
			{ url: "https://utfs.io/f/sku-1", thumbnailUrl: null },
		]);
		mockPrisma.$transaction.mockResolvedValue([{ count: 3 }, { count: 3 }]);
		mockDeleteUploadThingFilesFromUrls.mockRejectedValue(new Error("UploadThing API down"));

		const result = await hardDeleteExpiredRecords();

		expect(result).toEqual({
			productsDeleted: 3,
			reviewsDeleted: 3,
			hasMore: false,
		});
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("Failed to delete review media from UploadThing"),
			expect.objectContaining({ cronJob: "hard-delete-retention" }),
		);
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("Failed to delete product media from UploadThing"),
			expect.objectContaining({ cronJob: "hard-delete-retention" }),
		);
	});
});
