"use server";

import { RefundStatus } from "@/app/generated/prisma";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { bulkApproveRefundsSchema } from "../schemas/refund.schemas";

/**
 * Approuve plusieurs remboursements en une seule action (passe de PENDING à APPROVED)
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Seuls les remboursements en PENDING seront approuvés
 * - Les remboursements déjà traités seront ignorés
 */
export async function bulkApproveRefunds(
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
		let ids: string[];

		try {
			ids = JSON.parse(idsRaw);
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format des IDs invalide",
			};
		}

		const result = bulkApproveRefundsSchema.safeParse({ ids });
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
				message: "Aucun remboursement éligible à l'approbation (seuls les remboursements en attente peuvent être approuvés)",
			};
		}

		// Approuver tous les remboursements éligibles
		await prisma.refund.updateMany({
			where: {
				id: { in: refunds.map((r) => r.id) },
			},
			data: {
				status: RefundStatus.APPROVED,
			},
		});

		revalidatePath("/admin/ventes/remboursements");

		const totalAmount = refunds.reduce((sum, r) => sum + r.amount, 0);
		const skipped = result.data.ids.length - refunds.length;

		let message = `${refunds.length} remboursement${refunds.length > 1 ? "s" : ""} approuvé${refunds.length > 1 ? "s" : ""} (${(totalAmount / 100).toFixed(2)} €)`;
		if (skipped > 0) {
			message += ` - ${skipped} ignoré${skipped > 1 ? "s" : ""} (déjà traité${skipped > 1 ? "s" : ""})`;
		}

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (error) {
		console.error("[BULK_APPROVE_REFUNDS]", error);
		return {
			status: ActionStatus.ERROR,
			message: REFUND_ERROR_MESSAGES.APPROVE_FAILED,
		};
	}
}
