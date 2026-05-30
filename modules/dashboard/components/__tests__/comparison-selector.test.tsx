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
	ArrowLeftRight: (props: { className?: string }) => (
		<span data-testid="icon-compare" className={props.className} />
	),
}));

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({ children, value }: { children: React.ReactNode; value?: string }) => (
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

import { ComparisonSelector } from "../comparison-selector";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("ComparisonSelector", () => {
	it("renders the select trigger with aria-label 'Mode de comparaison'", () => {
		render(<ComparisonSelector />);

		expect(screen.getByRole("button", { name: "Mode de comparaison" })).toBeInTheDocument();
	});

	it("defaults to 'previous' when no search param is set", () => {
		mockGet.mockReturnValue(null);

		render(<ComparisonSelector />);

		expect(screen.getByTestId("select")).toHaveAttribute("data-value", "previous");
	});

	it("reads 'yoy' from useSearchParams", () => {
		mockGet.mockReturnValue("yoy");

		render(<ComparisonSelector />);

		expect(screen.getByTestId("select")).toHaveAttribute("data-value", "yoy");
	});

	it("falls back to 'previous' for an unknown search param value", () => {
		mockGet.mockReturnValue("garbage");

		render(<ComparisonSelector />);

		expect(screen.getByTestId("select")).toHaveAttribute("data-value", "previous");
	});

	it("renders the 2 comparison-mode options", () => {
		render(<ComparisonSelector />);

		const items = screen.getAllByTestId("select-item");
		expect(items).toHaveLength(2);
		const values = items.map((item) => item.getAttribute("data-value"));
		expect(values).toEqual(["previous", "yoy"]);
	});

	it("renders the human labels", () => {
		render(<ComparisonSelector />);

		expect(screen.getByText("Période précédente")).toBeInTheDocument();
		expect(screen.getByText("Année précédente")).toBeInTheDocument();
	});

	it("renders a leading compare icon in the select trigger", () => {
		render(<ComparisonSelector />);

		expect(screen.getByTestId("icon-compare")).toBeInTheDocument();
	});

	it("reads the comparison search param", () => {
		mockGet.mockReturnValue("yoy");

		render(<ComparisonSelector />);

		expect(mockGet).toHaveBeenCalledWith("comparison");
	});

	describe("variant=segmented", () => {
		it("renders a Tabs with 2 triggers", () => {
			render(<ComparisonSelector variant="segmented" />);

			expect(screen.getAllByRole("tab")).toHaveLength(2);
		});

		it("renders trigger values previous + yoy", () => {
			render(<ComparisonSelector variant="segmented" />);

			const values = screen.getAllByRole("tab").map((t) => t.getAttribute("data-value"));
			expect(values).toEqual(["previous", "yoy"]);
		});

		it("renders short labels (Préc., N-1) as visible text", () => {
			render(<ComparisonSelector variant="segmented" />);

			expect(screen.getByText("Préc.")).toBeInTheDocument();
			expect(screen.getByText("N-1")).toBeInTheDocument();
		});

		it("keeps the full label as accessible name on each trigger", () => {
			render(<ComparisonSelector variant="segmented" />);

			expect(screen.getByRole("tab", { name: "Période précédente" })).toBeInTheDocument();
			expect(screen.getByRole("tab", { name: "Année précédente" })).toBeInTheDocument();
		});

		it("sets Tabs value from URL search param", () => {
			mockGet.mockReturnValue("yoy");

			render(<ComparisonSelector variant="segmented" />);

			expect(screen.getByTestId("tabs")).toHaveAttribute("data-value", "yoy");
		});

		it("applies an aria-label to the tablist", () => {
			render(<ComparisonSelector variant="segmented" />);

			expect(screen.getByRole("tablist")).toHaveAttribute("aria-label", "Mode de comparaison");
		});

		it("does not render the Select dropdown in segmented variant", () => {
			render(<ComparisonSelector variant="segmented" />);

			expect(screen.queryByTestId("select")).toBeNull();
		});
	});
});
