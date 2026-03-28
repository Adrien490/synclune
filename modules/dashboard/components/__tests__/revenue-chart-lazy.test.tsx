import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GetRevenueChartReturn } from "../../types/dashboard.types";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("../revenue-chart", () => ({
	RevenueChart: ({ chartData }: { chartData: GetRevenueChartReturn }) => (
		<div data-testid="revenue-chart" data-count={chartData.data.length} />
	),
}));

import { LazyRevenueChart } from "../revenue-chart-lazy";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function makeChartData(count = 3): GetRevenueChartReturn {
	return {
		data: Array.from({ length: count }, (_, i) => ({
			date: `${i + 1} janv.`,
			revenue: 100 * (i + 1),
			orders: i + 1,
			subtotal: 0,
			discounts: 0,
			shipping: 0,
		})),
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("LazyRevenueChart", () => {
	it("renders the RevenueChart component", () => {
		render(<LazyRevenueChart chartData={makeChartData()} />);

		expect(screen.getByTestId("revenue-chart")).toBeInTheDocument();
	});

	it("passes chartData to RevenueChart", () => {
		render(<LazyRevenueChart chartData={makeChartData(5)} />);

		expect(screen.getByTestId("revenue-chart")).toHaveAttribute("data-count", "5");
	});

	it("renders with empty data", () => {
		render(<LazyRevenueChart chartData={{ data: [] }} />);

		expect(screen.getByTestId("revenue-chart")).toHaveAttribute("data-count", "0");
	});
});
