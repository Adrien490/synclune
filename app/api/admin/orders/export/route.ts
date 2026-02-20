import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { exportInvoicesSchema } from "@/modules/orders/schemas/order.schemas";
import {
	buildExportWhereClause,
	generateOrdersCsv,
} from "@/modules/orders/services/export-orders-csv.service";

export async function GET(request: Request) {
	const session = await getSession();
	if (session?.user?.role !== "ADMIN" || !session?.user?.id) {
		return new Response("Accès non autorisé", { status: 403 });
	}

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
		return new Response(
			JSON.stringify({ error: result.error.issues[0]?.message }),
			{ status: 400, headers: { "Content-Type": "application/json" } }
		);
	}

	const where = buildExportWhereClause(result.data);

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
}
