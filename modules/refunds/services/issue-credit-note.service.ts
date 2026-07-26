import {
	Prisma,
	OrderAction,
	RefundStatus,
	PaymentStatus,
	InvoiceStatus,
} from "@/app/generated/prisma/client";
import type { HistorySource } from "@/app/generated/prisma/client";
import { BusinessError } from "@/shared/lib/actions/business-error";
import { prisma } from "@/shared/lib/prisma";
import {
	TX_TIMEOUT_LONG,
	TX_MAX_WAIT_LONG,
	RETRYABLE_SEQUENCE_TX_ERROR_CODES,
} from "@/shared/lib/prisma-tx-options";
import { logger } from "@/shared/lib/logger";
import { updateTag } from "next/cache";
import { sendAdminSequenceOverflowAlert } from "@/modules/emails/services/admin-emails";
import {
	acquireCreditNoteLockTx,
	nextCreditNoteNumberTx,
} from "@/modules/invoices/services/credit-note-sequence.service";
import { getParisDateParts } from "@/shared/utils/timezone";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { REFUNDS_CACHE_TAGS } from "../constants/cache";
import { ensureRefundCreditNoteArchived } from "./ensure-credit-note-archived.service";

/**
 * Émet un avoir comptable rattaché à un Refund (Art. 272-I CGI — avoir requis
 * pour TOUT remboursement, partiel ou total, sur facture émise).
 *
 * Distinct de `voidInvoice()` :
 *   - voidInvoice() : full void → passe `Order.invoiceStatus` à VOIDED, écrit
 *     `Order.creditNoteNumber`. Cas refund TOTAL / cancel-order — c'est
 *     `voidInvoice` (Order) qui porte l'avoir canonique d'un remboursement total.
 *   - issueCreditNoteForRefund() : refund PARTIEL uniquement → écrit
 *     `Refund.creditNoteNumber`. La facture reste GENERATED (valide pour la part
 *     non remboursée). Sur un refund total (`paymentStatus=REFUNDED` ou facture
 *     déjà `VOIDED`), ce service NE pose PAS d'avoir : il noop et défère à
 *     `voidInvoice` (EINV-SEQ-001 Option A — sinon deux numéros A-YYYY pour un
 *     seul événement, Art. 272-I/286 CGI).
 *
 * Séquence A-YYYY-NNNNN PARTAGÉE avec Order.creditNoteNumber via le helper SSOT
 * `nextCreditNoteNumberTx` (advisory lock 2_000_000+year + lookup MAX sur
 * l'UNION Order ∪ Refund). C'est le lookup UNION partagé — et NON la contrainte
 * UNIQUE par table — qui garantit l'unicité cross-table : une UNIQUE par table
 * ne détecte pas une collision entre Order.creditNoteNumber et
 * Refund.creditNoteNumber (EINV-PRISMA-001). Le retry P2002 couvre la race
 * intra-table résiduelle.
 *
 * Cf. audit avoirs 2026-05-28 — EINV-CREDIT-001 + EINV-CREDIT-005 + EINV-CREDIT-010
 * + audit Prisma 2026-05-28 — EINV-PRISMA-001
 */
export type IssueCreditNoteResult =
	| {
			kind: "issued";
			creditNoteNumber: string;
			creditNoteGeneratedAt: Date;
	  }
	| {
			kind: "noop";
			reason: "missing" | "already-issued" | "refund-not-completed" | "full-refund-voided-on-order";
			creditNoteNumber?: string;
	  }
	| {
			kind: "failed";
			error: string;
	  };

interface IssueCreditNoteParams {
	refundId: string;
	source: HistorySource;
	authorId?: string | null;
	authorName: string;
}

const MAX_RETRIES = 5;

