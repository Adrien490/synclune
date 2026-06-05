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
 * Never-paid orders (abandoned/cancelled checkouts, paidAt IS NULL) carry no invoice
 * and so are NEVER reached by the paidAt-keyed purge above; their operational PII is
 * scrubbed on a separate, shorter window by `purgeAbandonedOrderPii` (RGPD-AUDIT F-A).
 *
 * Tables handled:
 * - Product (and ProductSku, SkuMedia, etc. via cascade) — hard delete
 * - ProductReview, ReviewResponse, ReviewMedia (via cascade) — hard delete
 * - Order (paid) — PII purge only (row kept, PII scrubbed, invoice/credit-note PDFs deleted)
 * - Order (never paid) — customer/shipping PII purge past the unpaid-retention window
 */

/**
 * PII scrub payload applied to orders past the 10-year legal retention.
 *
 * Exported for the regression test `purge-pii-scrub-contract` which locks both
 * halves of the invariant: (a) the PII surfaces (billing, invoice snapshot,
 * archived PDF pointers) ARE scrubbed (RGPD Art. 5.1.e once the legal basis
 * expires), and (b) the non-PII accounting fields (invoiceNumber,
 * creditNoteNumber, total, subtotal, taxAmount, paidAt) are NEVER in this
 * payload (Art. L123-22 — the accounting row survives).
 */
/**
 * Operational PII (admin UI, shipping labels, customer space). Scrubbed by BOTH the
 * 10-year paid-order purge (`ORDER_PII_SCRUB`) and the unpaid-order purge
 * (`UNPAID_ORDER_PII_SCRUB`, RGPD-AUDIT F-A). Single source so the two payloads never
 * drift apart.
 */
const CUSTOMER_SHIPPING_PII_SCRUB = {
	// customerEmail n'a pas de contrainte UNIQUE → une constante suffit (≠ anonymisation
	// compte qui dérive l'email du userId). Cf. RGPD-AUDIT F2.
	customerEmail: "purge-10y@deleted.synclune.local",
	customerName: "Client supprimé",
	customerPhone: null,
	// F4 (RGPD-PII-AUDIT 2026-05-30) : aligné sur l'anonymisation compte
	// (anonymize-user.service nulle déjà ce champ). `cus_xxx` est un identifiant
	// pseudonyme rattachable à une personne via Stripe — il doit disparaître à la
	// purge comme à l'anonymisation, sinon une commande invité jamais anonymisée
	// le conserverait au-delà des 10 ans.
	stripeCustomerId: null,
	shippingFirstName: "X",
	shippingLastName: "X",
	shippingAddress1: "Adresse supprimée",
	shippingAddress2: null,
	shippingPostalCode: "00000",
	shippingCity: "Supprimé",
	shippingPhone: "0000000000",
} as const;

