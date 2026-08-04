import { type Prisma, HistorySource } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import type { OrderAction, OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";
import type { CreateOrderAuditParams } from "../types/order-audit.types";
import { orderHistoryMetadataSchema } from "../schemas/order-history-metadata.schema";
import { logger } from "@/shared/lib/logger";

/**
 * Garde-fou anti-fuite PII : strip metadata avant écriture si elle contient
 * une clé sensible exposée côté client. Best-effort log + return `{}` plutôt
 * que throw pour ne jamais casser un audit trail (Art. L123-22 a priorité).
 *
 * Cf. audit conformité 2026-05-27 — ORD-COMPLY-006
 */
function sanitizeAuditMetadata(
	metadata: Record<string, unknown> | undefined,
	context: { orderId: string; action: OrderAction },
): Prisma.InputJsonValue | undefined {
	if (metadata === undefined) return undefined;
	const result = orderHistoryMetadataSchema.safeParse(metadata);
	if (!result.success) {
		logger.error(
			"OrderHistory.metadata rejected — PII-like key detected, stripped before write",
			result.error,
			{
				service: "order-audit",
				orderId: context.orderId,
				action: context.action,
			},
		);
		return {};
	}
	return metadata as Prisma.InputJsonValue;
}

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
	const safeMetadata = sanitizeAuditMetadata(params.metadata, {
		orderId: params.orderId,
		action: params.action,
	});
	await prisma.orderHistory.create({
		data: {
			orderId: params.orderId,
			action: params.action,
			previousStatus: params.previousStatus,
			newStatus: params.newStatus,
			previousPaymentStatus: params.previousPaymentStatus,
			newPaymentStatus: params.newPaymentStatus,
			note: params.note,
			metadata: safeMetadata,
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
	const safeMetadata = sanitizeAuditMetadata(params.metadata, {
		orderId: params.orderId,
		action: params.action,
	});
	await tx.orderHistory.create({
		data: {
			orderId: params.orderId,
			action: params.action,
			previousStatus: params.previousStatus,
			newStatus: params.newStatus,
			previousPaymentStatus: params.previousPaymentStatus,
			newPaymentStatus: params.newPaymentStatus,
			note: params.note,
			metadata: safeMetadata,
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
	},
	newOrder: {
		status: OrderStatus;
		paymentStatus: PaymentStatus;
	},
	options?: {
		note?: string;
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
		note: options?.note,
		authorName: options?.authorName,
		source: options?.source ?? HistorySource.ADMIN,
		metadata: options?.metadata,
	};
}
