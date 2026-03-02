import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";

const EXPORT_MAX_ROWS = 50_000;

/**
 * Fetches orders for CSV export with the minimal select needed.
 * Not cached — admin-only, called on-demand for exports.
 * Limited to 50,000 rows to prevent Vercel timeout on large datasets.
 */
export async function getOrdersForExport(where: Prisma.OrderWhereInput) {
	return prisma.order.findMany({
		where,
		orderBy: { paidAt: "asc" },
		take: EXPORT_MAX_ROWS,
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
