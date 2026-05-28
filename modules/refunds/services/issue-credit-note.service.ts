import { Prisma, OrderAction, RefundStatus } from "@/app/generated/prisma/client";
import type { HistorySource } from "@/app/generated/prisma/client";
import { BusinessError } from "@/shared/lib/actions/business-error";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { updateTag } from "next/cache";
import { sendAdminSequenceOverflowAlert } from "@/modules/emails/services/admin-emails";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { REFUNDS_CACHE_TAGS } from "../constants/cache";

/**
 * Émet un avoir comptable rattaché à un Refund (Art. 272-I CGI — avoir requis
 * pour TOUT remboursement, partiel ou total, sur facture émise).
 *
 * Distinct de `voidInvoice()` :
 *   - voidInvoice() : full void → passe `Order.invoiceStatus` à VOIDED, écrit
 *     `Order.creditNoteNumber`. Cas refund total / cancel-order.
 *   - issueCreditNoteForRefund() : refund partiel OU total → écrit
 *     `Refund.creditNoteNumber` uniquement. La facture reste GENERATED (valide
 *     pour la part non remboursée si partiel).
 *
 * Séquence A-YYYY-NNNNN PARTAGÉE avec Order.creditNoteNumber (advisory lock
 * 2_000_000+year + lookup UNION). Unicité globale garantie par contrainte
 * UNIQUE sur chaque table (race retry via P2002).
 *
 * Cf. audit avoirs 2026-05-28 — EINV-CREDIT-001 + EINV-CREDIT-005 + EINV-CREDIT-010
 */
export type IssueCreditNoteResult =
	| {
			kind: "issued";
			creditNoteNumber: string;
			creditNoteGeneratedAt: Date;
	  }
	| {
			kind: "noop";
			reason: "missing" | "already-issued" | "refund-not-completed";
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
const MAX_SEQUENCE_PER_YEAR = 99_999;

/**
 * Même clé advisory lock que `voidInvoice` (offset 2_000_000) pour partager
 * la séquence A-YYYY-NNNNN entre Order et Refund.
 */
function creditNoteAdvisoryLockKey(year: number): number {
	return 2_000_000 + year;
}

export async function issueCreditNoteForRefund(
	params: IssueCreditNoteParams,
): Promise<IssueCreditNoteResult> {
	const { refundId, source, authorId, authorName } = params;

	let lastError: unknown = null;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const result = await prisma.$transaction(async (tx) => {
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

				// Pas de facture originale → pas d'avoir comptable possible
				// (cas commande payée sans facturation séquentielle).
				if (!refund.order.invoiceNumber) {
					return { kind: "missing" as const };
				}

				const year = new Date().getFullYear();
				const prefix = `A-${year}-`;

				await tx.$executeRaw(
					Prisma.sql`SELECT pg_advisory_xact_lock(${creditNoteAdvisoryLockKey(year)})`,
				);

				// Lookup MAX(A-YYYY-NNNNN) sur les DEUX tables (Order + Refund)
				// — la séquence est partagée pour garantir l'unicité globale.
				const lastRow = await tx.$queryRaw<Array<{ cn: string | null }>>(
					Prisma.sql`
						SELECT MAX(cn) AS cn FROM (
							SELECT "creditNoteNumber" AS cn FROM "Order"
								WHERE "creditNoteNumber" LIKE ${prefix + "%"}
							UNION ALL
							SELECT "creditNoteNumber" AS cn FROM "Refund"
								WHERE "creditNoteNumber" LIKE ${prefix + "%"}
						) t
					`,
				);

				let nextSequence = 1;
				const lastNumber = lastRow[0]?.cn;
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
			});

			if (result.kind === "missing") {
				logger.warn(`issueCreditNoteForRefund — refund or invoice missing: ${refundId}`, {
					service: "issue-credit-note",
				});
				return { kind: "noop", reason: "missing" };
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

			return {
				kind: "issued",
				creditNoteNumber: updated.creditNoteNumber!,
				creditNoteGeneratedAt: updated.creditNoteGeneratedAt!,
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
			const errorMessage = e instanceof Error ? e.message : String(e);
			logger.error("Failed to issue credit note for refund", e, {
				service: "issue-credit-note",
				refundId,
				attempt,
			});
			if (e instanceof BusinessError && e.code === "CREDIT_NOTE_SEQUENCE_OVERFLOW") {
				await sendAdminSequenceOverflowAlert({
					year: new Date().getFullYear(),
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