export async function issueCreditNoteForRefund(
	params: IssueCreditNoteParams,
): Promise<IssueCreditNoteResult> {
	const { refundId, source, authorId, authorName } = params;

	let lastError: unknown = null;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const result = await prisma.$transaction(
				async (tx) => {
					// EINV-SEQ-006 — acquérir le lock avoir AVANT la garde `already-issued`.
					// Sinon TOCTOU : deux émissions concurrentes pour le MÊME refund
					// (admin processRefund + webhook charge.refunded partiel, ou retry)
					// lisent toutes deux `creditNoteNumber=null`, passent la garde, puis se
					// sérialisent dans `nextCreditNoteNumberTx` → la 2e ÉCRASE le numéro
					// posé par la 1re en l'orphelinisant (= gap A-YYYY, Art. 286). Lock pris
					// ici → la re-lecture du refund est sérialisée : la 2e voit le numéro
					// posé par la 1re → noop `already-issued`. Le helper ré-acquiert le même
					// lock xact (idempotent). Millésime = date d'émission (Paris).
					const now = new Date();
					const year = getParisDateParts(now).year;
					await acquireCreditNoteLockTx(tx, year);

					const refund = await tx.refund.findUnique({
						where: { id: refundId },
						select: {
							id: true,
							orderId: true,
							amount: true,
							status: true,
							creditNoteNumber: true,
							order: {
								select: {
									id: true,
									userId: true,
									invoiceNumber: true,
									invoiceStatus: true,
									paymentStatus: true,
								},
							},
						},
					});

					if (!refund) {
						return { kind: "missing" as const };
					}

					if (refund.creditNoteNumber) {
						return {
							kind: "already-issued" as const,
							creditNoteNumber: refund.creditNoteNumber,
						};
					}

					// On n'émet d'avoir que pour un refund effectivement COMPLETED.
					// PENDING/APPROVED ne sont pas comptablement actifs.
					if (refund.status !== RefundStatus.COMPLETED) {
						return { kind: "refund-not-completed" as const };
					}

					// EINV-SEQ-001 (Option A) : sur un remboursement TOTAL, l'avoir
					// canonique est l'avoir d'annulation porté par voidInvoice sur
					// Order.creditNoteNumber. On NE pose donc PAS de second avoir sur le
					// Refund — sinon deux numéros A-YYYY consommés pour un seul événement
					// (avoir fictif, Art. 272-I/286 CGI). Garde centralisée : couvre les
					// chemins process-refund (admin) + reconcile-refunds (cron DLQ) qui
					// appelaient sans garde, en plus du webhook charge.refunded (4c) et de
					// mark-as-fully-refunded déjà gardés côté appelant.
					//   - paymentStatus === REFUNDED : ordre process-refund → webhook
					//     (paymentStatus posé par la tx process-refund avant cet appel).
					//   - invoiceStatus === VOIDED : ordre cancel-order → refund Stripe
					//     (voidInvoice a déjà tourné avant que ce Refund passe COMPLETED).
					if (
						refund.order.paymentStatus === PaymentStatus.REFUNDED ||
						refund.order.invoiceStatus === InvoiceStatus.VOIDED
					) {
						return { kind: "full-refund-on-order" as const };
					}

					// Pas de facture originale → pas d'avoir comptable possible
					// (cas commande payée sans facturation séquentielle).
					if (!refund.order.invoiceNumber) {
						return { kind: "missing" as const };
					}

					// Séquence A-YYYY partagée Order ∪ Refund via helper SSOT
					// (advisory lock 2_000_000+year + lookup UNION) — unicité
					// cross-table garantie (EINV-PRISMA-001). Le lock a déjà été pris
					// ci-dessus (EINV-SEQ-006) ; `nextCreditNoteNumberTx` le ré-acquiert
					// (no-op xact) puis lit le MAX.
					const creditNoteNumber = await nextCreditNoteNumberTx(tx, year);

					const updated = await tx.refund.update({
						where: { id: refundId },
						data: {
							creditNoteNumber,
							creditNoteGeneratedAt: now,
						},
						select: {
							creditNoteNumber: true,
							creditNoteGeneratedAt: true,
						},
					});

					await createOrderAuditTx(tx, {
						orderId: refund.order.id,
						action: OrderAction.CREDIT_NOTE_GENERATED,
						authorId: authorId ?? undefined,
						authorName,
						source,
						note: `Avoir ${creditNoteNumber} émis pour le remboursement ${refundId} (montant ${(refund.amount / 100).toFixed(2)} €).`,
						metadata: {
							refundId,
							creditNoteNumber,
							invoiceNumber: refund.order.invoiceNumber,
							amount: refund.amount,
						},
					});

					return {
						kind: "issued-tx" as const,
						updated,
						orderUserId: refund.order.userId,
						orderId: refund.order.id,
					};
				},
				{
					// L'attente sur l'advisory lock avoir (clé 2_000_000+year, partagée
					// avec void-invoice) compte dans le timeout de la tx interactive
					// (défaut 5s) — 30s absorbe la sérialisation sous burst.
					timeout: TX_TIMEOUT_LONG,
					maxWait: TX_MAX_WAIT_LONG,
				},
			);

			if (result.kind === "missing") {
				logger.warn(`issueCreditNoteForRefund — refund or invoice missing: ${refundId}`, {
					service: "issue-credit-note",
				});
				return { kind: "noop", reason: "missing" };
			}

			if (result.kind === "full-refund-on-order") {
				logger.info(
					`issueCreditNoteForRefund — refund ${refundId} is a full refund — avoir porté par voidInvoice (Order), pas de second avoir sur Refund (EINV-SEQ-001)`,
					{ service: "issue-credit-note" },
				);
				return { kind: "noop", reason: "full-refund-voided-on-order" };
			}

			if (result.kind === "already-issued") {
				logger.info(
					`issueCreditNoteForRefund — refund ${refundId} already has credit note ${result.creditNoteNumber} — idempotent skip`,
					{ service: "issue-credit-note" },
				);
				return {
					kind: "noop",
					reason: "already-issued",
					creditNoteNumber: result.creditNoteNumber,
				};
			}

			if (result.kind === "refund-not-completed") {
				logger.warn(`issueCreditNoteForRefund — refund ${refundId} not COMPLETED (skipping)`, {
					service: "issue-credit-note",
				});
				return { kind: "noop", reason: "refund-not-completed" };
			}

			const { updated, orderUserId, orderId } = result;
			getOrderInvalidationTags(orderUserId ?? undefined, orderId).forEach((tag) => updateTag(tag));
			updateTag(REFUNDS_CACHE_TAGS.DETAIL(refundId));

			// EINV-CREDIT-020 : archivage EAGER de l'avoir partiel dès l'émission
			// (symétrie `voidInvoice`/facture). Sans archive, un avoir jamais
			// téléchargé serait matérialisé depuis des colonnes scrubées après
			// anonymisation RGPD (Art. 289 CGI). Best-effort (ne throw jamais) —
			// un échec est flagué par l'archiveur, rattrapé par reconcile-invoices.
			await ensureRefundCreditNoteArchived(refundId);

			return {
				kind: "issued",
				creditNoteNumber: updated.creditNoteNumber!,
				creditNoteGeneratedAt: updated.creditNoteGeneratedAt!,
			};
		} catch (e) {
			lastError = e;
			if (
				e instanceof Prisma.PrismaClientKnownRequestError &&
				RETRYABLE_SEQUENCE_TX_ERROR_CODES.has(e.code) &&
				attempt < MAX_RETRIES - 1
			) {
				continue;
			}
			const errorMessage = e instanceof Error ? e.message : String(e);
			logger.error("Failed to issue credit note for refund", e, {
				service: "issue-credit-note",
				refundId,
				attempt,
			});
			if (e instanceof BusinessError && e.code === "CREDIT_NOTE_SEQUENCE_OVERFLOW") {
				await sendAdminSequenceOverflowAlert({
					year: getParisDateParts(new Date()).year,
					documentType: "credit-note",
				}).catch((alertError) =>
					logger.error("sendAdminSequenceOverflowAlert threw", alertError, {
						service: "issue-credit-note",
						refundId,
					}),
				);
			}
			return { kind: "failed", error: errorMessage };
		}
	}

	const exhaustedMessage =
		lastError instanceof Error ? lastError.message : String(lastError ?? "MAX_RETRIES exceeded");
	return { kind: "failed", error: exhaustedMessage };
}
