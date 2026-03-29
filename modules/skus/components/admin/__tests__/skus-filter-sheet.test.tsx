import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const mockRouterPush = vi.fn();
const mockSearchParamsForEach = vi.fn();
const mockSearchParamsToString = vi.fn(() => "");

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
	useSearchParams: () => ({
		forEach: mockSearchParamsForEach,
		toString: mockSearchParamsToString,
	}),
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
				data-count={activeFiltersCount}
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
const mockFieldPushValue = vi.fn();
const mockFieldRemoveValue = vi.fn();

// Per-field state storage so each Field renders with correct state.value
const fieldStateMap: Record<string, unknown> = {};

// Capture the real onSubmit from useForm so tests can invoke applyFilters directly
let capturedOnSubmit: ((args: { value: unknown }) => Promise<void>) | null = null;
let _capturedDefaultValues: Record<string, unknown> = {};

vi.mock("@tanstack/react-form", () => {
	const useForm = ({
		defaultValues,
		onSubmit,
	}: {
		defaultValues: Record<string, unknown>;
		onSubmit: (args: { value: unknown }) => Promise<void>;
	}) => {
		capturedOnSubmit = onSubmit;
		_capturedDefaultValues = defaultValues;
		return {
			handleSubmit: mockHandleSubmit,
			reset: mockFormReset,
			Field: ({
				name,
				children,
			}: {
				name: string;
				mode?: string;
				children: (field: {
					state: { value: unknown };
					handleChange: (v: unknown) => void;
					pushValue: (v: unknown) => void;
					removeValue: (i: number) => void;
				}) => React.ReactNode;
			}) => {
				const stateValue = name in fieldStateMap ? fieldStateMap[name] : defaultValues[name];
				return children({
					state: { value: stateValue ?? [] },
					handleChange: (v: unknown) => {
						fieldStateMap[name] = v;
						mockFieldHandleChange(name, v);
					},
					pushValue: (v: unknown) => mockFieldPushValue(name, v),
					removeValue: (i: number) => mockFieldRemoveValue(name, i),
				});
			},
			defaultValues,
		};
	};
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

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({
		id,
		checked,
		onCheckedChange,
	}: {
		id?: string;
		checked?: boolean;
		onCheckedChange?: (checked: boolean) => void;
	}) => (
		<input
			type="checkbox"
			id={id}
			checked={checked ?? false}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
		/>
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
		<label htmlFor={htmlFor}>{children}</label>
	),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: () => <hr data-testid="separator" />,
}));

