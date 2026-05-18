"use server";

import { InvoiceStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderMetadataInvalidationTags } from "../constants/cache";
import { updateOrderCustomerInfoSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Met à jour les informations client d'une commande
 * Réservé aux administrateurs
 *
 * Cas d'usage : correction de typo email/téléphone post-checkout (support client),
 * sans recréer la commande.
 *
 * Règles métier :
 * - Bloqué après génération de facture (immutabilité comptable Art. 286 CGI)
 * - Email obligatoire et validé (notifications transactionnelles dépendent)
 * - Audit complet avec ancienne et nouvelle valeur
 */
export async function updateOrderCustomerInfo(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			id: safeFormGet(formData, "id"),
			customerEmail: safeFormGet(formData, "customerEmail"),
			customerName: safeFormGet(formData, "customerName"),
			customerPhone: safeFormGet(formData, "customerPhone") ?? undefined,
		};

		const validated = validateInput(updateOrderCustomerInfoSchema, rawData);
		if ("error" in validated) return validated.error;

		const { id, customerEmail, customerName, customerPhone } = validated.data;

		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					userId: true,
					invoiceStatus: true,
					customerEmail: true,
					customerName: true,
					customerPhone: true,
				},
			});

			if (!found) return null;

			if (found.invoiceStatus === InvoiceStatus.GENERATED) {
				return { ...found, _error: "invoice_generated" as const };
			}

			const sanitizedEmail = sanitizeText(customerEmail).toLowerCase();
			const sanitizedName = sanitizeText(customerName);
			const sanitizedPhone = customerPhone ? sanitizeText(customerPhone) : null;

			await tx.order.update({
				where: { id },
				data: {
					customerEmail: sanitizedEmail,
					customerName: sanitizedName,
					customerPhone: sanitizedPhone,
				},
			});

			await createOrderAuditTx(tx, {
				orderId: id,
				action: "ADDRESS_UPDATED",
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				note: "Informations client modifiées",
				metadata: {
					updateType: "customerInfo",
					previous: {
						email: found.customerEmail,
						name: found.customerName,
						phone: found.customerPhone,
					},
					new: {
						email: sanitizedEmail,
						name: sanitizedName,
						phone: sanitizedPhone,
					},
				},
			});

			return found;
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		if ("_error" in order) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_UPDATE_BILLING_INVOICED,
			};
		}

		getOrderMetadataInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) =>
			updateTag(tag),
		);

		return {
			status: ActionStatus.SUCCESS,
			message: `Informations client mises à jour pour la commande ${order.orderNumber}.`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.UPDATE_CUSTOMER_INFO_FAILED);
	}
}
