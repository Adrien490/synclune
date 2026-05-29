import { createHash } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { CustomerType, EReportingTransactionType, Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { canonicalJsonStringify } from "../utils/canonical-json";
import { INVOICE_FEATURE_FLAGS } from "../constants/feature-flags";
import {
	buildSalesTransaction,
	buildRefundTransaction,
	type EReportingTransactionPayload,
} from "./build-ereporting-transaction";

/**
 * Unique constraint names introduced by migration 20260528160000 covering the
 * anti-doublon e-reporting (EINV-GLOBAL-013). A P2002 carrying one of these
 * targets means a concurrent webhook just created the same SALES/REFUND row
 * between our findFirst and create — treat as success-equivalent.
 */
const EREPORTING_UNIQUE_CONSTRAINTS = new Set([
	"EReportingTransaction_orderId_type_key",
	"EReportingTransaction_refundId_type_key",
]);

function isDuplicateEReportingError(error: unknown): boolean {
	if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
		return false;
	}
	const target = error.meta?.target;
	if (typeof target === "string") return EREPORTING_UNIQUE_CONSTRAINTS.has(target);
	if (Array.isArray(target))
		return target.some((t) => typeof t === "string" && EREPORTING_UNIQUE_CONSTRAINTS.has(t));
	return false;
}

/**
 * Wrapper best-effort qui crée une `EReportingTransaction` à partir d'un
 * Order PAID (SALES) ou d'un Refund COMPLETED (REFUND).
 *
 * Conçu pour être appelé depuis les hot paths (webhook payment, process-refund
 * Step 3, reconcile-refunds finalize) :
 *  - **Fail-closed sur feature flag** : si `INVOICE_ENABLE_EREPORTING=false`,
 *    on retourne silencieusement. Permet d'activer progressivement par
 *    déploiement sans changement de code.
 *  - **Idempotent** : findFirst sur (orderId/refundId, type) avant create +
 *    unique index DB (`EReportingTransaction_orderId_type_key` /
 *    `EReportingTransaction_refundId_type_key`, migration 20260528160000) qui
 *    rattrape les races concurrent-insert via P2002 (skip silencieux).
 *  - **Best-effort** : capture l'erreur, la log + Sentry scope, mais ne
 *    re-throw JAMAIS. Une transaction e-reporting manquée est rattrapée par
 *    `reconcile-refunds` (refunds) ou par ré-tirage manuel admin (orders) ;
 *    un order paid qui rollback à cause d'une création e-reporting
 *    défaillante = catastrophe.
 *
 * Cf. EINV-AUDIT-004 / Phase 3 / Phase 4 wiring.
 */

/**
 * Crée la transaction SALES correspondant à un Order PAID. Idempotent.
 * Retourne l'id de la transaction créée, `"skipped"` si déjà existante ou
 * feature flag OFF, `"error"` si échec (déjà loggé Sentry).
 */
export async function recordSalesEReporting(
	orderId: string,
): Promise<string | "skipped" | "error"> {
	if (!INVOICE_FEATURE_FLAGS.enable_ereporting) return "skipped";

	try {
		const existing = await prisma.eReportingTransaction.findFirst({
			where: { orderId, type: EReportingTransactionType.SALES },
			select: { id: true },
		});
		if (existing) return "skipped";

		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: {
				id: true,
				orderNumber: true,
				paidAt: true,
				total: true,
				taxAmount: true,
				currency: true,
				paymentMethod: true,
				shippingCountry: true,
				customerType: true,
				stripePaymentIntentId: true,
			},
		});
		if (!order || !order.paidAt) {
			logger.warn(`recordSalesEReporting — Order ${orderId} not found or not paid, skipping`, {
				service: "record-ereporting",
				orderId,
			});
			return "skipped";
		}

		// EINV-EREPORT-001 : garde-fou invariant. Synclune vend exclusivement en
		// B2C (customerType toujours B2C), donc cette condition ne se déclenche
		// jamais en pratique. Conservée comme filet : un éventuel B2B/B2G relèverait
		// de la facture électronique (hors e-reporting agrégé) et doublonnerait
		// sinon la déclaration DGFiP.
		if (order.customerType !== CustomerType.B2C) {
			logger.info(
				`recordSalesEReporting — Order ${orderId} is ${order.customerType} (e-invoicing scope), skipping`,
				{ service: "record-ereporting", orderId },
			);
			return "skipped";
		}

		const payload = buildSalesTransaction({ order });
		return await persistTransaction(payload);
	} catch (e) {
		// Race entre findFirst + create : un webhook concurrent vient d'écrire la
		// même paire (orderId, SALES). Le unique index DB nous a protégés ; on
		// rapporte "skipped" plutôt que "error" car le résultat fonctionnel est
		// identique à l'idempotence par check préalable.
		if (isDuplicateEReportingError(e)) {
			logger.info("recordSalesEReporting — concurrent insert detected, skipping (idempotent)", {
				service: "record-ereporting",
				orderId,
			});
			return "skipped";
		}
		Sentry.withScope((scope) => {
			scope.setTag("service", "record-ereporting");
			scope.setTag("ereportingType", "SALES");
			scope.setTag("orderId", orderId);
			scope.setFingerprint(["ereporting", "record-sales-failed"]);
			scope.setLevel("error");
			Sentry.captureException(e);
		});
		logger.error("recordSalesEReporting failed", e, {
			service: "record-ereporting",
			orderId,
		});
		return "error";
	}
}

