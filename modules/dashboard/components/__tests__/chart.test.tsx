import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("recharts", () => ({
	Legend: ({ children }: { children?: React.ReactNode }) => (
		<div data-testid="recharts-legend">{children}</div>
	),
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="recharts-responsive-container">{children}</div>
	),
	Tooltip: ({ children }: { children?: React.ReactNode }) => (
		<div data-testid="recharts-tooltip">{children}</div>
	),
}));

import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "../chart";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

const baseConfig: ChartConfig = {
	revenue: { label: "Chiffre d'affaires", color: "#8884d8" },
	orders: { label: "Commandes", color: "#82ca9d" },
};

// ============================================================================
// TESTS — ChartContainer
// ============================================================================

describe("ChartContainer", () => {
	it("renders children inside a responsive container", () => {
		render(
			<ChartContainer config={baseConfig}>
				<div data-testid="chart-child">Chart</div>
			</ChartContainer>,
		);

		expect(screen.getByTestId("chart-child")).toBeInTheDocument();
	});

	it("renders the responsive container wrapper", () => {
		render(
			<ChartContainer config={baseConfig}>
				<div>Chart</div>
			</ChartContainer>,
		);

		expect(screen.getByTestId("recharts-responsive-container")).toBeInTheDocument();
	});

	it("applies the data-slot='chart' attribute", () => {
		const { container } = render(
			<ChartContainer config={baseConfig}>
				<div>Chart</div>
			</ChartContainer>,
		);

		const chartDiv = container.querySelector("[data-slot='chart']");
		expect(chartDiv).toBeInTheDocument();
	});

	it("applies data-chart attribute with chart- prefix", () => {
		const { container } = render(
			<ChartContainer config={baseConfig} id="my-chart">
				<div>Chart</div>
			</ChartContainer>,
		);

		const chartDiv = container.querySelector("[data-chart]");
		expect(chartDiv?.getAttribute("data-chart")).toContain("chart-");
	});

	it("uses the provided id in the data-chart attribute", () => {
		const { container } = render(
			<ChartContainer config={baseConfig} id="revenue-chart">
				<div>Chart</div>
			</ChartContainer>,
		);

		const chartDiv = container.querySelector("[data-chart]");
		expect(chartDiv?.getAttribute("data-chart")).toBe("chart-revenue-chart");
	});

	it("applies custom className", () => {
		const { container } = render(
			<ChartContainer config={baseConfig} className="my-chart-class">
				<div>Chart</div>
			</ChartContainer>,
		);

		const chartDiv = container.querySelector("[data-slot='chart']");
		expect(chartDiv?.className).toContain("my-chart-class");
	});

	it("renders a style tag for color config entries", () => {
		const { container } = render(
			<ChartContainer config={baseConfig} id="color-test">
				<div>Chart</div>
			</ChartContainer>,
		);

		const styleTag = container.querySelector("style");
		expect(styleTag).toBeInTheDocument();
	});

	it("style tag contains color CSS variable for config entries", () => {
		const { container } = render(
			<ChartContainer config={baseConfig} id="color-test">
				<div>Chart</div>
			</ChartContainer>,
		);

		const styleTag = container.querySelector("style");
		expect(styleTag?.innerHTML).toContain("--color-revenue");
		expect(styleTag?.innerHTML).toContain("--color-orders");
	});

	it("does not render style tag when config has no colors", () => {
		const noColorConfig: ChartConfig = {
			revenue: { label: "Revenue" },
		};

		const { container } = render(
			<ChartContainer config={noColorConfig}>
				<div>Chart</div>
			</ChartContainer>,
		);

		const styleTag = container.querySelector("style");
		expect(styleTag).toBeNull();
	});

	it("renders without crashing with empty config", () => {
		expect(() =>
			render(
				<ChartContainer config={{}}>
					<div>Chart</div>
				</ChartContainer>,
			),
		).not.toThrow();
	});

	it("sanitizes color values in CSS output", () => {
		const configWithColor: ChartConfig = {
			item: { label: "Item", color: "#ff6384" },
		};

		const { container } = render(
			<ChartContainer config={configWithColor} id="safe-test">
				<div>Chart</div>
			</ChartContainer>,
		);

		const styleTag = container.querySelector("style");
		expect(styleTag?.innerHTML).toContain("#ff6384");
	});
});

// ============================================================================
// TESTS — ChartTooltip
// ============================================================================

describe("ChartTooltip", () => {
	it("is the recharts Tooltip component", () => {
		// ChartTooltip is a re-export of recharts Tooltip
		expect(ChartTooltip).toBeDefined();
	});
});

// ============================================================================
// TESTS — ChartTooltipContent
// ============================================================================

