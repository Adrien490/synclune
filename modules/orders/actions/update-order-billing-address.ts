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
import { updateOrderBillingAddressSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Updates the billing address of an order before invoice generation
 * Admin only - used to correct address errors before fiscal invoice (Art. 286 CGI)
 *
 * Business rules:
 * - Cannot update once invoice has been GENERATED (legal immutability)
 * - If billingSameAsShipping, all billing fields are nulled
 */
export async function updateOrderBillingAddress(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const billingSameAsShipping = safeFormGet(formData, "billingSameAsShipping") === "true";

		const rawData = {
			id: safeFormGet(formData, "id"),
			billingSameAsShipping,
			billingFirstName: safeFormGet(formData, "billingFirstName") ?? undefined,
			billingLastName: safeFormGet(formData, "billingLastName") ?? undefined,
			billingAddress1: safeFormGet(formData, "billingAddress1") ?? undefined,
			billingAddress2: safeFormGet(formData, "billingAddress2") ?? undefined,
			billingPostalCode: safeFormGet(formData, "billingPostalCode") ?? undefined,
			billingCity: safeFormGet(formData, "billingCity") ?? undefined,
			billingCountry: safeFormGet(formData, "billingCountry") ?? undefined,
			billingPhone: safeFormGet(formData, "billingPhone") ?? undefined,
		};

		const validated = validateInput(updateOrderBillingAddressSchema, rawData);
		if ("error" in validated) return validated.error;

		const { id, ...billing } = validated.data;

		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					userId: true,
					invoiceStatus: true,
					billingSameAsShipping: true,
					billingFirstName: true,
					billingLastName: true,
					billingAddress1: true,
					billingAddress2: true,
					billingPostalCode: true,
					billingCity: true,
					billingCountry: true,
					billingPhone: true,
				},
			});

			if (!found) return null;

			// Cannot modify billing address after invoice generated (immutabilité comptable)
			if (found.invoiceStatus === InvoiceStatus.GENERATED) {
				return { ...found, _error: "invoice_generated" as const };
			}

			const newData = billing.billingSameAsShipping
				? {
						billingSameAsShipping: true,
						billingFirstName: null,
						billingLastName: null,
						billingAddress1: null,
						billingAddress2: null,
						billingPostalCode: null,
						billingCity: null,
						billingCountry: null,
						billingPhone: null,
					}
				: {
						billingSameAsShipping: false,
						billingFirstName: sanitizeText(billing.billingFirstName!),
						billingLastName: sanitizeText(billing.billingLastName!),
						billingAddress1: sanitizeText(billing.billingAddress1!),
						billingAddress2: billing.billingAddress2 ? sanitizeText(billing.billingAddress2) : null,
						billingPostalCode: sanitizeText(billing.billingPostalCode!),
						billingCity: sanitizeText(billing.billingCity!),
						billingCountry: billing.billingCountry!,
						billingPhone: sanitizeText(billing.billingPhone!),
					};

			await tx.order.update({
				where: { id },
				data: newData,
			});

			await createOrderAuditTx(tx, {
				orderId: id,
				action: "ADDRESS_UPDATED",
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				note: "Adresse de facturation modifiee",
				metadata: {
					addressType: "billing",
					previousAddress: {
						sameAsShipping: found.billingSameAsShipping,
						firstName: found.billingFirstName,
						lastName: found.billingLastName,
						address1: found.billingAddress1,
						address2: found.billingAddress2,
						postalCode: found.billingPostalCode,
						city: found.billingCity,
						country: found.billingCountry,
						phone: found.billingPhone,
					},
					newAddress: newData,
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
			message: `Adresse de facturation mise à jour pour la commande ${order.orderNumber}.`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.UPDATE_BILLING_ADDRESS_FAILED);
	}
}
