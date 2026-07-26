import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockUpdateTag, mockDeleteUploadThingFilesFromUrls, mockLogger } = vi.hoisted(
	() => ({
		mockPrisma: {
			productReview: { findMany: vi.fn(), deleteMany: vi.fn() },
			product: { findMany: vi.fn(), deleteMany: vi.fn() },
			reviewMedia: { findMany: vi.fn() },
			skuMedia: { findMany: vi.fn() },
			order: { findMany: vi.fn(), updateMany: vi.fn() },
			refund: { updateMany: vi.fn() },
			orderNote: { updateMany: vi.fn() },
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
import {
	ORDER_PII_SCRUB,
	PURGED_ORDER_NOTE_CONTENT,
	REFUND_PII_SCRUB,
} from "@/modules/orders/constants/pii-scrub";
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
		mockPrisma.order.findMany.mockResolvedValue([]);
		mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.orderNote.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.$transaction.mockResolvedValue([{ count: 0 }, { count: 0 }]);
		mockDeleteUploadThingFilesFromUrls.mockResolvedValue({ deleted: 0, failed: 0 });
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

		expect(result).toMatchObject({
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

		expect(result).toMatchObject({
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

		expect(result).toMatchObject({
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

	it("purges order PII past 10-year retention: deletes PDFs FIRST (incl. per-refund credit notes), then scrubs Order+Refund+OrderNote + sets piiPurgedAt", async () => {
		// 1st findMany = paid purge, 2nd findMany = unpaid (abandoned) purge → empty here.
		mockPrisma.order.findMany
			.mockResolvedValueOnce([
				{
					id: "order-1",
					invoicePdfUrl: "https://utfs.io/f/invoice-1",
					creditNotePdfUrl: "https://utfs.io/f/credit-1",
					// Avoir PARTIEL par-refund (audit rétention PII 2026-07-09) : son PDF
					// porte l'identité acheteur et DOIT partir dans le même lot.
					refunds: [{ creditNotePdfUrl: "https://utfs.io/f/refund-credit-1" }],
				},
				{
					id: "order-2",
					invoicePdfUrl: "https://utfs.io/f/invoice-2",
					creditNotePdfUrl: null,
					refunds: [{ creditNotePdfUrl: null }],
				},
			])
			.mockResolvedValueOnce([]);
		// paid-purge scrub tx runs first (callback exécuté pour observer les scrubs
		// internes Refund/OrderNote/Order), then the review/product tx → array.
		mockPrisma.order.updateMany.mockResolvedValue({ count: 2 });
		mockPrisma.$transaction
			.mockImplementationOnce(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
				fn(mockPrisma),
			)
			.mockResolvedValueOnce([{ count: 0 }, { count: 0 }]);
		mockDeleteUploadThingFilesFromUrls.mockResolvedValue({ deleted: 4, failed: 0 });

		const result = await hardDeleteExpiredRecords();

		// Selection: only paid orders past cutoff, not yet purged (+ per-refund PDFs).
		const orderCall = mockPrisma.order.findMany.mock.calls[0]![0];
		expect(orderCall.where.piiPurgedAt).toBeNull();
		expect(orderCall.where.paidAt.lt).toBeInstanceOf(Date);
		expect(orderCall.select.refunds).toEqual({ select: { creditNotePdfUrl: true } });

		// Archived PDFs (invoice + credit note + refund credit notes) deleted from UploadThing.
		// `allowFiscalArchives` est OBLIGATOIRE ici (audit média M7) : le service refuse
		// par défaut de supprimer un PDF encore référencé par Order/Refund. Ce cron est
		// le seul effaceur légitime — la rétention 10 ans (Art. L102 B LPF) est échue.
		expect(mockDeleteUploadThingFilesFromUrls).toHaveBeenCalledWith(
			[
				"https://utfs.io/f/invoice-1",
				"https://utfs.io/f/credit-1",
				"https://utfs.io/f/refund-credit-1",
				"https://utfs.io/f/invoice-2",
			],
			{ allowFiscalArchives: true },
		);

		// F-B: PDF deletion must precede the scrub tx (so the pointer is never nulled
		// before the file is gone). deleteUploadThing is invoked before the scrub $transaction.
		const deleteOrder = mockDeleteUploadThingFilesFromUrls.mock.invocationCallOrder[0]!;
		const scrubTxOrder = mockPrisma.$transaction.mock.invocationCallOrder[0]!;
		expect(deleteOrder).toBeLessThan(scrubTxOrder);

		// Scrub atomique dans la tx : Refund (avoirs + note), OrderNote (texte libre),
		// Order (payload complet + sentinel piiPurgedAt).
		expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith({
			where: { orderId: { in: ["order-1", "order-2"] } },
			data: { ...REFUND_PII_SCRUB },
		});
		expect(mockPrisma.orderNote.updateMany).toHaveBeenCalledWith({
			where: { orderId: { in: ["order-1", "order-2"] } },
			data: { content: PURGED_ORDER_NOTE_CONTENT },
		});
		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["order-1", "order-2"] }, piiPurgedAt: null },
			data: { ...ORDER_PII_SCRUB, piiPurgedAt: expect.any(Date) },
		});

		expect(result).toMatchObject({ ordersPurged: 2, orderPdfsDeleted: 4 });
	});

	it("F-B: defers the PII scrub when PDF deletion fails (keeps pointers + piiPurgedAt NULL for retry)", async () => {
		mockPrisma.order.findMany
			.mockResolvedValueOnce([
				{
					id: "order-1",
					invoicePdfUrl: "https://utfs.io/f/invoice-1",
					creditNotePdfUrl: null,
					refunds: [],
				},
			])
			.mockResolvedValueOnce([]);
		// Only the review/product tx should run — the purge scrub must be skipped.
		mockPrisma.$transaction.mockResolvedValueOnce([{ count: 0 }, { count: 0 }]);
		mockDeleteUploadThingFilesFromUrls.mockResolvedValue({ deleted: 0, failed: 1 });

		const result = await hardDeleteExpiredRecords();

		// No scrub tx ran (only the review/product tx → single $transaction call).
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		// G3 (audit) : un échec de suppression PDF doit remonter en `errored` pour
		// déclencher l'alerte admin via withCronGuard (sinon échec silencieux).
		expect(result).toMatchObject({ ordersPurged: 0, errored: 1 });
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("Order PII scrub deferred"),
			expect.objectContaining({ cronJob: "hard-delete-retention" }),
		);
	});

	it("F-B: defers the PII scrub when PDF deletion throws (logs error, no scrub)", async () => {
		mockPrisma.order.findMany
			.mockResolvedValueOnce([
				{
					id: "order-1",
					invoicePdfUrl: "https://utfs.io/f/invoice-1",
					creditNotePdfUrl: null,
					refunds: [],
				},
			])
			.mockResolvedValueOnce([]);
		mockPrisma.$transaction.mockResolvedValueOnce([{ count: 0 }, { count: 0 }]);
		mockDeleteUploadThingFilesFromUrls.mockRejectedValue(new Error("UploadThing 500"));

		const result = await hardDeleteExpiredRecords();

		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		// G3 (audit) : un échec PDF (throw) doit aussi remonter en `errored`.
		expect(result).toMatchObject({ ordersPurged: 0, errored: 1 });
		expect(mockLogger.error).toHaveBeenCalledWith(
			expect.stringContaining("Failed to delete invoice/credit-note PDFs"),
			expect.any(Error),
			expect.objectContaining({ cronJob: "hard-delete-retention" }),
		);
	});

	it("F-A: purges customer/shipping PII from never-paid (abandoned) orders past the window", async () => {
		// 1st findMany = paid purge → empty, 2nd findMany = unpaid purge → 2 abandoned orders.
		mockPrisma.order.findMany
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([{ id: "abandoned-1" }, { id: "abandoned-2" }]);
		// 1st tx = abandoned scrub → { count }, 2nd tx = review/product → array.
		mockPrisma.$transaction
			.mockResolvedValueOnce({ count: 2 })
			.mockResolvedValueOnce([{ count: 0 }, { count: 0 }]);

		const result = await hardDeleteExpiredRecords();

		// Unpaid selection: paidAt IS NULL + createdAt < cutoff + not yet purged.
		const unpaidCall = mockPrisma.order.findMany.mock.calls[1]![0];
		expect(unpaidCall.where.paidAt).toBeNull();
		expect(unpaidCall.where.piiPurgedAt).toBeNull();
		expect(unpaidCall.where.createdAt.lt).toBeInstanceOf(Date);

		// No PDF deletion for unpaid orders (no archived invoice).
		expect(mockDeleteUploadThingFilesFromUrls).not.toHaveBeenCalled();

		expect(result).toMatchObject({ abandonedOrdersPurged: 2 });
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

		expect(result).toMatchObject({
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
