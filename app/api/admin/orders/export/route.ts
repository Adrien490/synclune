import { requireAdminApiRoute } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { exportInvoicesSchema } from "@/modules/orders/schemas/order.schemas";
import {
	buildExportWhereClause,
	generateOrdersCsv,
} from "@/modules/orders/services/export-orders-csv.service";

export async function GET(request: Request) {
	const admin = await requireAdminApiRoute();
	if ("response" in admin) return admin.response;

	const { searchParams } = new URL(request.url);
	const input = {
		periodType: searchParams.get("periodType") ?? undefined,
		year: searchParams.get("year") ?? undefined,
		month: searchParams.get("month") ?? undefined,
		dateFrom: searchParams.get("dateFrom") ?? undefined,
		dateTo: searchParams.get("dateTo") ?? undefined,
		format: searchParams.get("format") ?? undefined,
		invoiceStatus: searchParams.get("invoiceStatus") ?? undefined,
	};

	const result = exportInvoicesSchema.safeParse(input);
	if (!result.success) {
		return new Response(JSON.stringify({ error: result.error.issues[0]?.message }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const where = buildExportWhereClause(result.data);

	try {
		const orders = await prisma.order.findMany({
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

		const csv = generateOrdersCsv(orders);

		const now = new Date();
		const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		const filename = `livre-recettes-${dateStr}.csv`;

		return new Response(csv, {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="${filename}"`,
			},
		});
	} catch (error) {
		console.error("[EXPORT] Failed to export orders:", error);
		return new Response(JSON.stringify({ error: "Erreur lors de l'export" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
