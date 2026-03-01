import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { deleteUploadThingFilesFromUrls } from "@/modules/media/services/delete-uploadthing-files.service";
import { BATCH_DEADLINE_MS, BATCH_SIZE_LARGE, RETENTION } from "@/modules/cron/constants/limits";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { REVIEWS_CACHE_TAGS } from "@/modules/reviews/constants/cache";
import { CUSTOMIZATION_CACHE_TAGS } from "@/modules/customizations/constants/cache";
import { NEWSLETTER_CACHE_TAGS } from "@/modules/newsletter/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

/**
 * Permanently deletes soft-deleted records past the legal retention period.
 *
 * Processes in batches to avoid timeout on large datasets.
 *
 * IMPORTANT: Accounting data (Order, Refund, OrderHistory) is excluded
 * as it must be retained indefinitely for audit purposes.
 *
 * Tables handled:
 * - Product (and ProductSku, SkuMedia, etc. via cascade)
 * - ProductReview, ReviewResponse, ReviewMedia (via cascade)
 * - NewsletterSubscriber
 * - CustomizationRequest
 */
export async function hardDeleteExpiredRecords(): Promise<{
	productsDeleted: number;
	reviewsDeleted: number;
	newsletterDeleted: number;
	customizationRequestsDeleted: number;
	hasMore: boolean;
}> {
	logger.info("Starting 10-year retention cleanup", { cronJob: "hard-delete-retention" });

	const deadline = Date.now() + BATCH_DEADLINE_MS;

	const retentionDate = new Date();
	retentionDate.setFullYear(retentionDate.getFullYear() - RETENTION.LEGAL_RETENTION_YEARS);

	logger.info("Deleting records soft-deleted before cutoff", {
		cronJob: "hard-delete-retention",
		retentionDate: retentionDate.toISOString(),
	});

	const retentionWhere = { deletedAt: { lt: retentionDate } };

	// 1. Find IDs to delete (batched to prevent timeout)
	const [reviewIds, newsletterIds, customizationIds, productIds] = await Promise.all([
		prisma.productReview.findMany({
			where: retentionWhere,
			select: { id: true },
			take: BATCH_SIZE_LARGE,
		}),
		prisma.newsletterSubscriber.findMany({
			where: retentionWhere,
			select: { id: true },
			take: BATCH_SIZE_LARGE,
		}),
		prisma.customizationRequest.findMany({
			where: retentionWhere,
			select: { id: true },
			take: BATCH_SIZE_LARGE,
		}),
		prisma.product.findMany({
			where: { ...retentionWhere, status: "ARCHIVED" },
			select: { id: true },
			take: BATCH_SIZE_LARGE,
		}),
	]);

	// Check if any model hit the batch limit (more records may remain)
	const hasMore =
		reviewIds.length === BATCH_SIZE_LARGE ||
		newsletterIds.length === BATCH_SIZE_LARGE ||
		customizationIds.length === BATCH_SIZE_LARGE ||
		productIds.length === BATCH_SIZE_LARGE;

	if (hasMore) {
		logger.info("Batch limit reached, more records may remain for next run", {
			cronJob: "hard-delete-retention",
		});
	}

	// 2. Collect UploadThing URLs before DB transaction
	const reviewMediaUrls =
		reviewIds.length > 0
			? await prisma.reviewMedia.findMany({
					where: { reviewId: { in: reviewIds.map((r) => r.id) } },
					select: { url: true },
				})
			: [];

	const skuMediaUrls =
		productIds.length > 0
			? await prisma.skuMedia.findMany({
					where: {
						sku: { productId: { in: productIds.map((p) => p.id) } },
					},
					select: { url: true, thumbnailUrl: true },
				})
			: [];

	// 3. Run all DB deletes in a single transaction
	const [reviewsResult, newsletterResult, customizationRequestsResult, productsResult] =
		await prisma.$transaction([
			prisma.productReview.deleteMany({
				where: { id: { in: reviewIds.map((r) => r.id) } },
			}),
			prisma.newsletterSubscriber.deleteMany({
				where: { id: { in: newsletterIds.map((n) => n.id) } },
			}),
			prisma.customizationRequest.deleteMany({
				where: { id: { in: customizationIds.map((c) => c.id) } },
			}),
			prisma.product.deleteMany({
				where: { id: { in: productIds.map((p) => p.id) } },
			}),
		]);

	logger.info("DB transaction completed", {
		cronJob: "hard-delete-retention",
		reviewsDeleted: reviewsResult.count,
		newsletterDeleted: newsletterResult.count,
		customizationRequestsDeleted: customizationRequestsResult.count,
		productsDeleted: productsResult.count,
	});

	// 4. Invalidate caches when records were deleted
	if (productsResult.count > 0) {
		updateTag(PRODUCTS_CACHE_TAGS.LIST);
		updateTag(PRODUCTS_CACHE_TAGS.COUNTS);
		updateTag(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(SHARED_CACHE_TAGS.SITEMAP_IMAGES);
	}
	if (reviewsResult.count > 0) {
		updateTag(REVIEWS_CACHE_TAGS.ADMIN_LIST);
		updateTag(REVIEWS_CACHE_TAGS.GLOBAL_STATS);
	}
	if (customizationRequestsResult.count > 0) {
		updateTag(CUSTOMIZATION_CACHE_TAGS.LIST);
		updateTag(CUSTOMIZATION_CACHE_TAGS.STATS);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
	}
	if (newsletterResult.count > 0) {
		updateTag(NEWSLETTER_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
	}

	// 5. Delete UploadThing files after DB transaction succeeds
	// Non-blocking: if UploadThing fails, orphaned files will be cleaned by cleanup-orphan-media
	if (Date.now() > deadline) {
		logger.warn(
			"Approaching timeout, skipping UploadThing cleanup (will be handled by cleanup-orphan-media)",
			{ cronJob: "hard-delete-retention" },
		);
		return {
			productsDeleted: productsResult.count,
			reviewsDeleted: reviewsResult.count,
			newsletterDeleted: newsletterResult.count,
			customizationRequestsDeleted: customizationRequestsResult.count,
			hasMore,
		};
	}

	if (reviewMediaUrls.length > 0) {
		try {
			const urls = reviewMediaUrls.map((m) => m.url);
			const result = await deleteUploadThingFilesFromUrls(urls);
			logger.info("Deleted review media files from UploadThing", {
				cronJob: "hard-delete-retention",
				count: result.deleted,
			});
		} catch (error) {
			logger.warn("Failed to delete review media from UploadThing", {
				cronJob: "hard-delete-retention",
			});
		}
	}

	if (skuMediaUrls.length > 0) {
		try {
			const urls = skuMediaUrls.flatMap((m) =>
				[m.url, m.thumbnailUrl].filter((u): u is string => u !== null),
			);
			const result = await deleteUploadThingFilesFromUrls(urls);
			logger.info("Deleted product media files from UploadThing", {
				cronJob: "hard-delete-retention",
				count: result.deleted,
			});
		} catch (error) {
			logger.warn("Failed to delete product media from UploadThing", {
				cronJob: "hard-delete-retention",
			});
		}
	}

	logger.info("Retention cleanup completed", { cronJob: "hard-delete-retention" });

	return {
		productsDeleted: productsResult.count,
		reviewsDeleted: reviewsResult.count,
		newsletterDeleted: newsletterResult.count,
		customizationRequestsDeleted: customizationRequestsResult.count,
		hasMore,
	};
}
