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
		<div data-testid="tabs" data-value={value} className={className}>
			{children}
			<button
				data-testid="mock-tabs-fire-yoy"
				type="button"
				onClick={() => onValueChange?.("yoy")}
			/>
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
		onValueChange,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (value: string) => void;
	}) => (
		<div data-testid="select" data-value={value}>
			{children}
			<button
				data-testid="mock-select-fire-change"
				onClick={() => onValueChange?.("yoy")}
				type="button"
			/>
			<button
				data-testid="mock-select-fire-same"
				onClick={() => onValueChange?.(value ?? "previous")}
				type="button"
			/>
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

import { ComparisonModeSelector } from "../comparison-mode-selector";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("ComparisonModeSelector", () => {
	it("renders the select trigger with aria-label 'Mode de comparaison'", () => {
		render(<ComparisonModeSelector />);

		expect(screen.getByRole("button", { name: "Mode de comparaison" })).toBeInTheDocument();
	});

	it("displays 'previous' as the default value when no search param is set", () => {
		mockGet.mockReturnValue(null);

		render(<ComparisonModeSelector />);

		const select = screen.getByTestId("select");
		expect(select).toHaveAttribute("data-value", "previous");
	});

	it("reads current comparison mode from useSearchParams", () => {
		mockGet.mockReturnValue("yoy");

		render(<ComparisonModeSelector />);

		const select = screen.getByTestId("select");
		expect(select).toHaveAttribute("data-value", "yoy");
	});

	it("renders both 'previous' and 'yoy' options", () => {
		render(<ComparisonModeSelector />);

		const items = screen.getAllByTestId("select-item");
		expect(items).toHaveLength(2);

		const values = items.map((item) => item.getAttribute("data-value")).sort();
		expect(values).toEqual(["previous", "yoy"]);
	});

	it("displays human-readable labels for both modes", () => {
		render(<ComparisonModeSelector />);

		expect(screen.getByText("Période précédente")).toBeInTheDocument();
		expect(screen.getByText("Année précédente")).toBeInTheDocument();
	});

	it("queries the 'comparison' search param", () => {
		mockGet.mockReturnValue("yoy");

		render(<ComparisonModeSelector />);

		expect(mockGet).toHaveBeenCalledWith("comparison");
	});

	it("renders fullWidth trigger when prop is set", () => {
		render(<ComparisonModeSelector fullWidth />);

		const trigger = screen.getByTestId("select-trigger");
		expect(trigger.className).toContain("w-full");
	});

	it("renders narrow trigger by default", () => {
		render(<ComparisonModeSelector />);

		const trigger = screen.getByTestId("select-trigger");
		expect(trigger.className).toContain("w-44");
	});

	it("triggers a 'selection' haptic when the value changes", async () => {
		mockGet.mockReturnValue("previous");
		const { fireEvent } = await import("@testing-library/react");

		render(<ComparisonModeSelector />);
		fireEvent.click(screen.getByTestId("mock-select-fire-change"));

		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("does not trigger a haptic when the selected value is unchanged", async () => {
		mockGet.mockReturnValue("previous");
		const { fireEvent } = await import("@testing-library/react");

		render(<ComparisonModeSelector />);
		fireEvent.click(screen.getByTestId("mock-select-fire-same"));

		expect(mockHaptic).not.toHaveBeenCalled();
	});

	describe("variant=segmented", () => {
		it("renders a Tabs with 2 triggers (previous, yoy)", () => {
			render(<ComparisonModeSelector variant="segmented" />);

			const triggers = screen.getAllByRole("tab");
			expect(triggers).toHaveLength(2);
			expect(triggers[0]).toHaveAttribute("data-value", "previous");
			expect(triggers[1]).toHaveAttribute("data-value", "yoy");
		});

		it("renders short labels (Précédente, N-1)", () => {
			render(<ComparisonModeSelector variant="segmented" />);

			expect(screen.getByText("Précédente")).toBeInTheDocument();
			expect(screen.getByText("N-1")).toBeInTheDocument();
		});

		it("provides the long label on each trigger via aria-label", () => {
			render(<ComparisonModeSelector variant="segmented" />);

			expect(screen.getByRole("tab", { name: "Période précédente" })).toBeInTheDocument();
			expect(screen.getByRole("tab", { name: "Année précédente" })).toBeInTheDocument();
		});

		it("fires a 'selection' haptic when the tab value changes", async () => {
			mockGet.mockReturnValue("previous");
			const { fireEvent } = await import("@testing-library/react");

			render(<ComparisonModeSelector variant="segmented" />);
			fireEvent.click(screen.getByTestId("mock-tabs-fire-yoy"));

			expect(mockHaptic).toHaveBeenCalledWith("selection");
		});

		it("applies an aria-label to the tablist", () => {
			render(<ComparisonModeSelector variant="segmented" />);
			const tablist = screen.getByRole("tablist");
			expect(tablist).toHaveAttribute("aria-label", "Mode de comparaison");
		});

		it("does not render the Select dropdown in segmented variant", () => {
			render(<ComparisonModeSelector variant="segmented" />);
			expect(screen.queryByTestId("select")).toBeNull();
		});
	});
});
