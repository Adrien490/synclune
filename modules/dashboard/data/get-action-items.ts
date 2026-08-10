import * as Sentry from "@sentry/nextjs";
import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { THRESHOLDS } from "@/modules/cron/constants/limits";

import type { DashboardActionItems } from "../types/dashboard.types";

export type { DashboardActionItems } from "../types/dashboard.types";

const DAY_MS = 24 * 60 * 60 * 1000;

// Fenêtres de monitoring « à traiter ». Jadis portées par les crons d'alerte
// retirés à l'audit right-sizing (overbilled-orders / stuck-orders) ; le dashboard
// en est désormais le SSOT. Lecture seule, données fraîches à chaque chargement
// (PAS de "use cache" : on veut l'état courant, et `Date.now()` est interdit dans
// un bloc "use cache").
//
// Il n'y a PAS de compteur de litiges : le modèle `Dispute` a été retiré en V1
// (simplification 2026-07-30). Une deadline de chargeback se suit dans le Dashboard
// Stripe, et l'alerte e-mail émise à l'ouverture la porte déjà.
//
// Réutilisés depuis `THRESHOLDS` plutôt que redéclarés : les deux définitions
// portaient les mêmes valeurs sans lien, donc pouvaient divorcer en silence.
const STUCK_PROCESSING_MS = THRESHOLDS.STUCK_PROCESSING_MS;
const STUCK_SHIPPED_MS = THRESHOLDS.STUCK_SHIPPED_MS;
const STUCK_INVOICE_MS = 7 * DAY_MS;
const ORPHAN_PENDING_MS = 14 * DAY_MS;

/**
 * Compte, en lecture seule, les éléments « à traiter » du dashboard — les mêmes
 * conditions que surveillaient les crons d'alerte retirés. Remplace l'envoi
 * d'e-mails quotidiens par un coup d'œil à la connexion (audit §4.2).
 */
export async function fetchDashboardActionItems(): Promise<DashboardActionItems> {
	return Sentry.startSpan({ name: "dashboard.fetchActionItems", op: "db.read" }, async () => {
		const now = Date.now();

		const [stuckProcessing, stuckShipped, stuckInvoices, orphanPending] = await Promise.all([
			prisma.order.count({
				where: {
					status: OrderStatus.PROCESSING,
					paymentStatus: PaymentStatus.PAID,
					paidAt: { lt: new Date(now - STUCK_PROCESSING_MS) },
					...notDeleted,
				},
			}),
			prisma.order.count({
				where: {
					status: OrderStatus.SHIPPED,
					shippedAt: { lt: new Date(now - STUCK_SHIPPED_MS) },
					deliveredAt: null,
					...notDeleted,
				},
			}),
			prisma.order.count({
				where: {
					paymentStatus: PaymentStatus.PAID,
					invoiceNumber: null,
					paidAt: { lt: new Date(now - STUCK_INVOICE_MS) },
					...notDeleted,
				},
			}),
			prisma.order.count({
				where: {
					paymentStatus: PaymentStatus.PENDING,
					stripePaymentIntentId: { not: null },
					createdAt: { lt: new Date(now - ORPHAN_PENDING_MS) },
					...notDeleted,
				},
			}),
		]);

		return {
			stuckProcessing,
			stuckShipped,
			stuckInvoices,
			orphanPending,
		};
	});
}