/**
 * Crée la transaction REFUND correspondant à un Refund COMPLETED. Idempotent.
 */
export async function recordRefundEReporting(
	refundId: string,
): Promise<string | "skipped" | "error"> {
	if (!INVOICE_FEATURE_FLAGS.enable_ereporting) return "skipped";

	try {
		const existing = await prisma.eReportingTransaction.findFirst({
			where: { refundId, type: EReportingTransactionType.REFUND },
			select: { id: true },
		});
		if (existing) return "skipped";

		const refund = await prisma.refund.findUnique({
			where: { id: refundId },
			select: {
				id: true,
				orderId: true,
				amount: true,
				currency: true,
				processedAt: true,
				reason: true,
				order: {
					select: {
						orderNumber: true,
						paymentMethod: true,
						shippingCountry: true,
						customerType: true,
						stripePaymentIntentId: true,
						// EINV-GLOBAL-011 — totaux pour dériver la part TVA du remboursement
						// au prorata (0 en franchise, calculé sinon).
						total: true,
						taxAmount: true,
					},
				},
			},
		});
		if (!refund || !refund.processedAt) {
			logger.warn(
				`recordRefundEReporting — Refund ${refundId} not found or not processed, skipping`,
				{ service: "record-ereporting", refundId },
			);
			return "skipped";
		}

		// EINV-EREPORT-001 : symétrique du SALES — un avoir B2B/B2G est porté par
		// le credit note e-invoice (void-invoice → PDP), pas par l'e-reporting.
		if (refund.order.customerType !== CustomerType.B2C) {
			logger.info(
				`recordRefundEReporting — Refund ${refundId} parent order is ${refund.order.customerType} (e-invoicing scope), skipping`,
				{ service: "record-ereporting", refundId },
			);
			return "skipped";
		}

		const payload = buildRefundTransaction({
			refund: {
				id: refund.id,
				orderId: refund.orderId,
				amount: refund.amount,
				currency: refund.currency,
				processedAt: refund.processedAt,
				reason: refund.reason,
			},
			order: refund.order,
		});
		return await persistTransaction(payload);
	} catch (e) {
		if (isDuplicateEReportingError(e)) {
			logger.info("recordRefundEReporting — concurrent insert detected, skipping (idempotent)", {
				service: "record-ereporting",
				refundId,
			});
			return "skipped";
		}
		Sentry.withScope((scope) => {
			scope.setTag("service", "record-ereporting");
			scope.setTag("ereportingType", "REFUND");
			scope.setTag("refundId", refundId);
			scope.setFingerprint(["ereporting", "record-refund-failed"]);
			scope.setLevel("error");
			Sentry.captureException(e);
		});
		logger.error("recordRefundEReporting failed", e, {
			service: "record-ereporting",
			refundId,
		});
		return "error";
	}
}

/**
 * SHA-256 canonical-JSON du payloadSnapshot e-reporting — audit-vérifiable, par
 * symétrie exacte avec `Order.invoiceDataHash` (cf. `verify-invoice-snapshot.ts`).
 * Permet de détecter toute altération du snapshot figé après écriture
 * (Art. L102 B LPF). Fonction PURE (pas un write path EReporting* → n'enfreint
 * pas l'invariant 9). Exportée pour permettre un recalcul à l'identique côté
 * vérification / test.
 */
export function hashEReportingPayload(snapshot: unknown): string {
	return createHash("sha256").update(canonicalJsonStringify(snapshot)).digest("hex");
}

async function persistTransaction(payload: EReportingTransactionPayload): Promise<string> {
	const created = await prisma.eReportingTransaction.create({
		data: {
			orderId: payload.orderId,
			refundId: payload.refundId,
			type: payload.type,
			occurredAt: payload.occurredAt,
			countryCode: payload.countryCode,
			paymentMethod: payload.paymentMethod,
			amountIncTax: payload.amountIncTax,
			amountExclTax: payload.amountExclTax,
			taxAmount: payload.taxAmount,
			// Ventilation TVA (DORMANT) : DbNull en franchise (vatBreakdown === null)
			// → SQL NULL, pas un JSON `null`. CHECK DB `jsonb_typeof = 'array'`.
			vatBreakdown: payload.vatBreakdown ?? Prisma.DbNull,
			operationCategory: payload.operationCategory,
			currency: payload.currency,
			payloadSnapshot: payload.payloadSnapshot as object,
			payloadHash: hashEReportingPayload(payload.payloadSnapshot),
		},
		select: { id: true },
	});
	return created.id;
}
