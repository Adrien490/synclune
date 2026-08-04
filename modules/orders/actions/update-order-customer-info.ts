"use server";

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
		};

		const validated = validateInput(updateOrderCustomerInfoSchema, rawData);
		if ("error" in validated) return validated.error;

		const { id, customerEmail, customerName } = validated.data;

		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					userId: true,
					invoiceNumber: true,
					customerEmail: true,
					customerName: true,
				},
			});

			if (!found) return null;

			// Gate sur invoiceNumber et non invoiceStatus : voidInvoice conserve
			// invoiceNumber (statut VOIDED), et l'avoir est rendu depuis les colonnes
			// Order vivantes — rééditer l'identité client après void ferait diverger
			// l'avoir de son hash archivé (Art. 272-I / L102 B).
			if (found.invoiceNumber !== null) {
				return { ...found, _error: "invoice_issued" as const };
			}

			const sanitizedEmail = sanitizeText(customerEmail).toLowerCase();
			const sanitizedName = sanitizeText(customerName);

			await tx.order.update({
				where: { id },
				data: {
					customerEmail: sanitizedEmail,
					customerName: sanitizedName,
				},
			});

			// ORD-COMPLY-001 : ne PAS stocker email/name/phone (avant/après) dans
			// metadata — exposé côté client via GET_ORDER_SELECT_CUSTOMER.history.
			// L'audit conserve juste le type d'update et la liste des champs
			// modifiés (Art. L123-22 traçabilité admin).
			const changedFields: string[] = [];
			if (found.customerName !== sanitizedName) changedFields.push("name");
			if (found.customerEmail !== sanitizedEmail) changedFields.push("contactIdentity");

			await createOrderAuditTx(tx, {
				orderId: id,
				action: "ADDRESS_UPDATED",
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				note: "Informations client modifiées",
				metadata: {
					updateType: "customerInfo",
					changedFields,
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

		getOrderMetadataInvalidationTags(order.id).forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Informations client mises à jour pour la commande ${order.orderNumber}.`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.UPDATE_CUSTOMER_INFO_FAILED);
	}
}
