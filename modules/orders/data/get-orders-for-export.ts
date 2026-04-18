import type { Prisma } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";

const EXPORT_MAX_ROWS = 50_000;

export type OrderForExport = Awaited<
	ReturnType<typeof prisma.order.findMany<{ select: typeof EXPORT_SELECT }>>
>[number];

const EXPORT_SELECT = {
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
} as const satisfies Prisma.OrderSelect;

/**
 * Fetches orders for CSV export with the minimal select needed.
 * Not cached — admin-only, called on-demand for exports (data must be fresh).
 * Limited to 50,000 rows to prevent Vercel timeout on large datasets.
 */
export async function getOrdersForExport(where: Prisma.OrderWhereInput): Promise<OrderForExport[]> {
	const admin = await requireAdmin();
	if ("error" in admin) return [];

	return prisma.order.findMany({
		where,
		orderBy: { paidAt: "asc" },
		take: EXPORT_MAX_ROWS,
		select: EXPORT_SELECT,
	});
}
