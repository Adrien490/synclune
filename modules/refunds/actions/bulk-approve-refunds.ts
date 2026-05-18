"use server";

import { updateTag } from "next/cache";

import { RefundStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	error,
	handleActionError,
	parseFormIds,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { ORDERS_CACHE_TAGS, REFUNDS_CACHE_TAGS } from "../constants/cache";
import { bulkApproveRefundsSchema } from "../schemas/refund.schemas";

/**
 * Approuve en lot plusieurs remboursements PENDING.
 *
 * Limité à l'approbation (PENDING → APPROVED). Le traitement Stripe effectif
 * (call API + update COMPLETED) reste manuel via `processRefund` sur chaque
 * remboursement, car il dépend du PaymentIntent et peut échouer
 * indépendamment.
 *
 * formData :
 * - `refundIds` : JSON array cuid2 (1..50)
 */
export async function bulkApproveRefunds(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.BULK_OPERATION);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "refundIds");
		if ("error" in idsResult) return idsResult.error;

		const validation = validateInput(bulkApproveRefundsSchema, {
			ids: idsResult.ids,
		});
		if ("error" in validation) return validation.error;

		const { ids: refundIds } = validation.data;

		const refunds = await prisma.refund.findMany({
			where: { id: { in: refundIds }, ...notDeleted },
			select: {
				id: true,
				status: true,
				amount: true,
				order: { select: { id: true, orderNumber: true, user: { select: { id: true } } } },
			},
		});

		if (refunds.length === 0) {
			return error("Aucun remboursement valide trouvé");
		}

		const eligible = refunds.filter((r) => r.status === RefundStatus.PENDING);

		if (eligible.length === 0) {
			return error(
				"Aucun remboursement éligible à l'approbation (les statuts autres que PENDING sont ignorés)",
			);
		}

		const eligibleIds = eligible.map((r) => r.id);

		// Update via condition WHERE pour éviter TOCTOU
		await prisma.refund.updateMany({
			where: { id: { in: eligibleIds }, status: RefundStatus.PENDING },
			data: { status: RefundStatus.APPROVED },
		});

		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(REFUNDS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		const tags = new Set<string>();
		for (const r of eligible) {
			tags.add(REFUNDS_CACHE_TAGS.DETAIL(r.id));
			tags.add(ORDERS_CACHE_TAGS.REFUNDS(r.order.id));
			if (r.order.user?.id) {
				tags.add(ORDERS_CACHE_TAGS.USER_ORDERS(r.order.user.id));
			}
		}
		tags.forEach((tag) => updateTag(tag));

		const skipped = refunds.length - eligible.length;
		const skippedHint =
			skipped > 0
				? ` (${skipped} statut${skipped > 1 ? "s" : ""} non éligible${skipped > 1 ? "s" : ""} ignoré${skipped > 1 ? "s" : ""})`
				: "";
		const totalAmount = eligible.reduce((sum, r) => sum + r.amount, 0);
		const plural = eligibleIds.length > 1 ? "s" : "";
		return success(
			`${eligibleIds.length} remboursement${plural} approuvé${plural} (${(totalAmount / 100).toFixed(2)} € au total)${skippedHint}. Traitement Stripe à effectuer individuellement.`,
			{ count: eligibleIds.length, totalAmount },
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'approbation en lot");
	}
}
