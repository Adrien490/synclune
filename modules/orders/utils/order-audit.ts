import { type Prisma, HistorySource } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import type {
	OrderAction,
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";
import type { CreateOrderAuditParams } from "../types/order-audit.types";

export type { CreateOrderAuditParams };

// ============================================================================
// 🔴 ORDER AUDIT TRAIL (Best Practice Stripe 2025 + Conformité FR)
// ============================================================================
// Trace automatique de toutes les modifications de commande
// Requis pour conformité légale française (Art. L123-22 Code de Commerce)
// Conservation 10 ans avec la commande

/**
 * Crée une entrée d'audit pour une commande
 * Utiliser cette fonction dans les Server Actions hors transaction
 */
export async function createOrderAudit(params: CreateOrderAuditParams): Promise<void> {
	await prisma.orderHistory.create({
		data: {
			orderId: params.orderId,
			action: params.action,
			previousStatus: params.previousStatus,
			newStatus: params.newStatus,
			previousPaymentStatus: params.previousPaymentStatus,
			newPaymentStatus: params.newPaymentStatus,
			previousFulfillmentStatus: params.previousFulfillmentStatus,
			newFulfillmentStatus: params.newFulfillmentStatus,
			note: params.note,
			metadata: params.metadata as Prisma.InputJsonValue,
			authorId: params.authorId,
			authorName: params.authorName,
			source: params.source ?? HistorySource.ADMIN,
		},
	});
}

/**
 * Crée une entrée d'audit dans une transaction Prisma
 * Utiliser cette fonction dans les Server Actions avec transaction
 */
export async function createOrderAuditTx(
	tx: Prisma.TransactionClient,
	params: CreateOrderAuditParams,
): Promise<void> {
	await tx.orderHistory.create({
		data: {
			orderId: params.orderId,
			action: params.action,
			previousStatus: params.previousStatus,
			newStatus: params.newStatus,
			previousPaymentStatus: params.previousPaymentStatus,
			newPaymentStatus: params.newPaymentStatus,
			previousFulfillmentStatus: params.previousFulfillmentStatus,
			newFulfillmentStatus: params.newFulfillmentStatus,
			note: params.note,
			metadata: params.metadata as Prisma.InputJsonValue,
			authorId: params.authorId,
			authorName: params.authorName,
			source: params.source ?? HistorySource.ADMIN,
		},
	});
}

/**
 * Helper pour créer un audit de changement de statut
 */
export function buildStatusChangeAudit(
	orderId: string,
	action: OrderAction,
	previousOrder: {
		status: OrderStatus;
		paymentStatus: PaymentStatus;
		fulfillmentStatus: FulfillmentStatus;
	},
	newOrder: {
		status: OrderStatus;
		paymentStatus: PaymentStatus;
		fulfillmentStatus: FulfillmentStatus;
	},
	options?: {
		note?: string;
		authorId?: string;
		authorName?: string;
		source?: HistorySource;
		metadata?: Record<string, unknown>;
	},
): CreateOrderAuditParams {
	return {
		orderId,
		action,
		previousStatus: previousOrder.status !== newOrder.status ? previousOrder.status : undefined,
		newStatus: previousOrder.status !== newOrder.status ? newOrder.status : undefined,
		previousPaymentStatus:
			previousOrder.paymentStatus !== newOrder.paymentStatus
				? previousOrder.paymentStatus
				: undefined,
		newPaymentStatus:
			previousOrder.paymentStatus !== newOrder.paymentStatus ? newOrder.paymentStatus : undefined,
		previousFulfillmentStatus:
			previousOrder.fulfillmentStatus !== newOrder.fulfillmentStatus
				? previousOrder.fulfillmentStatus
				: undefined,
		newFulfillmentStatus:
			previousOrder.fulfillmentStatus !== newOrder.fulfillmentStatus
				? newOrder.fulfillmentStatus
				: undefined,
		note: options?.note,
		authorId: options?.authorId,
		authorName: options?.authorName,
		source: options?.source ?? HistorySource.ADMIN,
		metadata: options?.metadata,
	};
}
