"use server";

import { RefundStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { exportSingleOrderSchema } from "../schemas/order.schemas";
import { generateOrdersCsv } from "../services/export-orders-csv.service";

/**
 * State retourné par exportSingleOrder : soit un ActionState de refus, soit un
 * payload SUCCESS avec csv + filename pour trigger le download côté client.
 * Note: ActionState est un union discriminé, on le compose par intersection
 * plutôt qu'extends (interfaces ne peuvent étendre un union).
 */
export type ExportSingleOrderState = ActionState & {
	csv?: string;
	filename?: string;
};

/**
 * Exporte une commande au format CSV (livre de recettes - Art. 286 CGI)
 * Réservé aux administrateurs
 *
 * Cas d'usage : impression rapide / archive comptable d'une commande unique,
 * sans avoir à passer par l'export bulk.
 *
 * Returns: { csv: string, filename: string } - le client déclenche le download
 * via blob (cohérent avec le pattern DownloadInvoiceButton).
 */
export async function exportSingleOrder(
	_prevState: ExportSingleOrderState | undefined,
	formData: FormData,
): Promise<ExportSingleOrderState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error as ExportSingleOrderState;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error as ExportSingleOrderState;

		const validated = validateInput(exportSingleOrderSchema, {
			id: safeFormGet(formData, "id"),
		});
		if ("error" in validated) return validated.error as ExportSingleOrderState;

		const { id } = validated.data;

		const order = await prisma.order.findUnique({
			where: { id, ...notDeleted },
			select: {
				orderNumber: true,
				invoiceNumber: true,
				creditNoteNumber: true,
				createdAt: true,
				paidAt: true,
				customerName: true,
				customerEmail: true,
				subtotal: true,
				discountAmount: true,
				shippingCost: true,
				total: true,
				paymentMethod: true,
				paymentStatus: true,
				status: true,
				refunds: {
					where: { status: RefundStatus.COMPLETED },
					select: { amount: true },
				},
			},
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			} satisfies ExportSingleOrderState;
		}

		const csv = generateOrdersCsv([order]);
		const filename = `commande-${order.orderNumber}.csv`;

		const result: ExportSingleOrderState = {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} exportée.`,
			csv,
			filename,
		};
		return result;
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.EXPORT_ORDER_FAILED) as ExportSingleOrderState;
	}
}