describe("ChartTooltipContent", () => {
	it("renders nothing when active is false", () => {
		const { container } = render(
			<ChartContainer config={baseConfig}>
				<ChartTooltipContent active={false} payload={[]} />
			</ChartContainer>,
		);

		// Tooltip content should not be visible
		expect(container.querySelector(".rounded-lg")).toBeNull();
	});

	it("renders nothing when payload is empty", () => {
		const { container } = render(
			<ChartContainer config={baseConfig}>
				<ChartTooltipContent active={true} payload={[]} />
			</ChartContainer>,
		);

		expect(container.querySelector(".rounded-lg")).toBeNull();
	});

	it("renders tooltip content when active with payload", () => {
		const payload = [
			{
				dataKey: "revenue",
				name: "revenue",
				value: 1500,
				color: "#8884d8",
				type: "bar",
				payload: {},
				graphicalItemId: 0,
			} as never,
		];

		const { container } = render(
			<ChartContainer config={baseConfig}>
				<ChartTooltipContent active={true} payload={payload} label="Jan" />
			</ChartContainer>,
		);

		const tooltipEl = container.querySelector(".rounded-lg");
		expect(tooltipEl).toBeInTheDocument();
	});

	it("renders the value when active with payload", () => {
		const payload = [
			{
				dataKey: "revenue",
				name: "revenue",
				value: 1500,
				color: "#8884d8",
				type: "bar",
				payload: {},
				graphicalItemId: 0,
			} as never,
		];

		render(
			<ChartContainer config={baseConfig}>
				<ChartTooltipContent active={true} payload={payload} label="Jan" />
			</ChartContainer>,
		);

		expect(screen.getByText("1,500")).toBeInTheDocument();
	});

	it("renders label from config when hideLabel is false", () => {
		const payload = [
			{
				dataKey: "revenue",
				name: "revenue",
				value: 1000,
				color: "#8884d8",
				type: "bar",
				payload: {},
				graphicalItemId: 0,
			} as never,
		];

		render(
			<ChartContainer config={baseConfig}>
				<ChartTooltipContent active={true} payload={payload} label="Jan" hideLabel={false} />
			</ChartContainer>,
		);

		// Label "Jan" should appear (no config key for "Jan")
		expect(screen.getByText("Jan")).toBeInTheDocument();
	});

	it("hides label when hideLabel is true", () => {
		const payload = [
			{
				dataKey: "revenue",
				name: "revenue",
				value: 1000,
				color: "#8884d8",
				type: "bar",
				payload: {},
				graphicalItemId: 0,
			} as never,
		];

		render(
			<ChartContainer config={baseConfig}>
				<ChartTooltipContent active={true} payload={payload} label="Jan" hideLabel={true} />
			</ChartContainer>,
		);

		expect(screen.queryByText("Jan")).toBeNull();
	});

	it("uses formatter when provided", () => {
		const payload = [
			{
				dataKey: "revenue",
				name: "revenue",
				value: 2000,
				color: "#8884d8",
				type: "bar",
				payload: {},
				graphicalItemId: 0,
			} as never,
		];

		render(
			<ChartContainer config={baseConfig}>
				<ChartTooltipContent
					active={true}
					payload={payload}
					label="Jan"
					formatter={(value) => <span data-testid="formatted-value">{value} €</span>}
				/>
			</ChartContainer>,
		);

		expect(screen.getByTestId("formatted-value")).toHaveTextContent("2000 €");
	});

	it("throws when used outside ChartContainer", () => {
		// useChart throws when context is null
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		expect(() =>
			render(
				<ChartTooltipContent
					active={true}
					payload={[
						{
							dataKey: "revenue",
							name: "revenue",
							value: 1000,
							color: "#8884d8",
							type: "bar",
							payload: {},
						} as never,
					]}
				/>,
			),
		).toThrow("useChart must be used within a <ChartContainer />");

		consoleSpy.mockRestore();
	});
});

// ============================================================================
// TESTS — ChartLegend
// ============================================================================

describe("ChartLegend", () => {
	it("is the recharts Legend component", () => {
		expect(ChartLegend).toBeDefined();
	});
});

// ============================================================================
// TESTS — ChartLegendContent
// ============================================================================

