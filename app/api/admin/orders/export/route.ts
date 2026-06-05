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
import { prisma } from "@/shared/lib/prisma";
import { OrderAction, HistorySource } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";

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

		// EINV-SEC-005 : audit-trail RGPD Art. 30 sur l'export massif (insider threat).
		// FAIL-CLOSED (audit 2026-05-30) : l'export sort l'intégralité des données
		// clients (livre de recettes). Si la trace Art. 30 ne peut PAS être écrite,
		// on REFUSE l'export — un téléchargement de masse non journalisé est
		// précisément ce que le registre doit empêcher. L'admin réessaiera (action
		// idempotente, aucune mutation comptable). Contrairement au téléchargement
		// d'UNE facture par son propriétaire (droit client → best-effort), l'export
		// admin de TOUTES les commandes ne souffre aucun trou de traçabilité.
		// orderId NULL accepté (OrderHistory.orderId String?) : audit "global".
		try {
			await prisma.orderHistory.create({
				data: {
					orderId: null,
					action: OrderAction.BULK_EXPORT,
					authorId: admin.user.id,
					source: HistorySource.ADMIN,
					note: `Export CSV livre de recettes — ${orders.length} lignes`,
					metadata: {
						exportType: "ORDERS_CSV",
						rowCount: orders.length,
						periodType: result.data.periodType,
						year: result.data.year,
						month: result.data.month,
						dateFrom: result.data.dateFrom,
						dateTo: result.data.dateTo,
						format: result.data.format,
						invoiceStatus: result.data.invoiceStatus,
					},
				},
			});
			Sentry.addBreadcrumb({
				category: "admin-export",
				message: "orders-csv-exported",
				level: "info",
				data: { adminUserId: admin.user.id, rowCount: orders.length },
			});
		} catch (auditError) {
			logger.error("BULK_EXPORT audit write failed — export aborted (Art. 30)", auditError, {
				service: "admin-orders-export",
				adminUserId: admin.user.id,
			});
			Sentry.captureException(auditError, {
				level: "error",
				tags: { feature: "rgpd-audit", action: "BULK_EXPORT" },
				extra: { adminUserId: admin.user.id, rowCount: orders.length },
			});
			return new Response(
				JSON.stringify({
					error: "Export refusé : la journalisation d'audit a échoué. Réessayez.",
				}),
				{ status: 503, headers: { "Content-Type": "application/json" } },
			);
		}

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
