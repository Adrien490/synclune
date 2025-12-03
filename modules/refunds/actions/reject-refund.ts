"use server";

import { RefundAction, RefundStatus } from "@/app/generated/prisma";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { rejectRefundSchema } from "../schemas/refund.schemas";

/**
 * Rejette un remboursement (passe de PENDING à REJECTED)
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Seuls les remboursements en PENDING peuvent être rejetés
 * - Une raison optionnelle peut être fournie
 */
export async function rejectRefund(
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

		const id = formData.get("id") as string;
		const reason = formData.get("reason") as string | null;

		const result = rejectRefundSchema.safeParse({ id, reason });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "ID invalide",
			};
		}

		// Récupérer le remboursement
		const refund = await prisma.refund.findUnique({
			where: { id },
			select: {
				id: true,
				status: true,
				amount: true,
				note: true,
				order: {
					select: {
						orderNumber: true,
					},
				},
			},
		});

		if (!refund) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: REFUND_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// Vérifier le statut actuel
		if (refund.status === RefundStatus.REJECTED) {
			return {
				status: ActionStatus.ERROR,
				message: REFUND_ERROR_MESSAGES.ALREADY_REJECTED,
			};
		}

		if (refund.status !== RefundStatus.PENDING) {
			return {
				status: ActionStatus.ERROR,
				message: REFUND_ERROR_MESSAGES.ALREADY_PROCESSED,
			};
		}

		// Construire la note avec la raison du rejet
		const updatedNote = result.data.reason
			? refund.note
				? `${refund.note}\n\n[REFUSÉ] ${result.data.reason}`
				: `[REFUSÉ] ${result.data.reason}`
			: refund.note;

		// Récupérer la session pour l'historique
		const session = await getSession();

		// Mettre à jour le statut et créer l'entrée d'historique
		await prisma.$transaction(async (tx) => {
			await tx.refund.update({
				where: { id },
				data: {
					status: RefundStatus.REJECTED,
					note: updatedNote,
				},
			});

			await tx.refundHistory.create({
				data: {
					refundId: id,
					action: RefundAction.REJECTED,
					authorId: session?.user?.id,
					note: result.data.reason || undefined,
				},
			});
		});

		revalidatePath("/admin/ventes/remboursements");

		return {
			status: ActionStatus.SUCCESS,
			message: `Remboursement de ${(refund.amount / 100).toFixed(2)} € refusé pour la commande ${refund.order.orderNumber}`,
		};
	} catch (error) {
		console.error("[REJECT_REFUND]", error);
		return {
			status: ActionStatus.ERROR,
			message: REFUND_ERROR_MESSAGES.REJECT_FAILED,
		};
	}
}
