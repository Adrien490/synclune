import { Prisma, HistorySource } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { updateTag } from "next/cache";
import { getOrderInvalidationTags } from "../constants/cache";
import { createOrderAuditTx } from "../utils/order-audit";

interface PersistInvoiceNumberResult {
	invoiceNumber: string;
	invoiceGeneratedAt: Date;
}

interface PersistInvoiceNumberOptions {
	source?: HistorySource;
	authorId?: string;
	authorName?: string;
}

/**
 * P99 vs race window compromise: 5 attempts cover the practical concurrent-write
 * window for invoice generation while keeping tail latency under control.
 */
const MAX_RETRIES = 5;

/**
 * 32-bit advisory lock key for invoice generation, derived from the current
 * year (e.g. 1002026 for 2026). Keeps lock scope bounded to year + handles
 * the empty-table case (1st invoice of year) that FOR UPDATE alone cannot.
 */
function invoiceAdvisoryLockKey(year: number): number {
	return 1_000_000 + year;
}

/**
 * Generates a sequential invoice number (format `F-YYYY-NNNNN`) AND persists it
 * on the order, in a single atomic transaction (Article 286 CGI — séquentiel,
 * immuable, sans trou).
 *
 * Concurrency strategy :
 * - `pg_advisory_xact_lock(year)` Postgres advisory lock acquired first.
 *   This handles the empty-table case at the start of a new year, where a
 *   bare `SELECT ... FOR UPDATE LIMIT 1` would acquire no lock (no row matches).
 * - SELECT highest existing invoice for the year inside the same tx.
 * - UPDATE the order with the new number inside the same tx.
 * - On P2002 unique violation (rare cross-tx collision), retry the full tx
 *   up to MAX_RETRIES times.
 *
 * Returns the new invoice fields, or null if generation fails after retries.
 */
export async function persistInvoiceNumber(
	orderId: string,
	userId: string | null,
	options: PersistInvoiceNumberOptions = {},
): Promise<PersistInvoiceNumberResult | null> {
	const { source = HistorySource.SYSTEM, authorId, authorName } = options;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const result = await prisma.$transaction(async (tx) => {
				const year = new Date().getFullYear();
				const prefix = `F-${year}-`;

				// Advisory lock — serializes invoice generation per year, even when
				// no row exists yet (first invoice of the year).
				await tx.$executeRaw(
					Prisma.sql`SELECT pg_advisory_xact_lock(${invoiceAdvisoryLockKey(year)})`,
				);

				const lastRow = await tx.$queryRaw<Array<{ invoiceNumber: string | null }>>(
					Prisma.sql`SELECT "invoiceNumber" FROM "Order"
						WHERE "invoiceNumber" LIKE ${prefix + "%"}
						ORDER BY "invoiceNumber" DESC
						LIMIT 1`,
				);

				let nextSequence = 1;
				const lastInvoiceNumber = lastRow[0]?.invoiceNumber;
				if (lastInvoiceNumber) {
					const lastSequence = parseInt(lastInvoiceNumber.slice(prefix.length), 10);
					if (!isNaN(lastSequence)) {
						nextSequence = lastSequence + 1;
					}
				}

				const invoiceNumber = `${prefix}${String(nextSequence).padStart(5, "0")}`;
				const now = new Date();

				const updated = await tx.order.update({
					where: { id: orderId },
					data: {
						invoiceNumber,
						invoiceStatus: "GENERATED",
						invoiceGeneratedAt: now,
					},
					select: { invoiceNumber: true, invoiceGeneratedAt: true },
				});

				// Audit trail (Art. L123-22 Code de Commerce) — la génération de
				// facture est une mutation critique qui doit apparaître dans la
				// timeline OrderHistory au même titre que les transitions de statut.
				await createOrderAuditTx(tx, {
					orderId,
					action: "INVOICE_GENERATED",
					authorId,
					authorName,
					source,
					note: `Facture ${invoiceNumber} générée`,
					metadata: {
						invoiceNumber,
						invoiceGeneratedAt: now.toISOString(),
					},
				});

				return updated;
			});

			getOrderInvalidationTags(userId ?? undefined, orderId).forEach((tag) => updateTag(tag));

			return {
				invoiceNumber: result.invoiceNumber!,
				invoiceGeneratedAt: result.invoiceGeneratedAt!,
			};
		} catch (e) {
			if (
				e instanceof Prisma.PrismaClientKnownRequestError &&
				e.code === "P2002" &&
				attempt < MAX_RETRIES - 1
			) {
				continue;
			}
			logger.error("Failed to persist invoice number", e, {
				service: "persist-invoice-number",
				attempt,
			});
			return null;
		}
	}

	return null;
}