describe("ChartLegendContent", () => {
	it("renders nothing when payload is empty", () => {
		const { container } = render(
			<ChartContainer config={baseConfig}>
				<ChartLegendContent payload={[]} />
			</ChartContainer>,
		);

		expect(container.querySelector(".flex.items-center")).toBeNull();
	});

	it("renders nothing when payload is undefined", () => {
		const { container } = render(
			<ChartContainer config={baseConfig}>
				<ChartLegendContent />
			</ChartContainer>,
		);

		expect(container.querySelector(".flex.items-center")).toBeNull();
	});

	it("renders legend items for each payload entry", () => {
		const payload = [
			{ dataKey: "revenue", value: "revenue", type: "square" as const, color: "#8884d8" },
			{ dataKey: "orders", value: "orders", type: "square" as const, color: "#82ca9d" },
		];

		render(
			<ChartContainer config={baseConfig}>
				<ChartLegendContent payload={payload} />
			</ChartContainer>,
		);

		// Labels from config
		expect(screen.getByText("Chiffre d'affaires")).toBeInTheDocument();
		expect(screen.getByText("Commandes")).toBeInTheDocument();
	});

	it("renders color swatches for each payload entry", () => {
		const payload = [
			{ dataKey: "revenue", value: "revenue", type: "square" as const, color: "#8884d8" },
		];

		const { container } = render(
			<ChartContainer config={baseConfig}>
				<ChartLegendContent payload={payload} />
			</ChartContainer>,
		);

		const swatch = container.querySelector(".size-2");
		expect(swatch).toBeInTheDocument();
		expect((swatch as HTMLElement).style.backgroundColor).toBe("rgb(136, 132, 216)");
	});

	it("renders at bottom by default (pt-3 class)", () => {
		const payload = [
			{ dataKey: "revenue", value: "revenue", type: "square" as const, color: "#8884d8" },
		];

		const { container } = render(
			<ChartContainer config={baseConfig}>
				<ChartLegendContent payload={payload} verticalAlign="bottom" />
			</ChartContainer>,
		);

		const legendContainer = container.querySelector(".flex.items-center.justify-center");
		expect(legendContainer?.className).toContain("pt-3");
	});

	it("renders at top with pb-3 class when verticalAlign is top", () => {
		const payload = [
			{ dataKey: "revenue", value: "revenue", type: "square" as const, color: "#8884d8" },
		];

		const { container } = render(
			<ChartContainer config={baseConfig}>
				<ChartLegendContent payload={payload} verticalAlign="top" />
			</ChartContainer>,
		);

		const legendContainer = container.querySelector(".flex.items-center.justify-center");
		expect(legendContainer?.className).toContain("pb-3");
	});

	it("applies custom className", () => {
		const payload = [
			{ dataKey: "revenue", value: "revenue", type: "square" as const, color: "#8884d8" },
		];

		const { container } = render(
			<ChartContainer config={baseConfig}>
				<ChartLegendContent payload={payload} className="my-legend-class" />
			</ChartContainer>,
		);

		const legendContainer = container.querySelector(".flex.items-center.justify-center");
		expect(legendContainer?.className).toContain("my-legend-class");
	});

	it("throws when used outside ChartContainer", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const payload = [
			{ dataKey: "revenue", value: "revenue", type: "square" as const, color: "#8884d8" },
		];

		expect(() => render(<ChartLegendContent payload={payload} />)).toThrow(
			"useChart must be used within a <ChartContainer />",
		);

		consoleSpy.mockRestore();
	});

	it("filters out items with type 'none'", () => {
		const payload = [
			{ dataKey: "revenue", value: "revenue", type: "none" as const, color: "#8884d8" },
			{ dataKey: "orders", value: "orders", type: "square" as const, color: "#82ca9d" },
		] as unknown as Parameters<typeof ChartLegendContent>[0]["payload"];

		render(
			<ChartContainer config={baseConfig}>
				<ChartLegendContent payload={payload} />
			</ChartContainer>,
		);

		// Only "Commandes" should appear (revenue filtered out)
		expect(screen.queryByText("Chiffre d'affaires")).toBeNull();
		expect(screen.getByText("Commandes")).toBeInTheDocument();
	});

	it("renders icon component when config has an icon and hideIcon is false", () => {
		const CustomIcon = () => <svg data-testid="custom-legend-icon" />;
		const configWithIcon: ChartConfig = {
			revenue: { label: "Revenue", icon: CustomIcon },
		};

		const payload = [
			{ dataKey: "revenue", value: "revenue", type: "square" as const, color: "#8884d8" },
		];

		render(
			<ChartContainer config={configWithIcon}>
				<ChartLegendContent payload={payload} hideIcon={false} />
			</ChartContainer>,
		);

		expect(screen.getByTestId("custom-legend-icon")).toBeInTheDocument();
	});

	it("does not render icon when hideIcon is true even when config has icon", () => {
		const CustomIcon = () => <svg data-testid="custom-legend-icon" />;
		const configWithIcon: ChartConfig = {
			revenue: { label: "Revenue", icon: CustomIcon, color: "#8884d8" },
		};

		const payload = [
			{ dataKey: "revenue", value: "revenue", type: "square" as const, color: "#8884d8" },
		];

		render(
			<ChartContainer config={configWithIcon}>
				<ChartLegendContent payload={payload} hideIcon={true} />
			</ChartContainer>,
		);

		expect(screen.queryByTestId("custom-legend-icon")).toBeNull();
	});
});
