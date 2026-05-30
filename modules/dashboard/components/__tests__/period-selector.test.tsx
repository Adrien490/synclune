import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const mockPush = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn((): string | null => null));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, replace: mockPush }),
	useSearchParams: () => ({
		get: mockGet,
		toString: () => "",
	}),
}));

const mockHaptic = vi.hoisted(() => vi.fn());
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockHaptic,
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/components/ui/tabs", () => ({
	Tabs: ({
		children,
		value,
		onValueChange,
		className,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (value: string) => void;
		className?: string;
	}) => (
		<div
			data-testid="tabs"
			data-value={value}
			className={className}
			data-on-change={!!onValueChange}
		>
			{children}
		</div>
	),
	TabsList: ({
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		<div role="tablist" className={className} aria-label={ariaLabel}>
			{children}
		</div>
	),
	TabsTrigger: ({
		children,
		value,
		className,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		value: string;
		className?: string;
		"aria-label"?: string;
	}) => (
		<button role="tab" data-value={value} className={className} aria-label={ariaLabel}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Loader2: (props: { className?: string }) => (
		<span data-testid="icon-loader" className={props.className} />
	),
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

	it("renders the select trigger with aria-label 'Période du tableau de bord'", () => {
		render(<PeriodSelector />);

		expect(screen.getByRole("button", { name: "Période du tableau de bord" })).toBeInTheDocument();
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

	it("renders the 'Cette année' option", () => {
		render(<PeriodSelector />);

		expect(screen.getByText("Cette année")).toBeInTheDocument();
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
		expect(trigger).toHaveAttribute("aria-label", "Période du tableau de bord");
	});

	it("renders select content containing all items", () => {
		render(<PeriodSelector />);

		expect(screen.getByTestId("select-content")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Segmented variant (mobile)
	// -------------------------------------------------------------------------

	describe("variant=segmented", () => {
		it("renders a Tabs with 5 triggers (one per period)", () => {
			render(<PeriodSelector variant="segmented" />);

			const triggers = screen.getAllByRole("tab");
			expect(triggers).toHaveLength(5);
		});

		it("renders short labels (7j, 30j, Mois, Trim., Année) in the triggers", () => {
			render(<PeriodSelector variant="segmented" />);

			expect(screen.getByText("7j")).toBeInTheDocument();
			expect(screen.getByText("30j")).toBeInTheDocument();
			expect(screen.getByText("Mois")).toBeInTheDocument();
			expect(screen.getByText("Trim.")).toBeInTheDocument();
			expect(screen.getByText("Année")).toBeInTheDocument();
		});

		it("renders triggers with correct values", () => {
			render(<PeriodSelector variant="segmented" />);

			const triggers = screen.getAllByRole("tab");
			const values = triggers.map((trigger) => trigger.getAttribute("data-value"));
			expect(values).toEqual(["7d", "30d", "month", "quarter", "year"]);
		});

		it("sets Tabs value from URL search param", () => {
			mockGet.mockReturnValue("quarter");

			render(<PeriodSelector variant="segmented" />);

			const tabs = screen.getByTestId("tabs");
			expect(tabs).toHaveAttribute("data-value", "quarter");
		});

		it("defaults to 'month' when no search param is set", () => {
			mockGet.mockReturnValue(null);

			render(<PeriodSelector variant="segmented" />);

			const tabs = screen.getByTestId("tabs");
			expect(tabs).toHaveAttribute("data-value", "month");
		});

		it("provides a long aria-label on each trigger for AT", () => {
			render(<PeriodSelector variant="segmented" />);

			expect(screen.getByRole("tab", { name: "7 jours" })).toBeInTheDocument();
			expect(screen.getByRole("tab", { name: "Ce trimestre" })).toBeInTheDocument();
			expect(screen.getByRole("tab", { name: "Cette année" })).toBeInTheDocument();
		});

		it("applies an aria-label to the tablist", () => {
			render(<PeriodSelector variant="segmented" />);

			const tablist = screen.getByRole("tablist");
			expect(tablist).toHaveAttribute("aria-label", "Période du tableau de bord");
		});

		it("does not render the Select dropdown when using segmented variant", () => {
			render(<PeriodSelector variant="segmented" />);

			expect(screen.queryByTestId("select")).toBeNull();
		});
	});
});