export const ORDER_PII_SCRUB = {
	...CUSTOMER_SHIPPING_PII_SCRUB,
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
 * Operational-PII scrub for orders that were NEVER paid (paidAt IS NULL). No invoice
 * exists, so there is nothing legal to preserve — only `customer*`/`shipping*` carry
 * PII (billing fields, snapshot and PDF are empty on unpaid orders). Cf. RGPD-AUDIT F-A.
 */
const UNPAID_ORDER_PII_SCRUB = {
	...CUSTOMER_SHIPPING_PII_SCRUB,
} as const;

/**
 * Purges PII from orders whose 10-year legal retention has elapsed (paidAt + 10y).
 *
 * The order row is KEPT (Art. L123-22 — numéros/montants/dates non-PII), only the
 * personal data is scrubbed and the archived invoice/credit-note PDFs are deleted.
 * Idempotent via the `piiPurgedAt` sentinel. Self-bounded by `BATCH_SIZE_LARGE`.
 *
 * ⚠️ ORDER OF OPERATIONS (RGPD-AUDIT F-B): the archived PDFs ARE the most sensitive
 * PII (buyer identity), so we delete them FIRST and only then scrub the DB row +
 * stamp `piiPurgedAt`. If PDF deletion fails or is skipped near the deadline we do
 * NOT scrub: the row keeps its pointers and `piiPurgedAt = NULL`, so the next monthly
 * run retries. Scrubbing first would null the pointers and lose the file reference
 * forever (and `cleanup-orphan-media` — the previously-assumed safety net — is a
 * retired cron, so this job is the ONLY deleter of these PDFs).
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

	// 1. Delete the archived PDFs FIRST so we never null the DB pointer before the
	// file is actually gone. Only a fully-clean deletion authorises the scrub below.
	let orderPdfsDeleted = 0;
	let pdfsCleared = true;
	if (pdfUrls.length > 0) {
		if (Date.now() > deadline) {
			pdfsCleared = false; // near deadline — defer the whole batch to next run
		} else {
			try {
				const result = await deleteUploadThingFilesFromUrls(pdfUrls);
				orderPdfsDeleted = result.deleted;
				// Any file we couldn't delete → defer the scrub (don't lose the pointer).
				if (result.failed > 0) {
					pdfsCleared = false;
				}
				logger.info("Deleted invoice/credit-note PDFs from UploadThing", {
					cronJob: "hard-delete-retention",
					count: result.deleted,
				});
			} catch (_error) {
				pdfsCleared = false;
				logger.error("Failed to delete invoice/credit-note PDFs — deferring PII scrub", _error, {
					cronJob: "hard-delete-retention",
					orderCount: orderIds.length,
				});
			}
		}
	}

	if (!pdfsCleared) {
		// Leave `piiPurgedAt = NULL` + pointers intact so the next run retries both the
		// file deletion and the column scrub together (compliance-consistent).
		logger.warn("Order PII scrub deferred — PDF deletion incomplete, will retry next run", {
			cronJob: "hard-delete-retention",
			ordersDeferred: orderIds.length,
		});
		return { ordersPurged: 0, orderPdfsDeleted, ordersHasMore };
	}

	// 2. Scrub PII + drop PDF pointers in a single transaction (compliance-critical).
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

	return { ordersPurged: purged.count, orderPdfsDeleted, ordersHasMore };
}

/**
 * Purges operational PII from orders that were NEVER paid (paidAt IS NULL) past
 * `UNPAID_ORDER_PII_RETENTION_DAYS`. Cf. RGPD-AUDIT F-A.
 *
 * Such orders (abandoned/cancelled/failed checkouts) carry no invoice, so the
 * `paidAt`-keyed 10-year purge never reaches them and the row is never hard-deleted —
 * their `customer*`/`shipping*` PII would otherwise be retained forever (RGPD
 * Art. 5.1.e). No status filter: at this age (default 3y) a still-unpaid order is
 * definitively dead (async payments cap out at 10 days), so the PII must go whatever
 * the status. Reuses the `piiPurgedAt` sentinel for idempotence. No PDF handling —
 * unpaid orders have no archived invoice.
 */
async function purgeAbandonedOrderPii(
	cutoff: Date,
): Promise<{ abandonedOrdersPurged: number; abandonedHasMore: boolean }> {
	const orders = await prisma.order.findMany({
		where: { paidAt: null, createdAt: { lt: cutoff }, piiPurgedAt: null },
		select: { id: true },
		take: BATCH_SIZE_LARGE,
	});

	if (orders.length === 0) {
		return { abandonedOrdersPurged: 0, abandonedHasMore: false };
	}

	const abandonedHasMore = orders.length === BATCH_SIZE_LARGE;
	const orderIds = orders.map((o) => o.id);

	const purged = await prisma.$transaction(
		async (tx) =>
			tx.order.updateMany({
				where: { id: { in: orderIds }, paidAt: null, piiPurgedAt: null },
				data: { ...UNPAID_ORDER_PII_SCRUB, piiPurgedAt: new Date() },
			}),
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);

	logger.info("Unpaid-order PII purged past retention window", {
		cronJob: "hard-delete-retention",
		abandonedOrdersPurged: purged.count,
	});

	return { abandonedOrdersPurged: purged.count, abandonedHasMore };
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

	// 0a. Purge PII from PAID orders past 10-year retention (row kept, PII scrubbed +
	// PDFs deleted). Runs first so the compliance-critical scrub gets the most runway.
	// Cf. RGPD-AUDIT F2 / F-B.
	//
	// F5 (RGPD-PII-AUDIT 2026-05-30) : on draine PLUSIEURS batchs par run (borné par le
	// deadline) au lieu d'un seul. Un seul batch/mois (BATCH_SIZE_LARGE) ferait accumuler
	// un retard permanent dès que le volume mensuel échu dépasse la taille de batch →
	// PII conservée au-delà des 10 ans (RGPD Art. 5.1.e). On sort dès que tout est drainé
	// OU qu'un batch n'a rien purgé (lot différé : suppression PDF échouée / deadline) pour
	// ne pas boucler indéfiniment sur le même lot bloquant — il sera retenté au run suivant.
	let ordersPurged = 0;
	let orderPdfsDeleted = 0;
	let ordersHasMore = false;
	while (Date.now() <= deadline) {
		const batch = await purgeExpiredOrderPii(deadline, retentionDate);
		ordersPurged += batch.ordersPurged;
		orderPdfsDeleted += batch.orderPdfsDeleted;
		ordersHasMore = batch.ordersHasMore;
		if (!batch.ordersHasMore || batch.ordersPurged === 0) break;
	}

	// 0b. Purge operational PII from NEVER-PAID orders (abandoned/cancelled checkouts)
	// past `UNPAID_ORDER_PII_RETENTION_DAYS` — these never reach the paidAt-keyed purge
	// above and are never hard-deleted. Cf. RGPD-AUDIT F-A. F5 : même boucle de drainage.
	const unpaidPiiCutoff = new Date(
		Date.now() - RETENTION.UNPAID_ORDER_PII_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	);
	let abandonedOrdersPurged = 0;
	let abandonedHasMore = false;
	while (Date.now() <= deadline) {
		const batch = await purgeAbandonedOrderPii(unpaidPiiCutoff);
		abandonedOrdersPurged += batch.abandonedOrdersPurged;
		abandonedHasMore = batch.abandonedHasMore;
		if (!batch.abandonedHasMore || batch.abandonedOrdersPurged === 0) break;
	}

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
		abandonedHasMore ||
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
			processed: productsResult.count + reviewsResult.count + ordersPurged + abandonedOrdersPurged,
			errored: 0,
			skipped: 0,
			productsDeleted: productsResult.count,
			reviewsDeleted: reviewsResult.count,
			ordersPurged,
			abandonedOrdersPurged,
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
		processed: productsResult.count + reviewsResult.count + ordersPurged + abandonedOrdersPurged,
		errored: 0,
		skipped: 0,
		productsDeleted: productsResult.count,
		reviewsDeleted: reviewsResult.count,
		ordersPurged,
		abandonedOrdersPurged,
		orderPdfsDeleted,
		hasMore,
	};
}
