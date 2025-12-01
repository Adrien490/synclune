"use cache";

import { prisma } from "@/shared/lib/prisma";
import { cacheDisputes, DISPUTES_CACHE_TAGS } from "../constants/cache";
import { cacheTag } from "next/cache";
import type { DisputeWithOrder, DisputeFilters } from "../types/dispute.types";

const DISPUTE_WITH_ORDER_SELECT = {
	id: true,
	stripeDisputeId: true,
	orderId: true,
	amount: true,
	currency: true,
	reason: true,
	networkReasonCode: true,
	status: true,
	evidenceDueBy: true,
	createdAt: true,
	updatedAt: true,
	resolvedAt: true,
	order: {
		select: {
			orderNumber: true,
			customerEmail: true,
			customerName: true,
		},
	},
} as const;

/**
 * Liste des disputes pour l'admin
 */
export async function getDisputes(filters?: DisputeFilters): Promise<DisputeWithOrder[]> {
	cacheDisputes();

	const where: Record<string, unknown> = {};

	if (filters?.status) {
		where.status = filters.status;
	}

	if (filters?.orderId) {
		where.orderId = filters.orderId;
		cacheTag(DISPUTES_CACHE_TAGS.BY_ORDER(filters.orderId));
	}

	const disputes = await prisma.dispute.findMany({
		where,
		select: DISPUTE_WITH_ORDER_SELECT,
		orderBy: { createdAt: "desc" },
	});

	return disputes as DisputeWithOrder[];
}

/**
 * Dispute par ID
 */
export async function getDisputeById(id: string): Promise<DisputeWithOrder | null> {
	cacheTag(DISPUTES_CACHE_TAGS.DETAIL(id));

	const dispute = await prisma.dispute.findUnique({
		where: { id },
		select: DISPUTE_WITH_ORDER_SELECT,
	});

	return dispute as DisputeWithOrder | null;
}

/**
 * Disputes d'une commande
 */
export async function getDisputesByOrderId(orderId: string): Promise<DisputeWithOrder[]> {
	cacheTag(DISPUTES_CACHE_TAGS.BY_ORDER(orderId));

	const disputes = await prisma.dispute.findMany({
		where: { orderId },
		select: DISPUTE_WITH_ORDER_SELECT,
		orderBy: { createdAt: "desc" },
	});

	return disputes as DisputeWithOrder[];
}

/**
 * Disputes nécessitant une réponse (pour alertes admin)
 */
export async function getDisputesNeedingResponse(): Promise<DisputeWithOrder[]> {
	cacheDisputes();

	const disputes = await prisma.dispute.findMany({
		where: { status: "NEEDS_RESPONSE" },
		select: DISPUTE_WITH_ORDER_SELECT,
		orderBy: { evidenceDueBy: "asc" }, // Les plus urgents en premier
	});

	return disputes as DisputeWithOrder[];
}
