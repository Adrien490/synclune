"use server";

import { updateTag } from "next/cache";

import { HistorySource, OrderAction, RefundStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
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
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;
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

		// Update via condition WHERE pour éviter TOCTOU + audit trail per-refund.
		// IDEM-BULK-001 (audit idempotence 2026-07-26) : `eligible` vient d'un findMany
		// HORS transaction. Le `updateMany` conditionnel empêchait bien la double
		// transition, mais son `count` n'était ni capturé ni vérifié : sur un double-clic
		// (ou une course avec `approve-refund` unitaire), le perdant écrivait quand même
		// un `OrderHistory` par refund — dans une table IMMUABLE (Art. L123-22) — et
		// annonçait à l'admin un `count`/`totalAmount` surévalués. On relit donc, DANS la
		// transaction, les refunds réellement transitionnés et on n'audite que ceux-là.
		const transitioned = await prisma.$transaction(async (tx) => {
			const claimed = await tx.refund.updateMany({
				where: { id: { in: eligibleIds }, status: RefundStatus.PENDING },
				data: { status: RefundStatus.APPROVED },
			});

			if (claimed.count === 0) return [];

			// Les lignes que CETTE transaction a fait passer en APPROVED. Si un concurrent
			// en a approuvé une partie, `claimed.count < eligibleIds.length` et la
			// re-lecture ci-dessous ne peut pas les distinguer des nôtres ; on retombe
			// alors sur le sous-ensemble APPROVED, ce qui borne l'audit au réel observé
			// (jamais un audit pour un refund resté PENDING/REJECTED).
			const rows =
				claimed.count === eligibleIds.length
					? eligible
					: await tx.refund
							.findMany({
								where: { id: { in: eligibleIds }, status: RefundStatus.APPROVED },
								select: { id: true },
							})
							.then((approved) => {
								const approvedIds = new Set(approved.map((a) => a.id));
								return eligible.filter((r) => approvedIds.has(r.id));
							});

			// ORD-REFUND-001: audit trail conformité L123-22 (un OrderHistory par
			// refund pour traçabilité par commande)
			// ORD-REFUND-AUDIT-005 : audit trail parallélisé (Promise.all) — gain ~10×
			// sur 50 refunds (sequentielle ~500ms → ~50ms).
			await Promise.all(
				rows.map((r) =>
					createOrderAuditTx(tx, {
						orderId: r.order.id,
						action: OrderAction.REFUND_CREATED,
						source: HistorySource.ADMIN,
						authorId: adminUser.id,
						authorName: adminUser.name ?? adminUser.email,
						note: "Remboursement approuvé en lot",
						metadata: {
							refundId: r.id,
							amount: r.amount,
							event: "bulk_approved",
							previousStatus: RefundStatus.PENDING,
							newStatus: RefundStatus.APPROVED,
						},
					}),
				),
			);

			return rows;
		});

		if (transitioned.length === 0) {
			return error("Aucun remboursement approuvé (déjà traités par une action concurrente)");
		}

		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(REFUNDS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		const tags = new Set<string>();
		for (const r of transitioned) {
			tags.add(REFUNDS_CACHE_TAGS.DETAIL(r.id));
			tags.add(ORDERS_CACHE_TAGS.REFUNDS(r.order.id));
			if (r.order.user?.id) {
				tags.add(ORDERS_CACHE_TAGS.USER_ORDERS(r.order.user.id));
			}
		}
		tags.forEach((tag) => updateTag(tag));

		// IDEM-BULK-001 : le compte rendu porte sur les transitions RÉELLES. Les refunds
		// éligibles à la lecture mais approuvés entre-temps par un concurrent sont
		// comptés comme ignorés, pas comme approuvés par nous.
		const skipped = refunds.length - transitioned.length;
		const skippedHint =
			skipped > 0
				? ` (${skipped} statut${skipped > 1 ? "s" : ""} non éligible${skipped > 1 ? "s" : ""} ignoré${skipped > 1 ? "s" : ""})`
				: "";
		const totalAmount = transitioned.reduce((sum, r) => sum + r.amount, 0);
		const plural = transitioned.length > 1 ? "s" : "";
		return success(
			`${transitioned.length} remboursement${plural} approuvé${plural} (${(totalAmount / 100).toFixed(2)} € au total)${skippedHint}. Traitement Stripe à effectuer individuellement.`,
			{ count: transitioned.length, totalAmount },
		);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'approbation en lot");
	}
}
