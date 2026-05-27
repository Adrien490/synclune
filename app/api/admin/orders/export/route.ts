import { requireAdminApiRoute } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { getOrdersForExport } from "@/modules/orders/data/get-orders-for-export";
import { exportInvoicesSchema } from "@/modules/orders/schemas/order.schemas";
import {
	buildExportWhereClause,
	generateOrdersCsv,
} from "@/modules/orders/services/export-orders-csv.service";
import { logger } from "@/shared/lib/logger";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";

export async function GET(request: Request) {
	const admin = await requireAdminApiRoute();
	if ("response" in admin) return admin.response;

	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.EXPORT);
	if ("error" in rateLimit) {
		const retryAfter = "retryAfter" in rateLimit.error ? rateLimit.error.retryAfter : undefined;
		return new Response(JSON.stringify({ error: rateLimit.error.message }), {
			status: 429,
			headers: {
				"Content-Type": "application/json",
				...(retryAfter !== undefined && { "Retry-After": String(retryAfter) }),
			},
		});
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
		return new Response(JSON.stringify({ error: result.error.issues[0]?.message }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const where = buildExportWhereClause(result.data);

	try {
		const orders = await getOrdersForExport(where);
		const csv = generateOrdersCsv(orders);

		const now = new Date();
		const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		const filename = `livre-recettes-${dateStr}.csv`;

		return new Response(csv, {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="${filename}"`,
				// ORD-SEC-009: defense en profondeur — empeche sniff MIME (anti-XSS si CSV
				// ouvert dans navigateur), iframe embedding (anti-clickjack), referrer leak.
				"X-Content-Type-Options": "nosniff",
				"X-Frame-Options": "DENY",
				"Referrer-Policy": "no-referrer",
				"Cache-Control": "private, no-store",
			},
		});
	} catch (error) {
		logger.error("Failed to export orders", error, { route: "admin-orders-export" });
		return new Response(JSON.stringify({ error: "Erreur lors de l'export" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
