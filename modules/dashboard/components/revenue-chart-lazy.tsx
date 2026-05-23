"use client";

import type { GetRevenueChartReturn } from "@/modules/dashboard/data/get-revenue-chart";
import { RevenueChart } from "./revenue-chart";
import type { ChartMode } from "../constants/period.constants";

interface LazyRevenueChartProps {
	chartData: GetRevenueChartReturn;
	chartMode?: ChartMode;
}

export function LazyRevenueChart({ chartData, chartMode }: LazyRevenueChartProps) {
	return (
		<RevenueChart chartData={chartData} periodLabel={chartData.periodLabel} chartMode={chartMode} />
	);
}
