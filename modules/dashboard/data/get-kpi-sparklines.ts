import { PaymentStatus } from "@/app/generated/prisma";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";

/**
 * Type de retour pour les donnees de sparkline
 */
export interface KpiSparklineData {
	/** Revenus quotidiens des 7 derniers jours */
	dailyRevenue: { value: number }[];
	/** Nombre de commandes quotidiennes des 7 derniers jours */
	dailyOrders: { value: number }[];
	/** Panier moyen quotidien des 7 derniers jours */
	dailyAov: { value: number }[];
}

/**
 * Genere un tableau des 7 derniers jours (dates formatees YYYY-MM-DD)
 */
function getLast7Days(): string[] {
	const days: string[] = [];
	const now = new Date();

	for (let i = 6; i >= 0; i--) {
		const d = new Date(now);
		d.setDate(d.getDate() - i);
		days.push(d.toISOString().split("T")[0]);
	}

	return days;
}

/**
 * Recupere les donnees de sparkline pour les KPIs (7 derniers jours)
 * Utilise pour afficher une tendance visuelle sur les KpiCard
 */
export async function fetchKpiSparklines(): Promise<KpiSparklineData> {
	"use cache: remote";

	cacheDashboard();

	const now = new Date();
	const sevenDaysAgo = new Date(now);
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
	sevenDaysAgo.setHours(0, 0, 0, 0);

	// Requete agregee pour les 7 derniers jours
	// Note: AT TIME ZONE 'UTC' garantit la coherence des dates independamment du timezone serveur
	const dailyData = await prisma.$queryRaw<
		{ date: string; revenue: bigint; orders_count: bigint }[]
	>`
		SELECT
			TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
			COALESCE(SUM(total), 0) as revenue,
			COUNT(*) as orders_count
		FROM "Order"
		WHERE "createdAt" AT TIME ZONE 'UTC' >= ${sevenDaysAgo}
			AND "paymentStatus" = 'PAID'::"PaymentStatus"
		GROUP BY TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
		ORDER BY date ASC
	`;

	// Generer les 7 jours (meme sans donnees)
	const days = getLast7Days();

	// Mapper les donnees par date
	const dataMap = new Map(
		dailyData.map((row) => [
			row.date,
			{
				revenue: Number(row.revenue) / 100, // Convertir centimes en euros
				orders: Number(row.orders_count),
			},
		])
	);

	// Construire les tableaux de sparkline
	const dailyRevenue = days.map((d) => ({
		value: dataMap.get(d)?.revenue || 0,
	}));

	const dailyOrders = days.map((d) => ({
		value: dataMap.get(d)?.orders || 0,
	}));

	const dailyAov = days.map((d) => {
		const data = dataMap.get(d);
		if (!data || data.orders === 0) return { value: 0 };
		return { value: data.revenue / data.orders };
	});

	return {
		dailyRevenue,
		dailyOrders,
		dailyAov,
	};
}
