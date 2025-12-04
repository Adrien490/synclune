"use server";

import { RefundAction, RefundStatus } from "@/app/generated/prisma/client";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { bulkRejectRefundsSchema } from "../schemas/refund.schemas";

/**
 * Rejette plusieurs remboursements en une seule action (passe de PENDING à REJECTED)
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Seuls les remboursements en PENDING seront rejetés
 * - Les remboursements déjà traités seront ignorés
 * - Une raison optionnelle peut être fournie (appliquée à tous)
 */
export async function bulkRejectRefunds(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé",
			};
		}

		const idsRaw = formData.get("ids") as string;
		const reason = formData.get("reason") as string | null;
		let ids: string[];

		try {
			ids = JSON.parse(idsRaw);
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format des IDs invalide",
			};
		}

		const result = bulkRejectRefundsSchema.safeParse({ ids, reason });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Récupérer les remboursements éligibles (PENDING uniquement)
		const refunds = await prisma.refund.findMany({
			where: {
				id: { in: result.data.ids },
				status: RefundStatus.PENDING,
			},
			select: {
				id: true,
				amount: true,
				note: true,
				order: {
					select: {
						orderNumber: true,
					},
				},
			},
		});

		if (refunds.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun remboursement éligible au rejet (seuls les remboursements en attente peuvent être rejetés)",
			};
		}

		// Récupérer la session pour l'audit trail
		const session = await getSession();

		// Rejeter tous les remboursements avec audit trail
		await prisma.$transaction(async (tx) => {
			for (const refund of refunds) {
				const updatedNote = result.data.reason
					? refund.note
						? `${refund.note}\n\n[REFUSÉ] ${result.data.reason}`
						: `[REFUSÉ] ${result.data.reason}`
					: refund.note;

				await tx.refund.update({
					where: { id: refund.id },
					data: {
						status: RefundStatus.REJECTED,
						note: updatedNote,
					},
				});

				await tx.refundHistory.create({
					data: {
						refundId: refund.id,
						action: RefundAction.REJECTED,
						note: result.data.reason || undefined,
						authorId: session?.user?.id,
					},
				});
			}
		});

		revalidatePath("/admin/ventes/remboursements");

		const totalAmount = refunds.reduce((sum, r) => sum + r.amount, 0);
		const skipped = result.data.ids.length - refunds.length;

		let message = `${refunds.length} remboursement${refunds.length > 1 ? "s" : ""} refusé${refunds.length > 1 ? "s" : ""} (${(totalAmount / 100).toFixed(2)} €)`;
		if (skipped > 0) {
			message += ` - ${skipped} ignoré${skipped > 1 ? "s" : ""} (déjà traité${skipped > 1 ? "s" : ""})`;
		}

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (error) {
		console.error("[BULK_REJECT_REFUNDS]", error);
		return {
			status: ActionStatus.ERROR,
			message: REFUND_ERROR_MESSAGES.REJECT_FAILED,
		};
	}
}
