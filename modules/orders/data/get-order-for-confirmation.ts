import { prisma, notDeleted } from "@/shared/lib/prisma";
import { z } from "zod";

// Lightweight select for the confirmation page
const CONFIRMATION_ORDER_SELECT = {
	id: true,
	orderNumber: true,
	subtotal: true,
	shippingCost: true,
	discountAmount: true,
	total: true,
	paymentStatus: true,
	shippingFirstName: true,
	shippingLastName: true,
	shippingAddress1: true,
	shippingAddress2: true,
	shippingPostalCode: true,
	shippingCity: true,
	shippingPhone: true,
	items: {
		select: {
			id: true,
			productTitle: true,
			skuColor: true,
			skuMaterial: true,
			skuSize: true,
			skuImageUrl: true,
			price: true,
			quantity: true,
		},
	},
} as const;

const confirmationParamsSchema = z.object({
	orderId: z.cuid2(),
	orderNumber: z.string().min(1),
});

/**
 * Retrieves an order for the confirmation page without requiring authentication.
 *
 * Security: The order is looked up by both `id` (cuid, cryptographically random)
 * AND `orderNumber`, providing a double verification that prevents enumeration.
 * Only non-deleted orders are returned.
 */
export async function getOrderForConfirmation(
	orderId: string,
	orderNumber: string
) {
	const validation = confirmationParamsSchema.safeParse({ orderId, orderNumber });
	if (!validation.success) return null;

	try {
		return await prisma.order.findFirst({
			where: {
				id: validation.data.orderId,
				orderNumber: validation.data.orderNumber,
				...notDeleted,
			},
			select: CONFIRMATION_ORDER_SELECT,
		});
	} catch {
		return null;
	}
}
