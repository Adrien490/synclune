import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { recordSalesEReporting, recordRefundEReporting } from "./record-ereporting.service";

/**
 * EINV-EREPORT-009 — wrappers « deferrable » autour des enregistrements e-reporting.
 *
 * `recordSalesEReporting` / `recordRefundEReporting` sont best-effort : sur erreur
 * transitoire (timeout DB, connexion coupée…) ils retournent `"error"` SANS throw,
 * et l'event webhook est ensuite marqué COMPLETED → Stripe ne rejoue pas. Sans
 * filet, la transaction DGFiP manquante n'est jamais rattrapée — sous-déclaration
 * (SALES) ou sur-déclaration latente (REFUND) au sens de l'Art. 286 CGI. Le contrôle
 * de continuité de période (`check-ereporting-period-continuity`) ne détecte QUE les
 * transactions créées-mais-non-batchées, pas les jamais-créées.
 *
 * Ces wrappers posent un flag DLQ (`Order.ereportingRetryDeferred` /
 * `Refund.ereportingRetryDeferred`) que les crons `reconcile-invoices` (Passe SALES)
 * et `reconcile-refunds` (passe REFUND) consomment pour retenter (idempotent) puis
 * lever le flag au succès.
 *
 * Sémantique de go-live propre : le flag n'est posé QUE si le retour vaut `"error"`.
 * `"skipped"` (feature flag OFF, déjà enregistré, hors B2C) ne déclenche aucun
 * différé → les commandes/refunds antérieurs à l'activation du flag (qui renvoient
 * `"skipped"`) ne sont jamais flagués à tort.
 *
 * Le flag est écrit sur `Order`/`Refund` (PAS sur un modèle `EReporting*`) → ces
 * wrappers n'enfreignent pas l'invariant 9 (« pas de mutation manuelle des
 * EReporting* »).
 */
export async function recordSalesEReportingDeferrable(orderId: string): Promise<void> {
	const result = await recordSalesEReporting(orderId);
	if (result !== "error") return;
	try {
		await prisma.order.update({
			where: { id: orderId },
			data: { ereportingRetryDeferred: true },
		});
		logger.warn("recordSalesEReporting deferred — flag posé pour reconcile-invoices", {
			service: "defer-ereporting-retry",
			orderId,
		});
	} catch (e) {
		// Best-effort : même si le flag échoue, recordSalesEReporting a déjà capté
		// l'incident initial dans Sentry. On capture le 2nd échec pour visibilité.
		logger.error("Failed to set Order.ereportingRetryDeferred", e, {
			service: "defer-ereporting-retry",
			orderId,
		});
		Sentry.captureException(e);
	}
}

export async function recordRefundEReportingDeferrable(refundId: string): Promise<void> {
	const result = await recordRefundEReporting(refundId);
	if (result !== "error") return;
	try {
		await prisma.refund.update({
			where: { id: refundId },
			data: { ereportingRetryDeferred: true },
		});
		logger.warn("recordRefundEReporting deferred — flag posé pour reconcile-refunds", {
			service: "defer-ereporting-retry",
			refundId,
		});
	} catch (e) {
		logger.error("Failed to set Refund.ereportingRetryDeferred", e, {
			service: "defer-ereporting-retry",
			refundId,
		});
		Sentry.captureException(e);
	}
}
