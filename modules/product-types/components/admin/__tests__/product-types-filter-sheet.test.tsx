import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush } = vi.hoisted(() => ({
	mockPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => mockSearchParamsValue,
}));

const mockOnClearAll = vi.fn();
const mockOnApply = vi.fn();

vi.mock("@/shared/components/filter-sheet-wrapper", () => ({
	FilterSheetWrapper: ({
		children,
		activeFiltersCount,
		hasActiveFilters,
		onClearAll,
		onApply,
		isPending,
		triggerClassName,
	}: {
		children: React.ReactNode;
		activeFiltersCount: number;
		hasActiveFilters: boolean;
		onClearAll: () => void;
		onApply: () => void;
		isPending?: boolean;
		triggerClassName?: string;
	}) => {
		mockOnClearAll.mockImplementation(onClearAll);
		mockOnApply.mockImplementation(onApply);
		return (
			<div
				data-testid="filter-sheet-wrapper"
				data-active-count={activeFiltersCount}
				data-has-active={String(hasActiveFilters)}
				data-pending={String(isPending ?? false)}
				data-trigger-classname={triggerClassName}
			>
				<button data-testid="clear-all-btn" onClick={onClearAll}>
					Effacer
				</button>
				<button data-testid="apply-btn" onClick={onApply}>
					Appliquer
				</button>
				{children}
			</div>
		);
	},
}));

const mockHandleSubmit = vi.fn();
const mockFormReset = vi.fn();
const mockFieldHandleChange = vi.fn();

// Per-field state so each Field renders with the correct state.value
const fieldStateMap: Record<string, string> = {};

vi.mock("@tanstack/react-form", () => ({
	useForm: ({ defaultValues }: { defaultValues: Record<string, string>; onSubmit: unknown }) => ({
		handleSubmit: mockHandleSubmit,
		reset: mockFormReset,
		Field: ({
			children,
			name,
		}: {
			children: (field: {
				state: { value: string };
				handleChange: (value: string) => void;
			}) => React.ReactNode;
			name: string;
		}) => {
			const stateValue =
				name in fieldStateMap ? fieldStateMap[name] : (defaultValues[name] ?? "all");
			return children({
				state: { value: stateValue as string },
				handleChange: (v: string) => {
					fieldStateMap[name] = v;
					mockFieldHandleChange(name, v);
				},
			});
		},
	}),
}));

vi.mock("@/shared/components/forms/radio-filter-item", () => ({
	RadioFilterItem: ({
		children,
		id,
		value,
		checked,
		onCheckedChange,
	}: {
		children: React.ReactNode;
		id: string;
		name: string;
		value: string;
		checked: boolean;
		onCheckedChange: (checked: boolean) => void;
	}) => (
		<label htmlFor={id}>
			<input
				type="radio"
				id={id}
				value={value}
				checked={checked}
				onChange={(e) => {
					onCheckedChange(e.target.checked);
				}}
			/>
			{children}
		</label>
	),
}));

// ============================================================================
// SEARCH PARAMS HELPERS
// ============================================================================

/**
 * Builds a URLSearchParams-compatible mock from a plain entries array.
 * The mock supports forEach, toString, and has a backing URLSearchParams
 * instance so forEach iterates correctly.
 */
function makeSearchParams(entries: [string, string][] = []) {
	const inner = new URLSearchParams(entries);
	return inner;
}

let mockSearchParamsValue: URLSearchParams = new URLSearchParams();

import { ProductTypesFilterSheet } from "../product-types-filter-sheet";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	for (const key of Object.keys(fieldStateMap)) {
		delete fieldStateMap[key];
	}
});

// ============================================================================
// TESTS
// ============================================================================

