/**
 * Types pour les remboursements de commandes
 */

import type { RefundStatus } from "@/app/generated/prisma/client";

export interface OrderRefundItem {
	id: string;
	amount: number;
	status: RefundStatus;
	reason: string;
	createdAt: Date;
}
