import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const mockGet = vi.hoisted(() => vi.fn((): string | null => null));

vi.mock("next/navigation", () => ({
	useSearchParams: () => ({
		get: mockGet,
	}),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("../period-selector", () => ({
	PeriodSelector: ({ fullWidth }: { fullWidth?: boolean }) => (
		<div data-testid="period-selector" data-full-width={fullWidth} />
	),
}));

vi.mock("../comparison-mode-selector", () => ({
	ComparisonModeSelector: ({ fullWidth }: { fullWidth?: boolean }) => (
		<div data-testid="comparison-mode-selector" data-full-width={fullWidth} />
	),
}));

vi.mock("../refresh-dashboard-button", () => ({
	RefreshDashboardButton: ({ variant }: { variant?: string }) => (
		<button data-testid="refresh-dashboard-button" data-variant={variant}>
			Rafraîchir
		</button>
	),
}));

const { COMPARISON_LABELS, YOY_COMPARISON_LABELS } = vi.hoisted(() => ({
	COMPARISON_LABELS: {
		"7d": "vs 7j précédents",
		"30d": "vs 30j précédents",
		month: "vs mois dernier",
		quarter: "vs trimestre dernier",
		year: "vs année dernière",
	} as Record<string, string>,
	YOY_COMPARISON_LABELS: {
		"7d": "vs N-1 (7j)",
		"30d": "vs N-1 (30j)",
		month: "vs même mois N-1",
		quarter: "vs même trimestre N-1",
		year: "vs année N-1",
	} as Record<string, string>,
}));

vi.mock("@/modules/dashboard/constants/period.constants", () => ({
	DEFAULT_PERIOD: "month",
	PERIOD_SEARCH_PARAM: "period",
	DEFAULT_COMPARISON_MODE: "previous",
	COMPARISON_MODE_SEARCH_PARAM: "comparison",
	COMPARISON_LABELS,
	YOY_COMPARISON_LABELS,
	getComparisonLabel: (period: string, mode: "previous" | "yoy"): string =>
		mode === "yoy" ? YOY_COMPARISON_LABELS[period] : COMPARISON_LABELS[period],
}));

import { DashboardMobileHeader } from "../dashboard-mobile-header";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("DashboardMobileHeader", () => {
	// -------------------------------------------------------------------------
	// Rendering
	// -------------------------------------------------------------------------

	it("renders the 'Tableau de bord' heading", () => {
		render(<DashboardMobileHeader />);

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tableau de bord");
	});

	it("renders the period selector", () => {
		render(<DashboardMobileHeader />);

		expect(screen.getByTestId("period-selector")).toBeInTheDocument();
	});

	it("renders the comparison mode selector", () => {
		render(<DashboardMobileHeader />);

		expect(screen.getByTestId("comparison-mode-selector")).toBeInTheDocument();
	});

	it("renders ComparisonModeSelector with fullWidth=true", () => {
		render(<DashboardMobileHeader />);

		const selector = screen.getByTestId("comparison-mode-selector");
		expect(selector).toHaveAttribute("data-full-width", "true");
	});

	it("uses YoY label when comparison search param is 'yoy'", () => {
		mockGet.mockImplementation((key: string) =>
			key === "comparison" ? "yoy" : key === "period" ? "month" : null,
		);

		render(<DashboardMobileHeader />);

		expect(screen.getByText("vs même mois N-1")).toBeInTheDocument();
	});

	it("renders the refresh button with outline variant", () => {
		render(<DashboardMobileHeader />);

		const button = screen.getByTestId("refresh-dashboard-button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveAttribute("data-variant", "outline");
	});

	it("renders the comparison label for the default period", () => {
		mockGet.mockReturnValue(null);

		render(<DashboardMobileHeader />);

		expect(screen.getByText("vs mois dernier")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Period-based comparison label
	// -------------------------------------------------------------------------

	it("renders comparison label for 7d period", () => {
		mockGet.mockReturnValue("7d");

		render(<DashboardMobileHeader />);

		expect(screen.getByText("vs 7j précédents")).toBeInTheDocument();
	});

	it("renders comparison label for 30d period", () => {
		mockGet.mockReturnValue("30d");

		render(<DashboardMobileHeader />);

		expect(screen.getByText("vs 30j précédents")).toBeInTheDocument();
	});

	it("renders comparison label for quarter period", () => {
		mockGet.mockReturnValue("quarter");

		render(<DashboardMobileHeader />);

		expect(screen.getByText("vs trimestre dernier")).toBeInTheDocument();
	});

	it("renders comparison label for year period", () => {
		mockGet.mockReturnValue("year");

		render(<DashboardMobileHeader />);

		expect(screen.getByText("vs année dernière")).toBeInTheDocument();
	});

	it("falls back to default period when search param is null", () => {
		mockGet.mockReturnValue(null);

		render(<DashboardMobileHeader />);

		// Default is "month" → "vs mois dernier"
		expect(screen.getByText("vs mois dernier")).toBeInTheDocument();
	});

	it("reads period from search params using PERIOD_SEARCH_PARAM key", () => {
		mockGet.mockReturnValue("year");

		render(<DashboardMobileHeader />);

		expect(mockGet).toHaveBeenCalledWith("period");
	});

	// -------------------------------------------------------------------------
	// Props
	// -------------------------------------------------------------------------

	it("applies className prop to container", () => {
		const { container } = render(<DashboardMobileHeader className="custom-class" />);

		const root = container.firstChild as HTMLElement;
		expect(root.className).toContain("custom-class");
	});

	it("renders without className prop", () => {
		expect(() => render(<DashboardMobileHeader />)).not.toThrow();
	});

	// -------------------------------------------------------------------------
	// PeriodSelector props
	// -------------------------------------------------------------------------

	it("renders PeriodSelector with fullWidth=true", () => {
		render(<DashboardMobileHeader />);

		const selector = screen.getByTestId("period-selector");
		expect(selector).toHaveAttribute("data-full-width", "true");
	});

	// -------------------------------------------------------------------------
	// Layout structure
	// -------------------------------------------------------------------------

	it("renders heading, selector and refresh button together", () => {
		render(<DashboardMobileHeader />);

		expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
		expect(screen.getByTestId("period-selector")).toBeInTheDocument();
		expect(screen.getByTestId("refresh-dashboard-button")).toBeInTheDocument();
	});
});
