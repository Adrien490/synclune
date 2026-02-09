import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { deleteUploadThingFilesFromUrls } from "@/modules/media/services/delete-uploadthing-files.service";
import { BATCH_SIZE_LARGE, RETENTION } from "@/modules/cron/constants/limits";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { REVIEWS_CACHE_TAGS } from "@/modules/reviews/constants/cache";

/**
 * Service de suppression définitive après la période de rétention légale
 *
 * Supprime définitivement les données soft-deleted après 10 ans.
 * Processes in batches to avoid timeout on large datasets.
 *
 * IMPORTANT: Les données comptables (Order, Refund, OrderHistory)
 * sont exclues car elles doivent être conservées indéfiniment pour audit.
 *
 * Tables concernées:
 * - Product (et ProductSku, SkuMedia, etc. en cascade)
 * - ProductReview, ReviewResponse, ReviewMedia (en cascade)
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
	console.log(
		"[CRON:hard-delete-retention] Starting 10-year retention cleanup..."
	);

	const retentionDate = new Date();
	retentionDate.setFullYear(retentionDate.getFullYear() - RETENTION.LEGAL_RETENTION_YEARS);

	console.log(
		`[CRON:hard-delete-retention] Deleting records soft-deleted before ${retentionDate.toISOString()}`
	);

	const retentionWhere = { deletedAt: { lt: retentionDate } };

	// 1. Find IDs to delete (batched to prevent timeout)
	const [reviewIds, newsletterIds, customizationIds, productIds] =
		await Promise.all([
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
		console.log(
			"[CRON:hard-delete-retention] Batch limit reached, more records may remain for next run"
		);
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
	// Note: Wishlist has no deletedAt (no soft-delete), skipped here
	const [
		reviewsResult,
		newsletterResult,
		customizationRequestsResult,
		productsResult,
	] = await prisma.$transaction([
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

	console.log(
		`[CRON:hard-delete-retention] DB transaction completed: ` +
			`${reviewsResult.count} reviews, ${newsletterResult.count} newsletter, ` +
			`${customizationRequestsResult.count} customization requests, ` +
			`${productsResult.count} products`
	);

	// 4. Invalidate caches for deleted records
	if (productsResult.count > 0) {
		updateTag(PRODUCTS_CACHE_TAGS.LIST);
		updateTag(PRODUCTS_CACHE_TAGS.COUNTS);
	}
	if (reviewsResult.count > 0) {
		updateTag(REVIEWS_CACHE_TAGS.ADMIN_LIST);
		updateTag(REVIEWS_CACHE_TAGS.GLOBAL_STATS);
	}

	// 5. Delete UploadThing files after DB transaction succeeds
	if (reviewMediaUrls.length > 0) {
		const urls = reviewMediaUrls.map((m) => m.url);
		const result = await deleteUploadThingFilesFromUrls(urls);
		console.log(
			`[CRON:hard-delete-retention] Deleted ${result.deleted} review media files from UploadThing`
		);
	}

	if (skuMediaUrls.length > 0) {
		const urls = skuMediaUrls.flatMap((m) =>
			[m.url, m.thumbnailUrl].filter((u): u is string => u !== null)
		);
		const result = await deleteUploadThingFilesFromUrls(urls);
		console.log(
			`[CRON:hard-delete-retention] Deleted ${result.deleted} product media files from UploadThing`
		);
	}

	console.log("[CRON:hard-delete-retention] Retention cleanup completed");

	return {
		productsDeleted: productsResult.count,
		reviewsDeleted: reviewsResult.count,
		newsletterDeleted: newsletterResult.count,
		customizationRequestsDeleted: customizationRequestsResult.count,
		hasMore,
	};
}