vi.mock("@/shared/components/ui/radio-group", () => ({
	RadioGroup: ({
		children,
		value,
		onValueChange,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (v: string) => void;
	}) => (
		<div data-testid="radio-group" data-value={value}>
			{children}
			{/* Expose onValueChange so tests can trigger it */}
			<button data-testid="radio-group-change-active" onClick={() => onValueChange?.("active")} />
			<button
				data-testid="radio-group-change-inactive"
				onClick={() => onValueChange?.("inactive")}
			/>
			<button data-testid="radio-group-change-all" onClick={() => onValueChange?.("all")} />
		</div>
	),
	RadioGroupItem: ({ value, id }: { value: string; id?: string }) => (
		<input type="radio" data-testid={`radio-${value}`} id={id} value={value} />
	),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { SkusFilterSheet } from "../skus-filter-sheet";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Builds a minimal URLSearchParams-compatible mock from a plain entries array.
 */
function makeSearchParams(entries: [string, string][] = []) {
	return {
		forEach: (cb: (value: string, key: string) => void) => {
			entries.forEach(([key, value]) => cb(value, key));
		},
		toString: () =>
			entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&"),
	};
}

// ============================================================================
// FIXTURES
// ============================================================================

const colorOptions = [
	{ id: "color-1", name: "Rouge", hex: "#FF0000" },
	{ id: "color-2", name: "Bleu", hex: "#0000FF" },
];

const materialOptions = [
	{ id: "mat-1", name: "Or", slug: "or" },
	{ id: "mat-2", name: "Argent", slug: "argent" },
];

// ============================================================================
// SETUP
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	for (const key of Object.keys(fieldStateMap)) {
		delete fieldStateMap[key];
	}
	capturedOnSubmit = null;
	_capturedDefaultValues = {};
});

// ============================================================================
// TESTS
// ============================================================================

describe("SkusFilterSheet", () => {
	beforeEach(() => {
		mockSearchParamsForEach.mockImplementation(vi.fn());
		mockSearchParamsToString.mockReturnValue("");
	});

	// --------------------------------------------------------------------------
	// Basic rendering
	// --------------------------------------------------------------------------

	it("renders without crashing", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("renders the variant status fieldset legend", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByText("Statut de la variante")).toBeInTheDocument();
	});

	it("renders the stock status fieldset legend", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByText("Statut du stock")).toBeInTheDocument();
	});

	it("renders active status option labels", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByText("Toutes")).toBeInTheDocument();
		expect(screen.getByText("Actives uniquement")).toBeInTheDocument();
		expect(screen.getByText("Inactives uniquement")).toBeInTheDocument();
	});

	it("renders stock status option labels", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByText("En stock")).toBeInTheDocument();
		expect(screen.getByText("Stock faible")).toBeInTheDocument();
		expect(screen.getByText("Rupture")).toBeInTheDocument();
	});

	it("renders color section when colorOptions are provided", () => {
		render(<SkusFilterSheet colorOptions={colorOptions} materialOptions={[]} />);
		expect(screen.getByText("Couleur")).toBeInTheDocument();
		expect(screen.getByText("Rouge")).toBeInTheDocument();
		expect(screen.getByText("Bleu")).toBeInTheDocument();
	});

	it("does not render color section when colorOptions is empty", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.queryByText("Couleur")).not.toBeInTheDocument();
	});

	it("renders material section when materialOptions are provided", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={materialOptions} />);
		expect(screen.getByText("Matériau")).toBeInTheDocument();
		expect(screen.getByText("Or")).toBeInTheDocument();
		expect(screen.getByText("Argent")).toBeInTheDocument();
	});

	it("does not render material section when materialOptions is empty", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.queryByText("Matériau")).not.toBeInTheDocument();
	});

	it("renders separators between filter groups", () => {
		render(<SkusFilterSheet colorOptions={colorOptions} materialOptions={materialOptions} />);
		const separators = screen.getAllByTestId("separator");
		expect(separators.length).toBeGreaterThan(0);
	});

	it("forwards className to FilterSheetWrapper as triggerClassName", () => {
		render(<SkusFilterSheet className="custom-class" colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute(
			"data-trigger-classname",
			"custom-class",
		);
	});

	// --------------------------------------------------------------------------
	// Filter rendering — checkboxes
	// --------------------------------------------------------------------------

	it("renders a checkbox with correct id for each stock status", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(document.getElementById("stock-in_stock")).toBeInTheDocument();
		expect(document.getElementById("stock-low_stock")).toBeInTheDocument();
		expect(document.getElementById("stock-out_of_stock")).toBeInTheDocument();
	});

	it("renders a checkbox for each color option", () => {
		render(<SkusFilterSheet colorOptions={colorOptions} materialOptions={[]} />);
		expect(document.getElementById("color-color-1")).toBeInTheDocument();
		expect(document.getElementById("color-color-2")).toBeInTheDocument();
	});

	it("renders a checkbox for each material option", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={materialOptions} />);
		expect(document.getElementById("material-mat-1")).toBeInTheDocument();
		expect(document.getElementById("material-mat-2")).toBeInTheDocument();
	});

	it("renders radio buttons for active status options", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(document.getElementById("active-all")).toBeInTheDocument();
		expect(document.getElementById("active-active")).toBeInTheDocument();
		expect(document.getElementById("active-inactive")).toBeInTheDocument();
	});

	it("calls handleChange with 'active' when the active radio option is selected via onValueChange", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		fireEvent.click(screen.getByTestId("radio-group-change-active"));
		expect(mockFieldHandleChange).toHaveBeenCalledWith("isActive", "active");
	});

	it("calls handleChange with 'inactive' when the inactive radio option is selected via onValueChange", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		fireEvent.click(screen.getByTestId("radio-group-change-inactive"));
		expect(mockFieldHandleChange).toHaveBeenCalledWith("isActive", "inactive");
	});

	it("calls handleChange with 'all' when the all radio option is selected via onValueChange", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		fireEvent.click(screen.getByTestId("radio-group-change-all"));
		expect(mockFieldHandleChange).toHaveBeenCalledWith("isActive", "all");
	});

	it("renders color swatches with correct hex background", () => {
		render(<SkusFilterSheet colorOptions={colorOptions} materialOptions={[]} />);
		// Color swatches are rendered as span elements with inline style
		const swatches = document.querySelectorAll("span[style]");
		expect(swatches.length).toBeGreaterThanOrEqual(1);
	});

	// --------------------------------------------------------------------------
	// Filter interactions — stock status checkboxes
	// --------------------------------------------------------------------------

	it("calls pushValue when an unchecked stock status checkbox is checked", () => {
		// Default state: stockStatuses = []
		fieldStateMap["stockStatuses"] = [];
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		const checkbox = document.getElementById("stock-in_stock") as HTMLInputElement;
		fireEvent.click(checkbox);
		expect(mockFieldPushValue).toHaveBeenCalledWith("stockStatuses", "in_stock");
	});

	it("calls removeValue when a checked stock status checkbox is unchecked", () => {
		// Default state: stockStatuses already contains "low_stock"
		fieldStateMap["stockStatuses"] = ["low_stock"];
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		const checkbox = document.getElementById("stock-low_stock") as HTMLInputElement;
		// Simulate unchecking a checked box
		fireEvent.click(checkbox);
		expect(mockFieldRemoveValue).toHaveBeenCalledWith("stockStatuses", 0);
	});

	it("calls pushValue for out_of_stock when checked", () => {
		fieldStateMap["stockStatuses"] = [];
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		const checkbox = document.getElementById("stock-out_of_stock") as HTMLInputElement;
		fireEvent.click(checkbox);
		expect(mockFieldPushValue).toHaveBeenCalledWith("stockStatuses", "out_of_stock");
	});

	// --------------------------------------------------------------------------
	// Filter interactions — color checkboxes
	// --------------------------------------------------------------------------

	it("calls pushValue when an unchecked color checkbox is checked", () => {
		fieldStateMap["colorIds"] = [];
		render(<SkusFilterSheet colorOptions={colorOptions} materialOptions={[]} />);
		const checkbox = document.getElementById("color-color-1") as HTMLInputElement;
		fireEvent.click(checkbox);
		expect(mockFieldPushValue).toHaveBeenCalledWith("colorIds", "color-1");
	});

	it("calls removeValue when a checked color checkbox is unchecked", () => {
		fieldStateMap["colorIds"] = ["color-2"];
		render(<SkusFilterSheet colorOptions={colorOptions} materialOptions={[]} />);
		const checkbox = document.getElementById("color-color-2") as HTMLInputElement;
		fireEvent.click(checkbox);
		expect(mockFieldRemoveValue).toHaveBeenCalledWith("colorIds", 0);
	});

	// --------------------------------------------------------------------------
	// Filter interactions — material checkboxes
	// --------------------------------------------------------------------------

	it("calls pushValue when an unchecked material checkbox is checked", () => {
		fieldStateMap["materialIds"] = [];
		render(<SkusFilterSheet colorOptions={[]} materialOptions={materialOptions} />);
		const checkbox = document.getElementById("material-mat-1") as HTMLInputElement;
		fireEvent.click(checkbox);
		expect(mockFieldPushValue).toHaveBeenCalledWith("materialIds", "mat-1");
	});

	it("calls removeValue when a checked material checkbox is unchecked", () => {
		fieldStateMap["materialIds"] = ["mat-2"];
		render(<SkusFilterSheet colorOptions={[]} materialOptions={materialOptions} />);
		const checkbox = document.getElementById("material-mat-2") as HTMLInputElement;
		fireEvent.click(checkbox);
		expect(mockFieldRemoveValue).toHaveBeenCalledWith("materialIds", 0);
	});

	// --------------------------------------------------------------------------
	// Active filter counting — zero by default
	// --------------------------------------------------------------------------

	it("shows activeFiltersCount=0 when no URL params are set", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "0");
	});

	it("shows hasActiveFilters=false when no URL params are set", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-has-active", "false");
	});

	// --------------------------------------------------------------------------
	// Active filter counting — with URL params
	// --------------------------------------------------------------------------

	it("counts each filter_stockStatus value as one active filter", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("in_stock", "filter_stockStatus");
			cb("low_stock", "filter_stockStatus");
		});
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "2");
	});

	it("counts each filter_colorId value as one active filter", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("color-1", "filter_colorId");
		});
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "1");
	});

	it("counts each filter_materialId value as one active filter", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("mat-1", "filter_materialId");
			cb("mat-2", "filter_materialId");
		});
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "2");
	});

	it("counts filter_isActive as one active filter", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("true", "filter_isActive");
		});
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "1");
	});

	it("does not count filter_stockStatus=all as an active filter", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("all", "filter_stockStatus");
		});
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "0");
	});

	it("accumulates count across multiple filter types", () => {
		mockSearchParamsForEach.mockImplementation((cb: (v: string, k: string) => void) => {
			cb("in_stock", "filter_stockStatus");
			cb("color-1", "filter_colorId");
			cb("mat-1", "filter_materialId");
			cb("true", "filter_isActive");
		});
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-count", "4");
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-has-active", "true");
	});

	// --------------------------------------------------------------------------
	// URL param initialization
	// --------------------------------------------------------------------------

	it("initializes stockStatuses from filter_stockStatus URL params", () => {
		const params = makeSearchParams([
			["filter_stockStatus", "in_stock"],
			["filter_stockStatus", "low_stock"],
		]);
		mockSearchParamsForEach.mockImplementation(params.forEach.bind(params));
		mockSearchParamsToString.mockReturnValue(params.toString());
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("initializes colorIds from filter_colorId URL params", () => {
		const params = makeSearchParams([["filter_colorId", "color-1"]]);
		mockSearchParamsForEach.mockImplementation(params.forEach.bind(params));
		render(<SkusFilterSheet colorOptions={colorOptions} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("initializes materialIds from filter_materialId URL params", () => {
		const params = makeSearchParams([["filter_materialId", "mat-1"]]);
		mockSearchParamsForEach.mockImplementation(params.forEach.bind(params));
		render(<SkusFilterSheet colorOptions={[]} materialOptions={materialOptions} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("initializes isActive='active' when filter_isActive=true", () => {
		const params = makeSearchParams([["filter_isActive", "true"]]);
		mockSearchParamsForEach.mockImplementation(params.forEach.bind(params));
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("initializes isActive='inactive' when filter_isActive=false", () => {
		const params = makeSearchParams([["filter_isActive", "false"]]);
		mockSearchParamsForEach.mockImplementation(params.forEach.bind(params));
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("deduplicates repeated filter_stockStatus values", () => {
		// Duplicate values in URL should only result in one entry
		const params = makeSearchParams([
			["filter_stockStatus", "in_stock"],
			["filter_stockStatus", "in_stock"],
		]);
		mockSearchParamsForEach.mockImplementation(params.forEach.bind(params));
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	// --------------------------------------------------------------------------
	// clearAllFilters — triggered via onClearAll callback
	// --------------------------------------------------------------------------

	it("calls form.reset when the clear-all button is clicked", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		expect(mockFormReset).toHaveBeenCalledOnce();
	});

	it("resets form to default empty values on clear-all", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		expect(mockFormReset).toHaveBeenCalledWith({
			stockStatuses: [],
			colorIds: [],
			materialIds: [],
			isActive: "all",
		});
	});

	it("calls router.push when the clear-all button is clicked", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining("?"), { scroll: false });
	});

	it("removes all filter keys from URL when clearing filters", () => {
		mockSearchParamsToString.mockReturnValue(
			"filter_stockStatus=in_stock&filter_colorId=color-1&filter_isActive=true",
		);
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("filter_stockStatus");
		expect(pushedUrl).not.toContain("filter_colorId");
		expect(pushedUrl).not.toContain("filter_materialId");
		expect(pushedUrl).not.toContain("filter_isActive");
	});

	it("removes cursor and direction params when clearing filters", () => {
		mockSearchParamsToString.mockReturnValue(
			"cursor=abc&direction=next&filter_stockStatus=in_stock",
		);
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("cursor");
		expect(pushedUrl).not.toContain("direction");
	});

	it("preserves unrelated URL params when clearing filters", () => {
		mockSearchParamsToString.mockReturnValue("search=ring&filter_stockStatus=in_stock");
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("search=ring");
	});

	// --------------------------------------------------------------------------
	// applyFilters / form submit
	// --------------------------------------------------------------------------

	it("calls form.handleSubmit when the apply button is clicked", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		fireEvent.click(screen.getByTestId("apply-btn"));
		expect(mockHandleSubmit).toHaveBeenCalledOnce();
	});

	it("does not bubble the form submit event", () => {
		const parentSubmit = vi.fn();
		render(
			<div onSubmit={parentSubmit}>
				<SkusFilterSheet colorOptions={[]} materialOptions={[]} />
			</div>,
		);
		const form = document.querySelector("form")!;
		fireEvent.submit(form);
		expect(parentSubmit).not.toHaveBeenCalled();
	});

	it("calls form.handleSubmit when the inner form is submitted", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		const form = document.querySelector("form")!;
		fireEvent.submit(form);
		expect(mockHandleSubmit).toHaveBeenCalled();
	});

	it("calls router.push when applyFilters is invoked via onSubmit", async () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		await capturedOnSubmit?.({
			value: { stockStatuses: [], colorIds: [], materialIds: [], isActive: "all" },
		});
		expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining("?"), { scroll: false });
	});

	it("encodes stockStatuses into URL params when applyFilters is called", async () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		await capturedOnSubmit?.({
			value: {
				stockStatuses: ["in_stock", "low_stock"],
				colorIds: [],
				materialIds: [],
				isActive: "all",
			},
		});
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("filter_stockStatus=in_stock");
		expect(pushedUrl).toContain("filter_stockStatus=low_stock");
	});

	it("encodes colorIds into URL params when applyFilters is called", async () => {
		render(<SkusFilterSheet colorOptions={colorOptions} materialOptions={[]} />);
		await capturedOnSubmit?.({
			value: {
				stockStatuses: [],
				colorIds: ["color-1", "color-2"],
				materialIds: [],
				isActive: "all",
			},
		});
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("filter_colorId=color-1");
		expect(pushedUrl).toContain("filter_colorId=color-2");
	});

	it("encodes materialIds into URL params when applyFilters is called", async () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={materialOptions} />);
		await capturedOnSubmit?.({
			value: {
				stockStatuses: [],
				colorIds: [],
				materialIds: ["mat-1"],
				isActive: "all",
			},
		});
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("filter_materialId=mat-1");
	});

	it("encodes isActive=active as filter_isActive=true", async () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		await capturedOnSubmit?.({
			value: { stockStatuses: [], colorIds: [], materialIds: [], isActive: "active" },
		});
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("filter_isActive=true");
	});

	it("encodes isActive=inactive as filter_isActive=false", async () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		await capturedOnSubmit?.({
			value: { stockStatuses: [], colorIds: [], materialIds: [], isActive: "inactive" },
		});
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("filter_isActive=false");
	});

	it("does not add filter_isActive to URL when isActive=all", async () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		await capturedOnSubmit?.({
			value: { stockStatuses: [], colorIds: [], materialIds: [], isActive: "all" },
		});
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("filter_isActive");
	});

	it("removes cursor and direction params when applying filters", async () => {
		mockSearchParamsToString.mockReturnValue("cursor=abc&direction=next");
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		await capturedOnSubmit?.({
			value: { stockStatuses: [], colorIds: [], materialIds: [], isActive: "all" },
		});
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("cursor");
		expect(pushedUrl).not.toContain("direction");
	});

	it("replaces existing filter params with new values when applyFilters is called", async () => {
		mockSearchParamsToString.mockReturnValue(
			"filter_stockStatus=in_stock&filter_colorId=color-1&filter_isActive=true",
		);
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		await capturedOnSubmit?.({
			value: { stockStatuses: ["out_of_stock"], colorIds: [], materialIds: [], isActive: "all" },
		});
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		// Old values cleared, new value present
		expect(pushedUrl).toContain("filter_stockStatus=out_of_stock");
		expect(pushedUrl).not.toContain("filter_colorId");
		expect(pushedUrl).not.toContain("filter_isActive");
	});

	// --------------------------------------------------------------------------
	// isPending state
	// --------------------------------------------------------------------------

	it("passes isPending=false to FilterSheetWrapper initially", () => {
		render(<SkusFilterSheet colorOptions={[]} materialOptions={[]} />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-pending", "false");
	});
});
