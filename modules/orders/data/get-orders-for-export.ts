import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";

/**
 * Fetches orders for CSV export with the minimal select needed.
 * Not cached — admin-only, called on-demand for exports.
 */
export async function getOrdersForExport(where: Prisma.OrderWhereInput) {
	return prisma.order.findMany({
		where,
		orderBy: { paidAt: "asc" },
		select: {
			orderNumber: true,
			invoiceNumber: true,
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
		},
	});
}
