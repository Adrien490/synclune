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

vi.mock("@/shared/components/forms/radio-filter-item", () => ({
	RadioFilterItem: ({
		id,
		name,
		value,
		checked,
		onCheckedChange,
		children,
	}: {
		id: string;
		name: string;
		value: string;
		checked: boolean;
		onCheckedChange: (checked: boolean) => void;
		children: React.ReactNode;
	}) => (
		<label htmlFor={id}>
			<input
				type="radio"
				id={id}
				name={name}
				value={value}
				checked={checked}
				onChange={(e) => onCheckedChange(e.target.checked)}
				data-testid={`radio-${value}`}
			/>
			{children}
		</label>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CollectionsFilterSheet } from "../collections-filter-sheet";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionsFilterSheet", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams.current = new URLSearchParams();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the FilterSheetWrapper", () => {
		render(<CollectionsFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("renders the 'Bijoux' fieldset legend", () => {
		render(<CollectionsFilterSheet />);
		expect(screen.getByText("Bijoux")).toBeInTheDocument();
	});

	it("renders all three radio options", () => {
		render(<CollectionsFilterSheet />);
		expect(screen.getByText("Tous")).toBeInTheDocument();
		expect(screen.getByText("Avec bijoux")).toBeInTheDocument();
		expect(screen.getByText("Sans bijoux")).toBeInTheDocument();
	});

	it("defaults to 'all' option checked when no search params", () => {
		render(<CollectionsFilterSheet />);
		const allRadio = screen.getByTestId("radio-all");
		expect(allRadio).toBeChecked();
	});

	it("renders radio items with correct ids", () => {
		render(<CollectionsFilterSheet />);
		expect(screen.getByTestId("radio-all")).toBeInTheDocument();
		expect(screen.getByTestId("radio-with")).toBeInTheDocument();
		expect(screen.getByTestId("radio-without")).toBeInTheDocument();
	});

	// ─── Active filters ───────────────────────────────────────────────────────

	it("shows 0 active filters when no filter params", () => {
		render(<CollectionsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper).toHaveAttribute("data-count", "0");
		expect(wrapper).toHaveAttribute("data-active", "false");
	});

	it("shows 1 active filter when filter_hasProducts is set", () => {
		mockSearchParams.current = new URLSearchParams("filter_hasProducts=true");
		render(<CollectionsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper).toHaveAttribute("data-count", "1");
		expect(wrapper).toHaveAttribute("data-active", "true");
	});

	it("does not count page/sortBy/search as active filters", () => {
		mockSearchParams.current = new URLSearchParams("page=2&sortBy=name&search=bague");
		render(<CollectionsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper).toHaveAttribute("data-count", "0");
	});

	// ─── Initial value from search params ─────────────────────────────────────

	it("selects 'with' when filter_hasProducts=true", () => {
		mockSearchParams.current = new URLSearchParams("filter_hasProducts=true");
		render(<CollectionsFilterSheet />);
		expect(screen.getByTestId("radio-with")).toBeChecked();
	});

	it("selects 'without' when filter_hasProducts=false", () => {
		mockSearchParams.current = new URLSearchParams("filter_hasProducts=false");
		render(<CollectionsFilterSheet />);
		expect(screen.getByTestId("radio-without")).toBeChecked();
	});

	// ─── className prop ───────────────────────────────────────────────────────

	it("accepts a className prop without crashing", () => {
		expect(() => render(<CollectionsFilterSheet className="test-class" />)).not.toThrow();
	});
});
