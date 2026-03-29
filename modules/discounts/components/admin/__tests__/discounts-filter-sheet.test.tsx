import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

vi.mock("@/app/generated/prisma/browser", () => ({
	DiscountType: {
		PERCENTAGE: "PERCENTAGE",
		FIXED_AMOUNT: "FIXED_AMOUNT",
	},
}));

vi.mock("@/modules/discounts/constants/discount.constants", () => ({
	DISCOUNT_TYPE_LABELS: {
		PERCENTAGE: "Pourcentage",
		FIXED_AMOUNT: "Montant fixe",
	},
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

const mockRadioOnCheckedChange = vi.fn();

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
					mockRadioOnCheckedChange(value, e.target.checked);
					onCheckedChange(e.target.checked);
				}}
			/>
			{children}
		</label>
	),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: () => <hr data-testid="separator" />,
}));

const mockHandleSubmit = vi.fn();
const mockFormReset = vi.fn();
const mockFieldHandleChange = vi.fn();

// Per-field state storage so each Field renders with correct state.value
const fieldStateMap: Record<string, string> = {};

vi.mock("@tanstack/react-form", () => {
	const useForm = ({
		defaultValues,
	}: {
		defaultValues: Record<string, string>;
		onSubmit: (args: { value: Record<string, string> }) => Promise<void>;
	}) => ({
		handleSubmit: mockHandleSubmit,
		reset: mockFormReset,
		Field: ({
			name,
			children,
		}: {
			name: string;
			children: (field: {
				state: { value: string };
				handleChange: (value: string) => void;
			}) => React.ReactNode;
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
	});
	return {
		createFormHookContexts: () => ({
			fieldContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
			useFieldContext: () => ({}),
			formContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
			useFormContext: () => ({}),
		}),
		createFormHook: () => ({ useAppForm: useForm }),
		useForm,
	};
});

import { DiscountsFilterSheet } from "../discounts-filter-sheet";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	// Reset per-field state between tests
	for (const key of Object.keys(fieldStateMap)) {
		delete fieldStateMap[key];
	}
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Builds a minimal URLSearchParams-compatible mock from a plain entries array.
 */
function makeSearchParams(entries: [string, string][] = []) {
	const params = new URLSearchParams();
	for (const [key, value] of entries) {
		params.append(key, value);
	}
	return params;
}

// ============================================================================
// TESTS
// ============================================================================

describe("DiscountsFilterSheet", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParamsValue = new URLSearchParams();
	});

	// --------------------------------------------------------------------------
	// Basic rendering
	// --------------------------------------------------------------------------

	it("renders without crashing", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("renders the filter sheet wrapper", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("forwards className to FilterSheetWrapper as triggerClassName", () => {
		render(<DiscountsFilterSheet className="custom-class" />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute(
			"data-trigger-classname",
			"custom-class",
		);
	});

	// --------------------------------------------------------------------------
	// Filter sections rendering
	// --------------------------------------------------------------------------

	it("renders the type filter section", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Type")).toBeInTheDocument();
	});

	it("renders the status filter section", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Statut")).toBeInTheDocument();
	});

	it("renders the usage filter section", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Utilisations")).toBeInTheDocument();
	});

	it("renders separators between filter sections", () => {
		render(<DiscountsFilterSheet />);
		const separators = screen.getAllByTestId("separator");
		expect(separators.length).toBeGreaterThanOrEqual(2);
	});

	// --------------------------------------------------------------------------
	// Type filter radio items
	// --------------------------------------------------------------------------

	it("renders 'Tous' radio item for type filter", () => {
		render(<DiscountsFilterSheet />);
		expect(document.getElementById("type-all")).toBeInTheDocument();
	});

	it("renders 'Pourcentage' radio item for type filter", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Pourcentage")).toBeInTheDocument();
		expect(document.getElementById("type-PERCENTAGE")).toBeInTheDocument();
	});

	it("renders 'Montant fixe' radio item for type filter", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Montant fixe")).toBeInTheDocument();
		expect(document.getElementById("type-FIXED_AMOUNT")).toBeInTheDocument();
	});

	// --------------------------------------------------------------------------
	// Status filter radio items
	// --------------------------------------------------------------------------

	it("renders 'Actifs' radio item for status filter", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Actifs")).toBeInTheDocument();
		expect(document.getElementById("status-active")).toBeInTheDocument();
	});

	it("renders 'Inactifs' radio item for status filter", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Inactifs")).toBeInTheDocument();
		expect(document.getElementById("status-inactive")).toBeInTheDocument();
	});

	it("renders 'Tous' radio item for status filter", () => {
		render(<DiscountsFilterSheet />);
		expect(document.getElementById("status-all")).toBeInTheDocument();
	});

	// --------------------------------------------------------------------------
	// Usage filter radio items
	// --------------------------------------------------------------------------

	it("renders 'Avec utilisations' radio item for usage filter", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Avec utilisations")).toBeInTheDocument();
		expect(document.getElementById("usage-with")).toBeInTheDocument();
	});

	it("renders 'Sans utilisation' radio item for usage filter", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByText("Sans utilisation")).toBeInTheDocument();
		expect(document.getElementById("usage-without")).toBeInTheDocument();
	});

	it("renders 'Tous' radio item for usage filter", () => {
		render(<DiscountsFilterSheet />);
		expect(document.getElementById("usage-all")).toBeInTheDocument();
	});

	// --------------------------------------------------------------------------
	// Default checked state (all = "all")
	// --------------------------------------------------------------------------

	it("has type-all radio checked by default", () => {
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("type-all") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	it("has status-all radio checked by default", () => {
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("status-all") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	it("has usage-all radio checked by default", () => {
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("usage-all") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	// --------------------------------------------------------------------------
	// Filter interactions — changing radio selections
	// --------------------------------------------------------------------------

	it("calls handleChange with correct value when type PERCENTAGE radio is selected", () => {
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("type-PERCENTAGE") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("type", "PERCENTAGE");
	});

	it("calls handleChange with correct value when type FIXED_AMOUNT radio is selected", () => {
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("type-FIXED_AMOUNT") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("type", "FIXED_AMOUNT");
	});

	it("has type-all radio already checked when no filter is active", () => {
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("type-all") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	it("calls handleChange with 'active' when status active radio is selected", () => {
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("status-active") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("isActive", "active");
	});

	it("calls handleChange with 'inactive' when status inactive radio is selected", () => {
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("status-inactive") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("isActive", "inactive");
	});

	it("calls handleChange with 'with' when usage 'with' radio is selected", () => {
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("usage-with") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("hasUsages", "with");
	});

	it("calls handleChange with 'without' when usage 'without' radio is selected", () => {
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("usage-without") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("hasUsages", "without");
	});

	// --------------------------------------------------------------------------
	// Active filter counting — zero filters by default
	// --------------------------------------------------------------------------

	it("shows activeFiltersCount=0 when no search params", () => {
		render(<DiscountsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper).toHaveAttribute("data-active-count", "0");
	});

	it("shows hasActiveFilters=false when no search params", () => {
		render(<DiscountsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper).toHaveAttribute("data-has-active", "false");
	});

	// --------------------------------------------------------------------------
	// Active filter counting — with URL params
	// --------------------------------------------------------------------------

	it("shows correct active filters count for one filter param", () => {
		mockSearchParamsValue = makeSearchParams([["filter_type", "PERCENTAGE"]]);
		render(<DiscountsFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-count", "1");
	});

	it("shows correct active filters count for two filter params", () => {
		mockSearchParamsValue = makeSearchParams([
			["filter_type", "PERCENTAGE"],
			["filter_isActive", "true"],
		]);
		render(<DiscountsFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-count", "2");
	});

	it("shows correct active filters count for all three filter params", () => {
		mockSearchParamsValue = makeSearchParams([
			["filter_type", "FIXED_AMOUNT"],
			["filter_isActive", "false"],
			["filter_hasUsages", "true"],
		]);
		render(<DiscountsFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-count", "3");
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-has-active", "true");
	});

	it("does not count non-filter params as active filters", () => {
		mockSearchParamsValue = makeSearchParams([
			["cursor", "abc123"],
			["direction", "next"],
			["search", "hello"],
		]);
		render(<DiscountsFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-count", "0");
	});

	// --------------------------------------------------------------------------
	// URL param initialization
	// --------------------------------------------------------------------------

	it("initializes type from filter_type URL param", () => {
		mockSearchParamsValue = makeSearchParams([["filter_type", "PERCENTAGE"]]);
		render(<DiscountsFilterSheet />);
		// PERCENTAGE radio should be checked since field state is initialized from URL
		const radio = document.getElementById("type-PERCENTAGE") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	it("initializes isActive as 'active' from filter_isActive=true URL param", () => {
		mockSearchParamsValue = makeSearchParams([["filter_isActive", "true"]]);
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("status-active") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	it("initializes isActive as 'inactive' from filter_isActive=false URL param", () => {
		mockSearchParamsValue = makeSearchParams([["filter_isActive", "false"]]);
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("status-inactive") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	it("initializes hasUsages as 'with' from filter_hasUsages=true URL param", () => {
		mockSearchParamsValue = makeSearchParams([["filter_hasUsages", "true"]]);
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("usage-with") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	it("initializes hasUsages as 'without' from filter_hasUsages=false URL param", () => {
		mockSearchParamsValue = makeSearchParams([["filter_hasUsages", "false"]]);
		render(<DiscountsFilterSheet />);
		const radio = document.getElementById("usage-without") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	it("initializes all fields from combined URL params", () => {
		mockSearchParamsValue = makeSearchParams([
			["filter_type", "FIXED_AMOUNT"],
			["filter_isActive", "true"],
			["filter_hasUsages", "false"],
		]);
		render(<DiscountsFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
		expect(document.getElementById("type-FIXED_AMOUNT") as HTMLInputElement).toHaveProperty(
			"checked",
			true,
		);
		expect(document.getElementById("status-active") as HTMLInputElement).toHaveProperty(
			"checked",
			true,
		);
		expect(document.getElementById("usage-without") as HTMLInputElement).toHaveProperty(
			"checked",
			true,
		);
	});

	// --------------------------------------------------------------------------
	// clearAllFilters — triggered via onClearAll callback
	// --------------------------------------------------------------------------

	it("calls form.reset when the clear-all button is clicked", () => {
		render(<DiscountsFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		expect(mockFormReset).toHaveBeenCalledOnce();
	});

	it("resets form to default values on clear-all", () => {
		render(<DiscountsFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		expect(mockFormReset).toHaveBeenCalledWith({
			type: "all",
			isActive: "all",
			hasUsages: "all",
		});
	});

	it("calls router.push when the clear-all button is clicked", () => {
		render(<DiscountsFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("?"), { scroll: false });
	});

	it("removes all filter keys from URL when clearing filters", () => {
		mockSearchParamsValue = makeSearchParams([
			["filter_type", "PERCENTAGE"],
			["filter_isActive", "true"],
			["filter_hasUsages", "false"],
			["search", "test"],
		]);
		render(<DiscountsFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("filter_type");
		expect(pushedUrl).not.toContain("filter_isActive");
		expect(pushedUrl).not.toContain("filter_hasUsages");
	});

	it("removes cursor and direction from URL when clearing filters", () => {
		mockSearchParamsValue = makeSearchParams([
			["cursor", "abc123"],
			["direction", "next"],
		]);
		render(<DiscountsFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("cursor");
		expect(pushedUrl).not.toContain("direction");
	});

	it("preserves non-filter params when clearing filters", () => {
		mockSearchParamsValue = makeSearchParams([
			["search", "hello"],
			["filter_type", "PERCENTAGE"],
		]);
		render(<DiscountsFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("search=hello");
	});

	// --------------------------------------------------------------------------
	// applyFilters — triggered via onApply callback
	// --------------------------------------------------------------------------

	it("calls form.handleSubmit when the apply button is clicked", () => {
		render(<DiscountsFilterSheet />);
		fireEvent.click(screen.getByTestId("apply-btn"));
		expect(mockHandleSubmit).toHaveBeenCalledOnce();
	});

	// --------------------------------------------------------------------------
	// Form submit
	// --------------------------------------------------------------------------

	it("does not bubble the form submit event", () => {
		const parentSubmit = vi.fn();
		render(
			<div onSubmit={parentSubmit}>
				<DiscountsFilterSheet />
			</div>,
		);
		const form = document.querySelector("form")!;
		fireEvent.submit(form);
		expect(parentSubmit).not.toHaveBeenCalled();
	});

	it("calls form.handleSubmit when the inner form is submitted", () => {
		render(<DiscountsFilterSheet />);
		const form = document.querySelector("form")!;
		fireEvent.submit(form);
		expect(mockHandleSubmit).toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// isPending state
	// --------------------------------------------------------------------------

	it("passes isPending=false to FilterSheetWrapper initially", () => {
		render(<DiscountsFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-pending", "false");
	});
});
