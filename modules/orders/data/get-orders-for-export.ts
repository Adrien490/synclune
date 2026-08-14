import type { Prisma } from "@/app/generated/prisma/client";
import { RefundStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { prisma } from "@/shared/lib/prisma";

// Exporté : la route d'export compare `orders.length` à ce plafond pour SIGNALER
// la troncature (header + audit + Sentry) — sur un livre de recettes, une
// troncature muette est un défaut de conformité latent (audit 2026-08-01, P3).
export const EXPORT_MAX_ROWS = 50_000;

export type OrderForExport = Awaited<
	ReturnType<typeof prisma.order.findMany<{ select: typeof EXPORT_SELECT }>>
>[number];

const EXPORT_SELECT = {
	orderNumber: true,
	invoiceNumber: true,
	creditNoteNumber: true,
	createdAt: true,
	paidAt: true,
	customerName: true,
	customerEmail: true,
	subtotal: true,
	shippingCost: true,
	total: true,
	paymentMethod: true,
	paymentStatus: true,
	status: true,
	// Remboursements effectifs (ANALYTICS-AUDIT-003) : permet la colonne "Remboursé"
	// et le calcul du net dans le livre de recettes.
	refunds: {
		where: { status: RefundStatus.COMPLETED },
		select: { amount: true },
	},
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
