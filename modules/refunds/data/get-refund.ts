import { prisma } from "@/shared/lib/prisma";

import { GET_REFUND_SELECT } from "../constants/refund.constants";
import { getRefundSchema } from "../schemas/refund.schemas";
import type { GetRefundParams, GetRefundReturn } from "../types/refund.types";

// Re-export pour compatibilité
export type { GetRefundParams, GetRefundReturn } from "../types/refund.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un remboursement par son ID
 */
export async function getRefundById(
	params: Partial<GetRefundParams>
): Promise<GetRefundReturn> {
	const validation = getRefundSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	return fetchRefund(validation.data);
}

/**
 * Récupère le refund depuis la DB
 */
async function fetchRefund(
	params: GetRefundParams
): Promise<GetRefundReturn> {
	try {
		const refund = await prisma.refund.findUnique({
			where: {
				id: params.id,
				deletedAt: null, // Soft delete: exclure les remboursements supprimés
			},
			select: GET_REFUND_SELECT,
		});

		return refund;
	} catch {
		return null;
	}
}
