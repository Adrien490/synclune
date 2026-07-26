import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { TX_MAX_WAIT_LONG, TX_TIMEOUT_LONG } from "@/shared/lib/prisma-tx-options";
import { logger } from "@/shared/lib/logger";
import { deleteUploadThingFilesFromUrls } from "@/modules/media/services/delete-uploadthing-files.service";
import { BATCH_DEADLINE_MS, BATCH_SIZE_LARGE, RETENTION } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import {
	ORDER_PII_SCRUB,
	PURGED_ORDER_NOTE_CONTENT,
	REFUND_PII_SCRUB,
	UNPAID_ORDER_PII_SCRUB,
} from "@/modules/orders/constants/pii-scrub";
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
 * - Refund — per-refund credit-note PDFs deleted + pointers/note scrubbed with the parent order
 * - OrderNote — free-text content scrubbed with the parent order (row + staff author kept)
 * - Order (never paid) — customer/shipping PII purge past the unpaid-retention window
 *
 * Scrub payloads (ORDER_PII_SCRUB, UNPAID_ORDER_PII_SCRUB, REFUND_PII_SCRUB) live in
 * `modules/orders/constants/pii-scrub.ts` (SSOT, contrat verrouillé par le test
 * `purge-pii-scrub-contract.regression.test.ts`).
 */

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
 * run retries. Scrubbing first would null the pointers and risk losing the file
 * reference. This job is the PRIMARY deleter of these PDFs; `cleanup-orphan-media`
 * (mensuel, actif) protège les PDF encore pointés (RGPD-AUDIT F-C) et ne sert de
 * filet qu'aux fichiers dont le pointeur est déjà nullé.
 *
 * Les avoirs PARTIELS (`Refund.creditNotePdfUrl`, un par refund COMPLETED) portent
 * la même identité acheteur que la facture : leurs fichiers sont supprimés dans le
 * même lot et leurs pointeurs + note libre scrubés dans la même transaction
 * (REFUND_PII_SCRUB). Les `OrderNote.content` (texte libre, PII potentielle) sont
 * remplacés par `PURGED_ORDER_NOTE_CONTENT`.
 */