describe("ProductTypesFilterSheet", () => {
	beforeEach(() => {
		mockSearchParamsValue = new URLSearchParams();
	});

	// --------------------------------------------------------------------------
	// Basic rendering
	// --------------------------------------------------------------------------

	it("renders the filter sheet wrapper", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("renders the status active filter section legend", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByText("Statut actif")).toBeInTheDocument();
	});

	it("forwards className to FilterSheetWrapper as triggerClassName", () => {
		render(<ProductTypesFilterSheet className="my-class" />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute(
			"data-trigger-classname",
			"my-class",
		);
	});

	// --------------------------------------------------------------------------
	// Radio items rendering
	// --------------------------------------------------------------------------

	it("renders all three isActive radio options", () => {
		render(<ProductTypesFilterSheet />);
		expect(document.getElementById("active-all")).toBeInTheDocument();
		expect(document.getElementById("active-active")).toBeInTheDocument();
		expect(document.getElementById("active-inactive")).toBeInTheDocument();
	});

	it("renders 'Tous' label", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByText("Tous")).toBeInTheDocument();
	});

	it("renders 'Actif uniquement' label", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByText("Actif uniquement")).toBeInTheDocument();
	});

	it("renders 'Inactif uniquement' label", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByText("Inactif uniquement")).toBeInTheDocument();
	});

	// --------------------------------------------------------------------------
	// Default radio selection
	// --------------------------------------------------------------------------

	it("defaults 'Tous' radio as checked when no search params", () => {
		render(<ProductTypesFilterSheet />);
		const allRadio = document.getElementById("active-all") as HTMLInputElement;
		expect(allRadio.checked).toBe(true);
	});

	it("defaults 'Actif uniquement' and 'Inactif uniquement' as unchecked when no search params", () => {
		render(<ProductTypesFilterSheet />);
		const activeRadio = document.getElementById("active-active") as HTMLInputElement;
		const inactiveRadio = document.getElementById("active-inactive") as HTMLInputElement;
		expect(activeRadio.checked).toBe(false);
		expect(inactiveRadio.checked).toBe(false);
	});

	// --------------------------------------------------------------------------
	// Filter interactions (radio selection calls handleChange)
	// --------------------------------------------------------------------------

	it("calls handleChange with 'active' when the active radio is selected", () => {
		render(<ProductTypesFilterSheet />);
		const radio = document.getElementById("active-active") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("isActive", "active");
	});

	it("calls handleChange with 'inactive' when the inactive radio is selected", () => {
		render(<ProductTypesFilterSheet />);
		const radio = document.getElementById("active-inactive") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("isActive", "inactive");
	});

	it("calls handleChange with 'all' when the all radio is selected", () => {
		// Pre-select a different value so the change is meaningful
		fieldStateMap["isActive"] = "active";
		render(<ProductTypesFilterSheet />);
		const radio = document.getElementById("active-all") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("isActive", "all");
	});

	// --------------------------------------------------------------------------
	// Active filter counting — zero by default
	// --------------------------------------------------------------------------

	it("shows activeFiltersCount=0 when no URL params are set", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-count", "0");
	});

	it("reports hasActiveFilters=false when no filter params present", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-has-active", "false");
	});

	// --------------------------------------------------------------------------
	// Active filter counting — with URL params
	// --------------------------------------------------------------------------

	it("shows activeFiltersCount=1 when filter_isActive=true is in URL", () => {
		mockSearchParamsValue = makeSearchParams([["filter_isActive", "true"]]);
		render(<ProductTypesFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-count", "1");
	});

	it("shows activeFiltersCount=1 when filter_isActive=false is in URL", () => {
		mockSearchParamsValue = makeSearchParams([["filter_isActive", "false"]]);
		render(<ProductTypesFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-count", "1");
	});

	it("reports hasActiveFilters=true when filter_isActive is present", () => {
		mockSearchParamsValue = makeSearchParams([["filter_isActive", "true"]]);
		render(<ProductTypesFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-has-active", "true");
	});

	it("does not count non-filter params (page, perPage, sortBy, search) as active filters", () => {
		mockSearchParamsValue = makeSearchParams([
			["page", "2"],
			["perPage", "10"],
			["sortBy", "name"],
			["search", "ring"],
		]);
		render(<ProductTypesFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-count", "0");
	});

	// --------------------------------------------------------------------------
	// URL param initialization
	// --------------------------------------------------------------------------

	it("initializes isActive as 'active' when filter_isActive=true in URL", () => {
		mockSearchParamsValue = makeSearchParams([["filter_isActive", "true"]]);
		render(<ProductTypesFilterSheet />);
		// The 'active' radio should be checked (field initialized from URL)
		const activeRadio = document.getElementById("active-active") as HTMLInputElement;
		expect(activeRadio.checked).toBe(true);
	});

	it("initializes isActive as 'inactive' when filter_isActive=false in URL", () => {
		mockSearchParamsValue = makeSearchParams([["filter_isActive", "false"]]);
		render(<ProductTypesFilterSheet />);
		const inactiveRadio = document.getElementById("active-inactive") as HTMLInputElement;
		expect(inactiveRadio.checked).toBe(true);
	});

	it("initializes isActive as 'all' when filter_isActive is absent", () => {
		render(<ProductTypesFilterSheet />);
		const allRadio = document.getElementById("active-all") as HTMLInputElement;
		expect(allRadio.checked).toBe(true);
	});

	// --------------------------------------------------------------------------
	// clearAllFilters
	// --------------------------------------------------------------------------

	it("calls form.reset when the clear-all button is clicked", () => {
		render(<ProductTypesFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		expect(mockFormReset).toHaveBeenCalledOnce();
	});

	it("resets form to default values on clear-all", () => {
		render(<ProductTypesFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		expect(mockFormReset).toHaveBeenCalledWith({ isActive: "all" });
	});

	it("calls router.push when the clear-all button is clicked", () => {
		render(<ProductTypesFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("?"), { scroll: false });
	});

	it("removes filter_isActive from URL when clearing filters", () => {
		mockSearchParamsValue = makeSearchParams([["filter_isActive", "true"]]);
		render(<ProductTypesFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("filter_isActive");
	});

	it("removes cursor and direction from URL when clearing filters", () => {
		mockSearchParamsValue = makeSearchParams([
			["cursor", "abc123"],
			["direction", "next"],
			["filter_isActive", "true"],
		]);
		render(<ProductTypesFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("cursor");
		expect(pushedUrl).not.toContain("direction");
	});

	// --------------------------------------------------------------------------
	// applyFilters / form submit
	// --------------------------------------------------------------------------

	it("calls form.handleSubmit when the apply button is clicked", () => {
		render(<ProductTypesFilterSheet />);
		fireEvent.click(screen.getByTestId("apply-btn"));
		expect(mockHandleSubmit).toHaveBeenCalledOnce();
	});

	it("calls form.handleSubmit when the inner form is submitted", () => {
		render(<ProductTypesFilterSheet />);
		const form = document.querySelector("form")!;
		fireEvent.submit(form);
		expect(mockHandleSubmit).toHaveBeenCalled();
	});

	it("does not bubble the submit event to the parent", () => {
		const parentSubmit = vi.fn();
		render(
			<div onSubmit={parentSubmit}>
				<ProductTypesFilterSheet />
			</div>,
		);
		const form = document.querySelector("form")!;
		fireEvent.submit(form);
		expect(parentSubmit).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// isPending state
	// --------------------------------------------------------------------------

	it("passes isPending=false to FilterSheetWrapper initially", () => {
		render(<ProductTypesFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-pending", "false");
	});
});
