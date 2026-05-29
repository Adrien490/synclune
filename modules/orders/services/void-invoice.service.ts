import { Prisma, OrderAction, InvoiceStatus, HistorySource } from "@/app/generated/prisma/client";
import { BusinessError } from "@/shared/lib/actions/business-error";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { updateTag } from "next/cache";
import {
	sendAdminCreditNoteFailedAlert,
	sendAdminSequenceOverflowAlert,
} from "@/modules/emails/services/admin-emails";
import { nextCreditNoteNumberTx } from "@/modules/invoices/services/credit-note-sequence.service";
import { getParisDateParts } from "@/shared/utils/timezone";
import { getOrderInvalidationTags } from "../constants/cache";
import { createOrderAudit, createOrderAuditTx } from "../utils/order-audit";

/**
 * Trace audit immuable + alerte admin pour échec emission avoir. Best-effort,
 * jamais bloquant. Le flag `invoiceRetryDeferred=true` permet au cron
 * `reconcile-invoices` (passe 3) de rejouer. Cf. audit monitoring 2026-05-28
 * EINV-OPS-003 / EINV-OPS-004.
 */
async function flagCreditNoteFailure(orderId: string, errorMessage: string): Promise<void> {
	try {
		const order = await prisma.order.update({
			where: { id: orderId },
			data: { invoiceRetryDeferred: true },
			select: { orderNumber: true, invoiceNumber: true },
		});

		await createOrderAudit({
			orderId,
			action: OrderAction.CREDIT_NOTE_FAILED,
			source: HistorySource.SYSTEM,
			authorName: "Système (void-invoice)",
			note: `Émission avoir échouée — flag invoiceRetryDeferred posé (cron reconcile-invoices rejouera)`,
			metadata: {
				invoiceNumber: order.invoiceNumber ?? undefined,
				errorMessage: errorMessage.slice(0, 500),
				deferredAt: new Date().toISOString(),
			},
		});

		if (order.invoiceNumber) {
			await sendAdminCreditNoteFailedAlert({
				orderId,
				orderNumber: order.orderNumber,
				invoiceNumber: order.invoiceNumber,
				errorMessage,
			});
		}
	} catch (sideEffectError) {
		logger.error("flagCreditNoteFailure threw — alert/audit partial", sideEffectError, {
			service: "void-invoice",
			orderId,
		});
	}
}

/**
 * Discriminated union — distingue les 3 issues fonctionnelles pour permettre
 * aux callers d'alerter Sentry uniquement sur `failed` (cf EINV-CREDIT-008
 * audit avoirs 2026-05-28 : MAX_RETRIES atteint = facture stale post-refund).
 */
export type VoidInvoiceResult =
	| {
			kind: "voided";
			creditNoteNumber: string;
			creditNoteGeneratedAt: Date;
			invoiceVoidedAt: Date;
	  }
	| {
			kind: "noop";
			reason: "missing" | "no-active-invoice" | "already-voided";
			creditNoteNumber?: string;
	  }
	| {
			kind: "failed";
			error: string;
	  };

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
 * Marque la facture d'une commande comme VOIDED + émet un avoir (credit note)
 * avec son propre numéro séquentiel "A-YYYY-NNNNN", dans une transaction atomique.
 *
 * À appeler depuis :
 *   - cancel-order (commande annulée après émission facture)
 *   - mark-as-fully-refunded (remboursement total après émission facture)
 *   - handler webhook charge.refunded (refund total côté Stripe)
 *
 * Retourne un discriminated union (cf `VoidInvoiceResult`) — les callers
 * doivent alerter Sentry sur `kind === "failed"` quand `paymentStatus` est
 * passé à REFUNDED (facture comptablement stale).
 *
 * Cf. audits ORD-COMPLY-003 (2026-05-27) + EINV-CREDIT-008 (2026-05-28)
 */
export async function voidInvoice(params: VoidInvoiceParams): Promise<VoidInvoiceResult> {
	const { orderId, authorId, authorName, source, reason } = params;

	let lastError: unknown = null;

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

				// Séquence A-YYYY partagée Order ∪ Refund via helper SSOT
				// (advisory lock 2_000_000+year + lookup UNION). Garantit l'unicité
				// cross-table que les CHECK/UNIQUE par table ne couvrent pas
				// (EINV-PRISMA-001).
				// Millésime dérivé de l'heure de Paris (pas UTC) : un void à
				// 2026-12-31 23:30 UTC = 2027-01-01 Paris doit porter A-2027,
				// cohérent avec la numérotation facture (EINV-SEQ-002 / Art. 286).
				const now = new Date();
				const year = getParisDateParts(now).year;
				const creditNoteNumber = await nextCreditNoteNumberTx(tx, year);

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

				return { kind: "voided-tx" as const, updated };
			});

			if (result.kind === "missing") {
				logger.warn(`voidInvoice — order not found: ${orderId}`, { service: "void-invoice" });
				return { kind: "noop", reason: "missing" };
			}

			if (result.kind === "no-active-invoice") {
				logger.info(`voidInvoice — order ${orderId} has no active invoice to void (noop)`, {
					service: "void-invoice",
				});
				return { kind: "noop", reason: "no-active-invoice" };
			}

			if (result.kind === "already-voided") {
				logger.info(
					`voidInvoice — order ${orderId} already VOIDED (credit note ${result.creditNoteNumber}) — idempotent skip`,
					{ service: "void-invoice" },
				);
				return {
					kind: "noop",
					reason: "already-voided",
					creditNoteNumber: result.creditNoteNumber,
				};
			}

			const { updated } = result;
			getOrderInvalidationTags(updated.userId ?? undefined, orderId).forEach((tag) =>
				updateTag(tag),
			);

			return {
				kind: "voided",
				creditNoteNumber: updated.creditNoteNumber!,
				creditNoteGeneratedAt: updated.creditNoteGeneratedAt!,
				invoiceVoidedAt: updated.invoiceVoidedAt!,
			};
		} catch (e) {
			lastError = e;
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
			const errorMessage = e instanceof Error ? e.message : String(e);
			if (e instanceof BusinessError && e.code === "CREDIT_NOTE_SEQUENCE_OVERFLOW") {
				await sendAdminSequenceOverflowAlert({
					year: getParisDateParts(new Date()).year,
					documentType: "credit-note",
				}).catch((alertError) =>
					logger.error("sendAdminSequenceOverflowAlert threw", alertError, {
						service: "void-invoice",
						orderId,
					}),
				);
			}
			await flagCreditNoteFailure(orderId, errorMessage);
			return {
				kind: "failed",
				error: errorMessage,
			};
		}
	}

	const exhaustedMessage =
		lastError instanceof Error ? lastError.message : String(lastError ?? "MAX_RETRIES exceeded");
	await flagCreditNoteFailure(orderId, exhaustedMessage);
	return {
		kind: "failed",
		error: exhaustedMessage,
	};
}
