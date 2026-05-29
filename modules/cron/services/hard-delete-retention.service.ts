import { updateTag } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { TX_MAX_WAIT_LONG, TX_TIMEOUT_LONG } from "@/shared/lib/prisma-tx-options";
import { logger } from "@/shared/lib/logger";
import { deleteUploadThingFilesFromUrls } from "@/modules/media/services/delete-uploadthing-files.service";
import { BATCH_DEADLINE_MS, BATCH_SIZE_LARGE, RETENTION } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { REVIEWS_CACHE_TAGS } from "@/modules/reviews/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

/**
 * Permanently deletes soft-deleted records past the legal retention period.
 *
 * Processes in batches to avoid timeout on large datasets.
 *
 * IMPORTANT: Accounting data (Order, Refund, OrderHistory) is NEVER hard-deleted —
 * order numbers, amounts and dates are kept for audit (Art. L123-22). But the PII it
 * carries (invoiceDataSnapshot + billing/customer/shipping + archived PDFs) is only
 * retained under the legal obligation to keep the customer-identifying invoice
 * (Art. 289 CGI / RGPD Art. 17(3)(b) erasure exemption). That basis expires at
 * paidAt + 10 years, after which the PII is scrubbed (RGPD Art. 5.1.e storage
 * limitation) while the non-PII accounting fields survive. See `purgeExpiredOrderPii`.
 *
 * Tables handled:
 * - Product (and ProductSku, SkuMedia, etc. via cascade) — hard delete
 * - ProductReview, ReviewResponse, ReviewMedia (via cascade) — hard delete
 * - Order — PII purge only (row kept, PII scrubbed, invoice/credit-note PDFs deleted)
 */

/** PII scrub payload applied to orders past the 10-year legal retention. */
const ORDER_PII_SCRUB = {
	// customerEmail n'a pas de contrainte UNIQUE → une constante suffit (≠ anonymisation
	// compte qui dérive l'email du userId). Cf. RGPD-AUDIT F2.
	customerEmail: "purge-10y@deleted.synclune.local",
	customerName: "Client supprimé",
	customerPhone: null,
	shippingFirstName: "X",
	shippingLastName: "X",
	shippingAddress1: "Adresse supprimée",
	shippingAddress2: null,
	shippingPostalCode: "00000",
	shippingCity: "Supprimé",
	shippingPhone: "0000000000",
	billingFirstName: "X",
	billingLastName: "X",
	billingAddress1: "Adresse supprimée",
	billingAddress2: null,
	billingPostalCode: "00000",
	billingCity: "Supprimé",
	billingPhone: "0000000000",
	// Snapshot facture figé : la base légale ayant expiré, on efface la PII qu'il
	// contient (buyer + adresses). Les colonnes non-PII (numéros, montants) restent.
	invoiceDataSnapshot: Prisma.DbNull,
	invoiceDataHash: null,
	// PDF immuables : on nulle les pointeurs (fichiers UploadThing supprimés hors tx).
	invoicePdfUrl: null,
	invoicePdfHash: null,
	creditNotePdfUrl: null,
	creditNotePdfHash: null,
} as const;

/**
 * Purges PII from orders whose 10-year legal retention has elapsed (paidAt + 10y).
 *
 * The order row is KEPT (Art. L123-22 — numéros/montants/dates non-PII), only the
 * personal data is scrubbed and the archived invoice/credit-note PDFs are deleted
 * from UploadThing. Idempotent via the `piiPurgedAt` sentinel. Self-bounded by
 * `BATCH_SIZE_LARGE`; PDF deletion is best-effort and skipped near the deadline
 * (the now-orphan files are mopped up by `cleanup-orphan-media`).
 */
