"use client";

import type { GetRevenueChartReturn } from "@/modules/dashboard/data/get-revenue-chart";
import { RevenueChart } from "./revenue-chart";

interface LazyRevenueChartProps {
	chartData: GetRevenueChartReturn;
}

export function LazyRevenueChart({ chartData }: LazyRevenueChartProps) {
	return <RevenueChart chartData={chartData} />;
}
