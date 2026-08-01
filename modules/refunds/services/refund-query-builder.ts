import { escapeLikePattern } from "@/shared/utils/escape-like-pattern";
import { type Prisma } from "@/app/generated/prisma/client";
import type { GetRefundsParams } from "../types/refund.types";

// ============================================================================
// REFUND QUERY BUILDER
// ============================================================================

/**
 * Construit la clause WHERE pour la recherche de remboursements
 */
export function buildRefundWhereClause(params: GetRefundsParams): Prisma.RefundWhereInput {
	const where: Prisma.RefundWhereInput = {
		// Soft delete: exclure les remboursements supprimés par défaut
		deletedAt: null,
	};
	const AND: Prisma.RefundWhereInput[] = [];

	// Recherche textuelle (orderNumber, customerEmail, customerName).
	// Échappement LIKE : Prisma `contains` ne neutralise pas % _ \ (P3-3,
	// cf. escape-like-pattern.ts).
	if (params.search) {
		const searchTerm = escapeLikePattern(params.search);
		AND.push({
			OR: [
				{
					order: {
						orderNumber: { contains: searchTerm, mode: "insensitive" },
					},
				},
				{
					order: {
						customerEmail: { contains: searchTerm, mode: "insensitive" },
					},
				},
				{
					order: {
						customerName: { contains: searchTerm, mode: "insensitive" },
					},
				},
			],
		});
	}

	// Filtre par statut
	if (params.filters?.status) {
		if (Array.isArray(params.filters.status)) {
			AND.push({ status: { in: params.filters.status } });
		} else {
			AND.push({ status: params.filters.status });
		}
	}

	// Filtre par raison
	if (params.filters?.reason) {
		if (Array.isArray(params.filters.reason)) {
			AND.push({ reason: { in: params.filters.reason } });
		} else {
			AND.push({ reason: params.filters.reason });
		}
	}

	// Filtre par commande
	if (params.filters?.orderId) {
		AND.push({ orderId: params.filters.orderId });
	}

	// Filtre par date
	if (params.filters?.createdAfter) {
		AND.push({ createdAt: { gte: params.filters.createdAfter } });
	}
	if (params.filters?.createdBefore) {
		AND.push({ createdAt: { lte: params.filters.createdBefore } });
	}

	if (AND.length > 0) {
		where.AND = AND;
	}

	return where;
}