async function purgeExpiredOrderPii(
	deadline: number,
	retentionDate: Date,
): Promise<{ ordersPurged: number; orderPdfsDeleted: number; ordersHasMore: boolean }> {
	const orders = await prisma.order.findMany({
		where: { paidAt: { lt: retentionDate }, piiPurgedAt: null },
		select: { id: true, invoicePdfUrl: true, creditNotePdfUrl: true },
		take: BATCH_SIZE_LARGE,
	});

	if (orders.length === 0) {
		return { ordersPurged: 0, orderPdfsDeleted: 0, ordersHasMore: false };
	}

	const ordersHasMore = orders.length === BATCH_SIZE_LARGE;
	const orderIds = orders.map((o) => o.id);
	const pdfUrls = orders.flatMap((o) =>
		[o.invoicePdfUrl, o.creditNotePdfUrl].filter((u): u is string => u !== null),
	);

	// 1. Scrub PII + drop PDF pointers in a single transaction (compliance-critical).
	const purged = await prisma.$transaction(
		async (tx) =>
			tx.order.updateMany({
				where: { id: { in: orderIds }, piiPurgedAt: null },
				data: { ...ORDER_PII_SCRUB, piiPurgedAt: new Date() },
			}),
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);

	logger.info("Order PII purged past 10-year retention", {
		cronJob: "hard-delete-retention",
		ordersPurged: purged.count,
	});

	// 2. Delete archived PDFs from UploadThing (best-effort, deadline-aware).
	let orderPdfsDeleted = 0;
	if (pdfUrls.length > 0 && Date.now() <= deadline) {
		try {
			const result = await deleteUploadThingFilesFromUrls(pdfUrls);
			orderPdfsDeleted = result.deleted;
			logger.info("Deleted invoice/credit-note PDFs from UploadThing", {
				cronJob: "hard-delete-retention",
				count: result.deleted,
			});
		} catch (_error) {
			logger.warn("Failed to delete invoice/credit-note PDFs from UploadThing", {
				cronJob: "hard-delete-retention",
			});
		}
	}

	return { ordersPurged: purged.count, orderPdfsDeleted, ordersHasMore };
}

export async function hardDeleteExpiredRecords(): Promise<CronResult> {
	logger.info("Starting 10-year retention cleanup", { cronJob: "hard-delete-retention" });

	const deadline = Date.now() + BATCH_DEADLINE_MS;

	const retentionDate = new Date();
	retentionDate.setFullYear(retentionDate.getFullYear() - RETENTION.LEGAL_RETENTION_YEARS);

	logger.info("Deleting records soft-deleted before cutoff", {
		cronJob: "hard-delete-retention",
		retentionDate: retentionDate.toISOString(),
	});

	const retentionWhere = { deletedAt: { lt: retentionDate } };

	// 0. Purge PII from orders past 10-year retention (row kept, PII scrubbed + PDFs deleted).
	// Runs first so the compliance-critical DB scrub always commits, even if the
	// media-deletion steps below skip on deadline. Cf. RGPD-AUDIT F2.
	const { ordersPurged, orderPdfsDeleted, ordersHasMore } = await purgeExpiredOrderPii(
		deadline,
		retentionDate,
	);

	// 1. Find IDs to delete (batched to prevent timeout)
	const [reviewIds, productIds] = await Promise.all([
		prisma.productReview.findMany({
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
		ordersHasMore ||
		reviewIds.length === BATCH_SIZE_LARGE ||
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
	const [reviewsResult, productsResult] = await prisma.$transaction(
		async (tx) => {
			const reviews = await tx.productReview.deleteMany({
				where: { id: { in: reviewIds.map((r) => r.id) } },
			});
			const products = await tx.product.deleteMany({
				where: { id: { in: productIds.map((p) => p.id) } },
			});
			return [reviews, products] as const;
		},
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);

	logger.info("DB transaction completed", {
		cronJob: "hard-delete-retention",
		reviewsDeleted: reviewsResult.count,
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

	// 5. Delete UploadThing files after DB transaction succeeds
	// Non-blocking: if UploadThing fails, orphaned files will be cleaned by cleanup-orphan-media
	if (Date.now() > deadline) {
		logger.warn(
			"Approaching timeout, skipping UploadThing cleanup (will be handled by cleanup-orphan-media)",
			{ cronJob: "hard-delete-retention" },
		);
		return {
			processed: productsResult.count + reviewsResult.count + ordersPurged,
			errored: 0,
			skipped: 0,
			productsDeleted: productsResult.count,
			reviewsDeleted: reviewsResult.count,
			ordersPurged,
			orderPdfsDeleted,
			uploadthingSkipped: true,
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
		} catch (_error) {
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
		} catch (_error) {
			logger.warn("Failed to delete product media from UploadThing", {
				cronJob: "hard-delete-retention",
			});
		}
	}

	logger.info("Retention cleanup completed", { cronJob: "hard-delete-retention" });

	return {
		processed: productsResult.count + reviewsResult.count + ordersPurged,
		errored: 0,
		skipped: 0,
		productsDeleted: productsResult.count,
		reviewsDeleted: reviewsResult.count,
		ordersPurged,
		orderPdfsDeleted,
		hasMore,
	};
}
