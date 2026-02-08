import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { deleteUploadThingFilesFromUrls } from "@/modules/media/services/delete-uploadthing-files.service";
import { RETENTION } from "@/modules/cron/constants/limits";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { REVIEWS_CACHE_TAGS } from "@/modules/reviews/constants/cache";

/**
 * Service de suppression définitive après la période de rétention légale
 *
 * Supprime définitivement les données soft-deleted après 10 ans.
 *
 * IMPORTANT: Les données comptables (Order, Refund, OrderHistory)
 * sont exclues car elles doivent être conservées indéfiniment pour audit.
 *
 * Tables concernées:
 * - Product (et ProductSku, SkuMedia, etc. en cascade)
 * - ProductReview, ReviewResponse, ReviewMedia (en cascade)
 * - NewsletterSubscriber
 * - StockNotificationRequest
 * - CustomizationRequest
 */
export async function hardDeleteExpiredRecords(): Promise<{
	productsDeleted: number;
	reviewsDeleted: number;
	newsletterDeleted: number;
	stockNotificationsDeleted: number;
	customizationRequestsDeleted: number;
}> {
	console.log(
		"[CRON:hard-delete-retention] Starting 10-year retention cleanup..."
	);

	const retentionDate = new Date();
	retentionDate.setFullYear(retentionDate.getFullYear() - RETENTION.LEGAL_RETENTION_YEARS);

	console.log(
		`[CRON:hard-delete-retention] Deleting records soft-deleted before ${retentionDate.toISOString()}`
	);

	// 1. Collect UploadThing URLs before DB transaction
	const reviewMediaUrls = await prisma.reviewMedia.findMany({
		where: {
			review: {
				deletedAt: { lt: retentionDate },
			},
		},
		select: { url: true },
	});

	const skuMediaUrls = await prisma.skuMedia.findMany({
		where: {
			sku: {
				product: {
					deletedAt: { lt: retentionDate },
					status: "ARCHIVED",
				},
			},
		},
		select: { url: true, thumbnailUrl: true },
	});

	// 2. Run all DB deletes in a single transaction
	// Note: Wishlist has no deletedAt (no soft-delete), skipped here
	const [
		reviewsResult,
		newsletterResult,
		stockNotificationsResult,
		customizationRequestsResult,
		productsResult,
	] = await prisma.$transaction([
		prisma.productReview.deleteMany({
			where: { deletedAt: { lt: retentionDate } },
		}),
		prisma.newsletterSubscriber.deleteMany({
			where: { deletedAt: { lt: retentionDate } },
		}),
		prisma.stockNotificationRequest.deleteMany({
			where: { deletedAt: { lt: retentionDate } },
		}),
		prisma.customizationRequest.deleteMany({
			where: { deletedAt: { lt: retentionDate } },
		}),
		prisma.product.deleteMany({
			where: { deletedAt: { lt: retentionDate }, status: "ARCHIVED" },
		}),
	]);

	console.log(
		`[CRON:hard-delete-retention] DB transaction completed: ` +
			`${reviewsResult.count} reviews, ${newsletterResult.count} newsletter, ` +
			`${stockNotificationsResult.count} stock notifications, ` +
			`${customizationRequestsResult.count} customization requests, ` +
			`${productsResult.count} products`
	);

	// 3. Invalidate caches for deleted records
	if (productsResult.count > 0) {
		updateTag(PRODUCTS_CACHE_TAGS.LIST);
		updateTag(PRODUCTS_CACHE_TAGS.COUNTS);
	}
	if (reviewsResult.count > 0) {
		updateTag(REVIEWS_CACHE_TAGS.ADMIN_LIST);
		updateTag(REVIEWS_CACHE_TAGS.GLOBAL_STATS);
	}

	// 4. Delete UploadThing files after DB transaction succeeds
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
		stockNotificationsDeleted: stockNotificationsResult.count,
		customizationRequestsDeleted: customizationRequestsResult.count,
	};
}
