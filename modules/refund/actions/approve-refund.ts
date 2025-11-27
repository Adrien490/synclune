"use server";

import { RefundStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/shared/lib/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { approveRefundSchema } from "../schemas/refund.schemas";

/**
 * Approuve un remboursement (passe de PENDING à APPROVED)
 * Réservé aux administrateurs
 */
export async function approveRefund(
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

		const result = approveRefundSchema.safeParse({ id });
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

		// Vérifier le statut actuel
		if (refund.status === RefundStatus.APPROVED) {
			return {
				status: ActionStatus.ERROR,
				message: REFUND_ERROR_MESSAGES.ALREADY_APPROVED,
			};
		}

		if (refund.status !== RefundStatus.PENDING) {
			return {
				status: ActionStatus.ERROR,
				message: REFUND_ERROR_MESSAGES.ALREADY_PROCESSED,
			};
		}

		// Mettre à jour le statut
		await prisma.refund.update({
			where: { id },
			data: {
				status: RefundStatus.APPROVED,
			},
		});

		revalidatePath("/admin/ventes/remboursements");

		return {
			status: ActionStatus.SUCCESS,
			message: `Remboursement de ${(refund.amount / 100).toFixed(2)} € approuvé pour la commande ${refund.order.orderNumber}`,
		};
	} catch (error) {
		console.error("[APPROVE_REFUND]", error);
		return {
			status: ActionStatus.ERROR,
			message: REFUND_ERROR_MESSAGES.APPROVE_FAILED,
		};
	}
}
