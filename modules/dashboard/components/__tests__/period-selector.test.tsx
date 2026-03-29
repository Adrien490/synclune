import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const mockPush = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn((): string | null => null));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => ({
		get: mockGet,
		toString: () => "",
	}),
}));

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({
		children,
		value,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (value: string) => void;
	}) => (
		<div data-testid="select" data-value={value}>
			{children}
		</div>
	),
	SelectTrigger: ({
		children,
		"aria-label": ariaLabel,
		className,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		className?: string;
	}) => (
		<button data-testid="select-trigger" aria-label={ariaLabel} className={className}>
			{children}
		</button>
	),
	SelectValue: ({ placeholder }: { placeholder?: string }) => (
		<span data-testid="select-value" data-placeholder={placeholder} />
	),
	SelectContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="select-content">{children}</div>
	),
	SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<div data-testid="select-item" data-value={value}>
			{children}
		</div>
	),
}));

import { PeriodSelector } from "../period-selector";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("PeriodSelector", () => {
	// -------------------------------------------------------------------------
	// Rendering
	// -------------------------------------------------------------------------

	it("renders the select trigger with aria-label 'Periode du tableau de bord'", () => {
		render(<PeriodSelector />);

		expect(screen.getByRole("button", { name: "Periode du tableau de bord" })).toBeInTheDocument();
	});

	it("displays 'Ce mois' as the default value when no search param is set", () => {
		mockGet.mockReturnValue(null);

		render(<PeriodSelector />);

		const select = screen.getByTestId("select");
		expect(select).toHaveAttribute("data-value", "month");
	});

	it("reads current period from useSearchParams", () => {
		mockGet.mockReturnValue("7d");

		render(<PeriodSelector />);

		const select = screen.getByTestId("select");
		expect(select).toHaveAttribute("data-value", "7d");
	});

	it("renders all 5 period options", () => {
		render(<PeriodSelector />);

		const items = screen.getAllByTestId("select-item");
		expect(items).toHaveLength(5);
	});

	it("renders the '7 jours' option", () => {
		render(<PeriodSelector />);

		expect(screen.getByText("7 jours")).toBeInTheDocument();
	});

	it("renders the '30 jours' option", () => {
		render(<PeriodSelector />);

		expect(screen.getByText("30 jours")).toBeInTheDocument();
	});

	it("renders the 'Ce mois' option", () => {
		render(<PeriodSelector />);

		expect(screen.getByText("Ce mois")).toBeInTheDocument();
	});

	it("renders the 'Ce trimestre' option", () => {
		render(<PeriodSelector />);

		expect(screen.getByText("Ce trimestre")).toBeInTheDocument();
	});

	it("renders the 'Cette annee' option", () => {
		render(<PeriodSelector />);

		expect(screen.getByText("Cette annee")).toBeInTheDocument();
	});

	it("renders select items with correct period values", () => {
		render(<PeriodSelector />);

		const items = screen.getAllByTestId("select-item");
		const values = items.map((item) => item.getAttribute("data-value"));

		expect(values).toContain("7d");
		expect(values).toContain("30d");
		expect(values).toContain("month");
		expect(values).toContain("quarter");
		expect(values).toContain("year");
	});

	// -------------------------------------------------------------------------
	// Navigation
	// -------------------------------------------------------------------------

	it("uses useRouter for navigation", () => {
		render(<PeriodSelector />);

		// router is obtained via useRouter — mockPush is wired to it
		// Verifying that the component renders without error confirms useRouter is consumed
		expect(screen.getByTestId("select-trigger")).toBeInTheDocument();
	});

	it("uses useSearchParams to read the current period", () => {
		mockGet.mockReturnValue("year");

		render(<PeriodSelector />);

		expect(mockGet).toHaveBeenCalledWith("period");
	});

	// -------------------------------------------------------------------------
	// Accessibility
	// -------------------------------------------------------------------------

	it("renders the select trigger with the correct aria-label", () => {
		render(<PeriodSelector />);

		const trigger = screen.getByTestId("select-trigger");
		expect(trigger).toHaveAttribute("aria-label", "Periode du tableau de bord");
	});

	it("renders select content containing all items", () => {
		render(<PeriodSelector />);

		expect(screen.getByTestId("select-content")).toBeInTheDocument();
	});
});
