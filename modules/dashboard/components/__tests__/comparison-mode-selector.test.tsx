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
});
