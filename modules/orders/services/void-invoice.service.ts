import { Prisma, OrderAction, InvoiceStatus } from "@/app/generated/prisma/client";
import type { HistorySource } from "@/app/generated/prisma/client";
import { BusinessError } from "@/shared/lib/actions/business-error";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { updateTag } from "next/cache";
import { getOrderInvalidationTags } from "../constants/cache";
import { createOrderAuditTx } from "../utils/order-audit";

interface VoidInvoiceResult {
	creditNoteNumber: string;
	creditNoteGeneratedAt: Date;
	invoiceVoidedAt: Date;
}

interface VoidInvoiceParams {
	orderId: string;
	authorId: string | null;
	authorName: string;
	source: HistorySource;
	reason?: string;
}

/**
 * Same retry/lock strategy than persistInvoiceNumber (Art. 286 CGI :
 * séquentialité, gap-free, unicité). Voir persist-invoice-number.service.ts
 * pour la justification détaillée.
 */
const MAX_RETRIES = 5;

/**
 * CHECK constraint DB (`Order_creditNoteNumber_format_check`) impose
 * `^A-[0-9]{4}-[0-9]{5}$` → 99 999 avoirs/an max. Voir l'équivalent
 * `MAX_SEQUENCE_PER_YEAR` dans `persist-invoice-number.service.ts`.
 */
const MAX_SEQUENCE_PER_YEAR = 99_999;

/**
 * Clé Postgres advisory lock pour les avoirs (offset distinct de la facture
 * pour ne pas sérialiser facture + avoir mutuellement).
 */
function creditNoteAdvisoryLockKey(year: number): number {
	return 2_000_000 + year;
}

/**
 * Marque la facture d'une commande comme VOIDED + émet un avoir (credit note)
 * avec son propre numéro séquentiel "A-YYYY-NNNNN", dans une transaction atomique.
 *
 * À appeler depuis :
 *   - cancel-order (commande annulée après émission facture)
 *   - mark-as-fully-refunded (remboursement total après émission facture)
 *   - handler webhook charge.refunded (refund total côté Stripe)
 *
 * Idempotent : noop si la facture est déjà VOIDED.
 * Retourne null si l'order n'a pas de invoiceNumber (rien à annuler) ou si
 * la persistance échoue après MAX_RETRIES.
 *
 * Cf. audit conformité 2026-05-27 — ORD-COMPLY-003
 */
export async function voidInvoice(params: VoidInvoiceParams): Promise<VoidInvoiceResult | null> {
	const { orderId, authorId, authorName, source, reason } = params;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const result = await prisma.$transaction(async (tx) => {
				const order = await tx.order.findUnique({
					where: { id: orderId },
					select: {
						id: true,
						userId: true,
						invoiceNumber: true,
						invoiceStatus: true,
						invoiceVoidedAt: true,
						creditNoteNumber: true,
					},
				});

				if (!order) {
					return { kind: "missing" as const };
				}

				if (!order.invoiceNumber || order.invoiceStatus !== InvoiceStatus.GENERATED) {
					return { kind: "no-active-invoice" as const };
				}

				// Le check `invoiceStatus !== GENERATED` ligne précédente attrape déjà
				// VOIDED, donc seul `creditNoteNumber` reste possible (race émission avoir).
				if (order.creditNoteNumber) {
					return {
						kind: "already-voided" as const,
						creditNoteNumber: order.creditNoteNumber,
					};
				}

				const year = new Date().getFullYear();
				const prefix = `A-${year}-`;

				await tx.$executeRaw(
					Prisma.sql`SELECT pg_advisory_xact_lock(${creditNoteAdvisoryLockKey(year)})`,
				);

				const lastRow = await tx.$queryRaw<Array<{ creditNoteNumber: string | null }>>(
					Prisma.sql`SELECT "creditNoteNumber" FROM "Order"
						WHERE "creditNoteNumber" LIKE ${prefix + "%"}
						ORDER BY "creditNoteNumber" DESC
						LIMIT 1`,
				);

				let nextSequence = 1;
				const lastNumber = lastRow[0]?.creditNoteNumber;
				if (lastNumber) {
					const parsed = parseInt(lastNumber.slice(prefix.length), 10);
					if (!isNaN(parsed)) {
						nextSequence = parsed + 1;
					}
				}

				if (nextSequence > MAX_SEQUENCE_PER_YEAR) {
					throw new BusinessError(
						`Séquence avoir saturée pour l'année ${year} (limite ${MAX_SEQUENCE_PER_YEAR}). ` +
							`Étendre la regex CHECK DB à 6 chiffres avant nouvelle émission.`,
						"CREDIT_NOTE_SEQUENCE_OVERFLOW",
					);
				}

				const creditNoteNumber = `${prefix}${String(nextSequence).padStart(5, "0")}`;
				const now = new Date();

				const updated = await tx.order.update({
					where: { id: orderId },
					data: {
						invoiceStatus: InvoiceStatus.VOIDED,
						invoiceVoidedAt: now,
						creditNoteNumber,
						creditNoteGeneratedAt: now,
					},
					select: {
						invoiceVoidedAt: true,
						creditNoteNumber: true,
						creditNoteGeneratedAt: true,
						userId: true,
					},
				});

				await createOrderAuditTx(tx, {
					orderId,
					action: OrderAction.INVOICE_VOIDED,
					authorId: authorId ?? undefined,
					authorName,
					source,
					note: reason,
					metadata: {
						invoiceNumber: order.invoiceNumber,
						creditNoteNumber,
					},
				});

				return { kind: "voided" as const, updated };
			});

			if (result.kind === "missing") {
				logger.warn(`voidInvoice — order not found: ${orderId}`, { service: "void-invoice" });
				return null;
			}

			if (result.kind === "no-active-invoice") {
				logger.info(`voidInvoice — order ${orderId} has no active invoice to void (noop)`, {
					service: "void-invoice",
				});
				return null;
			}

			if (result.kind === "already-voided") {
				logger.info(
					`voidInvoice — order ${orderId} already VOIDED (credit note ${result.creditNoteNumber}) — idempotent skip`,
					{ service: "void-invoice" },
				);
				return null;
			}

			const { updated } = result;
			getOrderInvalidationTags(updated.userId ?? undefined, orderId).forEach((tag) =>
				updateTag(tag),
			);

			return {
				creditNoteNumber: updated.creditNoteNumber!,
				creditNoteGeneratedAt: updated.creditNoteGeneratedAt!,
				invoiceVoidedAt: updated.invoiceVoidedAt!,
			};
		} catch (e) {
			if (
				e instanceof Prisma.PrismaClientKnownRequestError &&
				e.code === "P2002" &&
				attempt < MAX_RETRIES - 1
			) {
				continue;
			}
			logger.error("Failed to void invoice", e, {
				service: "void-invoice",
				orderId,
				attempt,
			});
			return null;
		}
	}

	return null;
}
