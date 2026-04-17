"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_DASHBOARD_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { handleActionError, success, validateInput, safeFormGet } from "@/shared/lib/actions";
import {
	exportDashboardSchema,
	type ExportDashboardInput,
} from "../schemas/export-dashboard.schema";
import { fetchDashboardKpis } from "../data/get-kpis";
import { fetchCustomerKpis } from "../data/get-customer-kpis";
import { fetchDashboardRevenueChart } from "../data/get-revenue-chart";
import { fetchTopProducts } from "../data/get-top-products";
import { fetchDashboardRecentOrders } from "../data/get-recent-orders";
import { buildDashboardExport } from "../services/export-builder.service";

export async function exportDashboardReport(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DASHBOARD_LIMITS.EXPORT);
		if ("error" in rateLimit) return rateLimit.error;

		const validation = validateInput<ExportDashboardInput>(exportDashboardSchema, {
			period: safeFormGet(formData, "period"),
			format: safeFormGet(formData, "format"),
		});
		if ("error" in validation) return validation.error;

		const { period, format } = validation.data;

		const [kpis, customerKpis, revenueChart, topProducts, recentOrders] = await Promise.all([
			fetchDashboardKpis(period),
			fetchCustomerKpis(period),
			fetchDashboardRevenueChart(period),
			fetchTopProducts(period),
			fetchDashboardRecentOrders(),
		]);

		const payload = buildDashboardExport(period, format, {
			kpis,
			customerKpis,
			revenueChart,
			topProducts,
			recentOrders,
		});

		return success("Rapport genere", payload);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la generation du rapport");
	}
}
