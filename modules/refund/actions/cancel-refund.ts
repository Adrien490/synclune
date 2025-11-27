"use server";

import { RefundStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/shared/lib/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { cancelRefundSchema } from "../schemas/refund.schemas";

/**
 * Annule un remboursement (supprime si PENDING ou APPROVED)
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Seuls les remboursements en PENDING ou APPROVED peuvent être annulés
 * - Les remboursements COMPLETED, REJECTED ou FAILED ne peuvent pas être annulés
 */
export async function cancelRefund(
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

		const result = cancelRefundSchema.safeParse({ id });
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

		// Vérifier le statut actuel - on ne peut annuler que PENDING ou APPROVED
		if (
			refund.status !== RefundStatus.PENDING &&
			refund.status !== RefundStatus.APPROVED
		) {
			return {
				status: ActionStatus.ERROR,
				message: REFUND_ERROR_MESSAGES.CANNOT_CANCEL,
			};
		}

		// Supprimer le remboursement et ses items (cascade)
		await prisma.refund.delete({
			where: { id },
		});

		revalidatePath("/admin/ventes/remboursements");
		revalidatePath("/admin/ventes/commandes");

		return {
			status: ActionStatus.SUCCESS,
			message: `Remboursement de ${(refund.amount / 100).toFixed(2)} € annulé pour la commande ${refund.order.orderNumber}`,
		};
	} catch (error) {
		console.error("[CANCEL_REFUND]", error);
		return {
			status: ActionStatus.ERROR,
			message: REFUND_ERROR_MESSAGES.CANCEL_FAILED,
		};
	}
}
