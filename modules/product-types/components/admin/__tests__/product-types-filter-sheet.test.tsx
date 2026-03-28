import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush } = vi.hoisted(() => ({
	mockPush: vi.fn(),
}));

let mockSearchParamsValue = new URLSearchParams();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => mockSearchParamsValue,
}));

vi.mock("@/shared/components/filter-sheet-wrapper", () => ({
	FilterSheetWrapper: ({
		children,
		activeFiltersCount,
		hasActiveFilters,
	}: {
		children: React.ReactNode;
		activeFiltersCount: number;
		hasActiveFilters: boolean;
		onClearAll: () => void;
		onApply: () => void;
		isPending?: boolean;
		triggerClassName?: string;
	}) => (
		<div
			data-testid="filter-sheet-wrapper"
			data-active-count={activeFiltersCount}
			data-has-active={hasActiveFilters}
		>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/forms/radio-filter-item", () => ({
	RadioFilterItem: ({
		children,
		id,
		value,
		checked,
	}: {
		children: React.ReactNode;
		id: string;
		name: string;
		value: string;
		checked: boolean;
		onCheckedChange: (checked: boolean) => void;
	}) => (
		<label data-testid={`radio-item-${id}`} data-value={value} data-checked={checked}>
			<input type="radio" id={id} value={value} readOnly checked={checked} />
			{children}
		</label>
	),
}));

vi.mock("@tanstack/react-form", () => ({
	useForm: ({ defaultValues }: { defaultValues: Record<string, string>; onSubmit: unknown }) => ({
		handleSubmit: vi.fn(),
		reset: vi.fn(),
		Field: ({
			children,
			name,
		}: {
			children: (field: {
				state: { value: string };
				handleChange: (value: string) => void;
			}) => React.ReactNode;
			name: string;
		}) =>
			children({
				state: { value: defaultValues[name] ?? "all" },
				handleChange: vi.fn(),
			}),
	}),
}));

import { ProductTypesFilterSheet } from "../product-types-filter-sheet";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ProductTypesFilterSheet", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParamsValue = new URLSearchParams();
	});

	// ─── Filter sections ──────────────────────────────────────────────────────

	it("renders the filter sheet wrapper", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("renders the status active filter section", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByText("Statut actif")).toBeInTheDocument();
	});

	// ─── Radio items ──────────────────────────────────────────────────────────

	it("renders 'Tous' radio item for isActive filter", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByTestId("radio-item-active-all")).toBeInTheDocument();
	});

	it("renders 'Actif uniquement' radio item", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByText("Actif uniquement")).toBeInTheDocument();
	});

	it("renders 'Inactif uniquement' radio item", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByText("Inactif uniquement")).toBeInTheDocument();
	});

	it("renders 'Tous' radio item text", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByText("Tous")).toBeInTheDocument();
	});

	// ─── Filter badge count ───────────────────────────────────────────────────

	it("shows 0 active filters when no search params", () => {
		render(<ProductTypesFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper.getAttribute("data-active-count")).toBe("0");
	});

	it("shows 1 active filter when isActive filter param is present", () => {
		mockSearchParamsValue = new URLSearchParams("filter_isActive=true");
		render(<ProductTypesFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper.getAttribute("data-active-count")).toBe("1");
	});

	it("reports hasActiveFilters=true when filter params are present", () => {
		mockSearchParamsValue = new URLSearchParams("filter_isActive=false");
		render(<ProductTypesFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper.getAttribute("data-has-active")).toBe("true");
	});

	it("reports hasActiveFilters=false when no filter params", () => {
		render(<ProductTypesFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper.getAttribute("data-has-active")).toBe("false");
	});

	// ─── Default radio selection ───────────────────────────────────────────────

	it("defaults 'Tous' radio as checked when no search params", () => {
		render(<ProductTypesFilterSheet />);
		const allRadio = screen.getByTestId("radio-item-active-all");
		expect(allRadio.getAttribute("data-checked")).toBe("true");
	});
});
