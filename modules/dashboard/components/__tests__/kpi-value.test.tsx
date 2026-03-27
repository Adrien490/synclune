import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/animations/animated-number", () => ({
	NumberTicker: ({
		value,
		decimalPlaces,
		delay,
	}: {
		value: number;
		decimalPlaces?: number;
		delay?: number;
	}) => (
		<span
			data-testid="number-ticker"
			data-value={value}
			data-decimals={decimalPlaces}
			data-delay={delay}
		>
			{value.toFixed(decimalPlaces ?? 0)}
		</span>
	),
}));

import { KpiValue } from "../kpi-value";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("KpiValue", () => {
	// -------------------------------------------------------------------------
	// Static rendering
	// -------------------------------------------------------------------------

	it("renders static value when numericValue is not provided", () => {
		render(<KpiValue value="1 234 €" />);

		expect(screen.getByText("1 234 €")).toBeInTheDocument();
		expect(screen.queryByTestId("number-ticker")).toBeNull();
	});

	it("renders string value directly", () => {
		render(<KpiValue value="N/A" />);

		expect(screen.getByText("N/A")).toBeInTheDocument();
	});

	it("renders number value as static text when numericValue is undefined", () => {
		render(<KpiValue value={42} />);

		expect(screen.getByText("42")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// NumberTicker rendering
	// -------------------------------------------------------------------------

	it("renders NumberTicker when numericValue is provided", () => {
		render(<KpiValue value="42 €" numericValue={42} />);

		expect(screen.getByTestId("number-ticker")).toBeInTheDocument();
	});

	it("passes numericValue to NumberTicker", () => {
		render(<KpiValue value="1500" numericValue={1500} />);

		expect(screen.getByTestId("number-ticker")).toHaveAttribute("data-value", "1500");
	});

	it("passes decimalPlaces to NumberTicker", () => {
		render(<KpiValue value="42.50 €" numericValue={42.5} decimalPlaces={2} />);

		expect(screen.getByTestId("number-ticker")).toHaveAttribute("data-decimals", "2");
	});

	it("passes animationDelay to NumberTicker", () => {
		render(<KpiValue value="100" numericValue={100} animationDelay={0.5} />);

		expect(screen.getByTestId("number-ticker")).toHaveAttribute("data-delay", "0.5");
	});

	it("renders suffix after NumberTicker", () => {
		render(<KpiValue value="42 €" numericValue={42} suffix=" €" />);

		const container = screen.getByTestId("number-ticker").parentElement;
		expect(container?.textContent).toContain("€");
	});

	it("does not render suffix when not provided", () => {
		render(<KpiValue value="42" numericValue={42} />);

		const ticker = screen.getByTestId("number-ticker");
		expect(ticker.parentElement?.textContent).toBe("42");
	});

	// -------------------------------------------------------------------------
	// Size variants
	// -------------------------------------------------------------------------

	it("applies featured size class (text-4xl)", () => {
		const { container } = render(<KpiValue value="100" size="featured" />);

		expect(container.firstChild).toHaveClass("text-4xl");
	});

	it("applies default size class (text-3xl)", () => {
		const { container } = render(<KpiValue value="100" size="default" />);

		expect(container.firstChild).toHaveClass("text-3xl");
	});

	it("applies compact size class (text-2xl)", () => {
		const { container } = render(<KpiValue value="100" size="compact" />);

		expect(container.firstChild).toHaveClass("text-2xl");
	});

	it("defaults to default size when not specified", () => {
		const { container } = render(<KpiValue value="100" />);

		expect(container.firstChild).toHaveClass("text-3xl");
	});

	// -------------------------------------------------------------------------
	// Edge cases
	// -------------------------------------------------------------------------

	it("renders NumberTicker with numericValue=0", () => {
		render(<KpiValue value="0 €" numericValue={0} suffix=" €" />);

		expect(screen.getByTestId("number-ticker")).toHaveAttribute("data-value", "0");
	});

	it("uses default decimalPlaces=0 when not specified", () => {
		render(<KpiValue value="42" numericValue={42} />);

		expect(screen.getByTestId("number-ticker")).toHaveAttribute("data-decimals", "0");
	});
});
