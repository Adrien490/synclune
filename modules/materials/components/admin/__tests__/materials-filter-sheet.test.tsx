import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as React from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRouterPush, mockSearchParams } = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockSearchParams: {
		current: new URLSearchParams(),
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
	useSearchParams: () => mockSearchParams.current,
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof React>();
	return {
		...actual,
		useTransition: () => [false, (fn: () => void) => fn()],
	};
});

vi.mock("@/shared/components/filter-sheet-wrapper", () => ({
	FilterSheetWrapper: ({
		children,
		hasActiveFilters,
		activeFiltersCount,
		onClearAll,
		onApply,
	}: {
		children: React.ReactNode;
		hasActiveFilters?: boolean;
		activeFiltersCount?: number;
		onClearAll?: () => void;
		onApply?: () => void;
	}) => (
		<div
			data-testid="filter-sheet-wrapper"
			data-active={String(hasActiveFilters)}
			data-count={activeFiltersCount}
		>
			<button data-testid="btn-clear" onClick={onClearAll}>
				Effacer
			</button>
			<button data-testid="btn-apply" onClick={onApply}>
				Appliquer
			</button>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: vi.fn(({ defaultValues }: { defaultValues: Record<string, string> }) => ({
		reset: vi.fn(),
		handleSubmit: vi.fn(),
		Field: ({
			name,
			children,
		}: {
			name: string;
			children: (field: {
				state: { value: string };
				handleChange: (v: string) => void;
			}) => React.ReactNode;
		}) =>
			children({
				state: { value: defaultValues[name] ?? "all" },
				handleChange: vi.fn(),
			}),
	})),
}));

vi.mock("@/shared/components/ui/radio-group", () => ({
	RadioGroup: ({
		children,
		value,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (v: string) => void;
	}) => (
		<div data-testid="radio-group" data-value={value} role="radiogroup">
			{children}
		</div>
	),
	RadioGroupItem: ({ value, id }: { value: string; id: string }) => (
		<input type="radio" id={id} value={value} data-testid={`radio-${value}`} readOnly />
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
		<label htmlFor={htmlFor}>{children}</label>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { MaterialsFilterSheet } from "../materials-filter-sheet";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("MaterialsFilterSheet", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams.current = new URLSearchParams();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the FilterSheetWrapper", () => {
		render(<MaterialsFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("renders the 'Statut' legend", () => {
		render(<MaterialsFilterSheet />);
		expect(screen.getByText("Statut")).toBeInTheDocument();
	});

	it("renders all three status labels", () => {
		render(<MaterialsFilterSheet />);
		expect(screen.getByText("Tous")).toBeInTheDocument();
		expect(screen.getByText("Actifs")).toBeInTheDocument();
		expect(screen.getByText("Inactifs")).toBeInTheDocument();
	});

	it("renders a RadioGroup", () => {
		render(<MaterialsFilterSheet />);
		expect(screen.getByTestId("radio-group")).toBeInTheDocument();
	});

	it("renders radio items for all, active, inactive", () => {
		render(<MaterialsFilterSheet />);
		expect(screen.getByTestId("radio-all")).toBeInTheDocument();
		expect(screen.getByTestId("radio-active")).toBeInTheDocument();
		expect(screen.getByTestId("radio-inactive")).toBeInTheDocument();
	});

	// ─── Active filters ───────────────────────────────────────────────────────

	it("shows 0 active filters when no filter params", () => {
		render(<MaterialsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper).toHaveAttribute("data-count", "0");
		expect(wrapper).toHaveAttribute("data-active", "false");
	});

	it("shows 1 active filter when filter_isActive is set", () => {
		mockSearchParams.current = new URLSearchParams("filter_isActive=true");
		render(<MaterialsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper).toHaveAttribute("data-count", "1");
		expect(wrapper).toHaveAttribute("data-active", "true");
	});

	it("does not count page/sortBy/search/perPage as active filters", () => {
		mockSearchParams.current = new URLSearchParams("page=1&sortBy=name&search=or&perPage=20");
		render(<MaterialsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper).toHaveAttribute("data-count", "0");
	});

	// ─── Distinction from ColorsFilterSheet ───────────────────────────────────

	it("uses 'Actifs' not 'Actives' for active label", () => {
		render(<MaterialsFilterSheet />);
		expect(screen.getByText("Actifs")).toBeInTheDocument();
		expect(screen.queryByText("Actives")).not.toBeInTheDocument();
	});

	it("uses 'Inactifs' not 'Inactives' for inactive label", () => {
		render(<MaterialsFilterSheet />);
		expect(screen.getByText("Inactifs")).toBeInTheDocument();
		expect(screen.queryByText("Inactives")).not.toBeInTheDocument();
	});

	// ─── className prop ───────────────────────────────────────────────────────

	it("accepts a className prop without crashing", () => {
		expect(() => render(<MaterialsFilterSheet className="extra-class" />)).not.toThrow();
	});
});
