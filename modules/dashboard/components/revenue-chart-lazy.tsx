"use client";

import dynamic from "next/dynamic";
import type { GetRevenueChartReturn } from "@/modules/dashboard/data/get-revenue-chart";
import { ChartSkeleton } from "./skeletons";

const RevenueChart = dynamic(
	() => import("./revenue-chart").then((mod) => ({ default: mod.RevenueChart })),
	{
		ssr: false,
		loading: () => <ChartSkeleton height={300} ariaLabel="Chargement du graphique des revenus" />,
	},
);

interface LazyRevenueChartProps {
	chartData: GetRevenueChartReturn;
}

export function LazyRevenueChart({ chartData }: LazyRevenueChartProps) {
	return <RevenueChart chartData={chartData} />;
}