async function purgeExpiredOrderPii(
	deadline: number,
	retentionDate: Date,
): Promise<{
	ordersPurged: number;
	orderPdfsDeleted: number;
	ordersHasMore: boolean;
	// true UNIQUEMENT quand la suppression des PDF a ÉCHOUÉ (≠ report pour deadline) :
	// la base légale a expiré mais le scrub RGPD reste bloqué. Remonté en `errored`
	// par l'appelant pour déclencher l'alerte admin (G3) — sinon échec silencieux.
	pdfDeletionFailed: boolean;
}> {
	const orders = await prisma.order.findMany({
		where: { paidAt: { lt: retentionDate }, piiPurgedAt: null },
		select: {
			id: true,
			invoicePdfUrl: true,
			creditNotePdfUrl: true,
			// Avoirs partiels par-refund : même identité acheteur, même échéance.
			refunds: { select: { creditNotePdfUrl: true } },
		},
		take: BATCH_SIZE_LARGE,
	});

	if (orders.length === 0) {
		return { ordersPurged: 0, orderPdfsDeleted: 0, ordersHasMore: false, pdfDeletionFailed: false };
	}

	const ordersHasMore = orders.length === BATCH_SIZE_LARGE;
	const orderIds = orders.map((o) => o.id);
	const pdfUrls = orders.flatMap((o) =>
		[o.invoicePdfUrl, o.creditNotePdfUrl, ...o.refunds.map((r) => r.creditNotePdfUrl)].filter(
			(u): u is string => u !== null,
		),
	);

	// 1. Delete the archived PDFs FIRST so we never null the DB pointer before the
	// file is actually gone. Only a fully-clean deletion authorises the scrub below.
	let orderPdfsDeleted = 0;
	let pdfsCleared = true;
	// Distingue le report « deadline » (attendu, reprise au prochain run) du report
	// « échec suppression PDF » (anormal → doit alerter l'admin, G3).
	let pdfDeletionFailed = false;
	if (pdfUrls.length > 0) {
		if (Date.now() > deadline) {
			pdfsCleared = false; // near deadline — defer the whole batch to next run
		} else {
			try {
				// Seul effaceur légitime des archives fiscales : la rétention légale de
				// 10 ans est échue (Art. L102 B LPF). La garde par défaut du service
				// bloque tous les autres chemins (audit média M7).
				const result = await deleteUploadThingFilesFromUrls(pdfUrls, {
					allowFiscalArchives: true,
				});
				orderPdfsDeleted = result.deleted;
				// Any file we couldn't delete → defer the scrub (don't lose the pointer).
				if (result.failed > 0) {
					pdfsCleared = false;
					pdfDeletionFailed = true;
				}
				logger.info("Deleted invoice/credit-note PDFs from UploadThing", {
					cronJob: "hard-delete-retention",
					count: result.deleted,
				});
			} catch (_error) {
				pdfsCleared = false;
				pdfDeletionFailed = true;
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
		return { ordersPurged: 0, orderPdfsDeleted, ordersHasMore, pdfDeletionFailed };
	}

	// 2. Scrub PII + drop PDF pointers in a single transaction (compliance-critical).
	// Refunds (avoirs partiels + note libre) et OrderNotes (texte libre) des mêmes
	// commandes sont scrubés atomiquement avec la ligne Order : une purge partielle
	// (Order scrubé mais avoir intact) serait invisible au retry (`piiPurgedAt` posé).
	const purged = await prisma.$transaction(
		async (tx) => {
			await tx.refund.updateMany({
				where: { orderId: { in: orderIds } },
				data: { ...REFUND_PII_SCRUB },
			});
			await tx.orderNote.updateMany({
				where: { orderId: { in: orderIds } },
				data: { content: PURGED_ORDER_NOTE_CONTENT },
			});
			return tx.order.updateMany({
				where: { id: { in: orderIds }, piiPurgedAt: null },
				data: { ...ORDER_PII_SCRUB, piiPurgedAt: new Date() },
			});
		},
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);

	logger.info("Order PII purged past 10-year retention", {
		cronJob: "hard-delete-retention",
		ordersPurged: purged.count,
	});

	return { ordersPurged: purged.count, orderPdfsDeleted, ordersHasMore, pdfDeletionFailed: false };
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
 * unpaid orders have no archived invoice. Les identifiants Stripe pseudonymes
 * (`cus_xxx`, `pi_xxx`) partent aussi (UNPAID_ORDER_PII_SCRUB).
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
	// G3 (audit) : compte les batchs dont le scrub RGPD est bloqué par un ÉCHEC de
	// suppression PDF (≠ report deadline). Remonté en `errored` pour que withCronGuard
	// envoie l'alerte admin — sinon une purge PII bloquée passerait inaperçue (le cron
	// renvoyait toujours errored:0). Ré-alerte chaque mois tant que l'échec persiste.
	let pdfPurgeErrors = 0;
	while (Date.now() <= deadline) {
		const batch = await purgeExpiredOrderPii(deadline, retentionDate);
		ordersPurged += batch.ordersPurged;
		orderPdfsDeleted += batch.orderPdfsDeleted;
		ordersHasMore = batch.ordersHasMore;
		if (batch.pdfDeletionFailed) pdfPurgeErrors++;
		if (!batch.ordersHasMore || batch.ordersPurged === 0) break;
	}
	if (pdfPurgeErrors > 0) {
		logger.error(
			"Purge PII 10 ans bloquée par échec suppression PDF — alerte admin requise",
			new Error("hard-delete-retention: PII scrub blocked by PDF deletion failure"),
			{ cronJob: "hard-delete-retention", pdfPurgeErrors },
		);
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
			errored: pdfPurgeErrors,
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
		errored: pdfPurgeErrors,
		skipped: 0,
		productsDeleted: productsResult.count,
		reviewsDeleted: reviewsResult.count,
		ordersPurged,
		abandonedOrdersPurged,
		orderPdfsDeleted,
		hasMore,
	};
}
