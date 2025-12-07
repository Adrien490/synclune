import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard, DASHBOARD_CACHE_TAGS } from "../constants/cache";
import type { GetRevenueYearReturn, RevenueYearDataPoint } from "../types/dashboard.types";

// Re-export pour compatibilite
export type { GetRevenueYearReturn, RevenueYearDataPoint } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour recuperer les tendances de revenus sur 12 mois
 */
export async function getRevenueTrends(): Promise<GetRevenueYearReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return await fetchRevenueTrends();
}

/**
 * Recupere les tendances de revenus sur 12 mois depuis la DB avec cache
 */
export async function fetchRevenueTrends(): Promise<GetRevenueYearReturn> {
	"use cache: remote";

	cacheDashboard(DASHBOARD_CACHE_TAGS.REVENUE_YEAR);

	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth(); // 0-indexed

	// 12 derniers mois complets + mois en cours
	const startDate = new Date(currentYear, currentMonth - 11, 1);
	const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

	// Meme periode l'annee precedente pour YoY
	const previousYearStartDate = new Date(currentYear - 1, currentMonth - 11, 1);
	const previousYearEndDate = new Date(currentYear - 1, currentMonth + 1, 0, 23, 59, 59, 999);

	// Requete pour les 12 derniers mois
	const monthlyData = await prisma.$queryRaw<
		{ month: string; revenue: bigint; orders_count: bigint }[]
	>`
		SELECT
			TO_CHAR("paidAt", 'YYYY-MM') as month,
			COALESCE(SUM(total), 0) as revenue,
			COUNT(*) as orders_count
		FROM "Order"
		WHERE "paymentStatus" = 'PAID'
		AND "paidAt" >= ${startDate}
		AND "paidAt" <= ${endDate}
		AND "deletedAt" IS NULL
		GROUP BY TO_CHAR("paidAt", 'YYYY-MM')
		ORDER BY month ASC
	`;

	// Revenus de l'annee precedente pour calcul YoY
	const previousYearTotal = await prisma.order.aggregate({
		where: {
			paymentStatus: "PAID",
			paidAt: {
				gte: previousYearStartDate,
				lte: previousYearEndDate,
			},
			deletedAt: null,
		},
		_sum: {
			total: true,
		},
	});

	// Generer tous les mois (meme ceux sans donnees)
	const monthLabels: string[] = [];
	for (let i = 0; i < 12; i++) {
		const d = new Date(currentYear, currentMonth - 11 + i, 1);
		const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
		monthLabels.push(monthKey);
	}

	// Mapper les donnees avec les mois generes
	const dataMap = new Map<string, { revenue: number; ordersCount: number }>();
	for (const row of monthlyData) {
		dataMap.set(row.month, {
			revenue: Math.round(Number(row.revenue)) / 100,
			ordersCount: Number(row.orders_count),
		});
	}

	const data: RevenueYearDataPoint[] = monthLabels.map((month) => {
		const existing = dataMap.get(month);
		return {
			month: formatMonthLabel(month),
			revenue: existing?.revenue || 0,
			ordersCount: existing?.ordersCount || 0,
		};
	});

	// Calcul du total et YoY
	const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
	const previousTotal = (previousYearTotal._sum.total || 0) / 100;
	const yoyEvolution =
		previousTotal > 0
			? ((totalRevenue - previousTotal) / previousTotal) * 100
			: 0;

	return {
		data,
		totalRevenue: Math.round(totalRevenue * 100) / 100,
		yoyEvolution: Math.round(yoyEvolution * 100) / 100,
	};
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formate le label du mois (YYYY-MM -> "Jan 24")
 */
function formatMonthLabel(monthKey: string): string {
	const [year, month] = monthKey.split("-");
	const monthNames = [
		"Jan",
		"Fev",
		"Mar",
		"Avr",
		"Mai",
		"Juin",
		"Juil",
		"Aout",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const monthIndex = parseInt(month, 10) - 1;
	const shortYear = year.slice(2);
	return `${monthNames[monthIndex]} ${shortYear}`;
}
