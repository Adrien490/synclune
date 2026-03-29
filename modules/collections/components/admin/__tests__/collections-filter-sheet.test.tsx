import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as React from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRouterPush, mockSearchParams, mockUseTransition } = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockSearchParams: {
		current: new URLSearchParams(),
	},
	mockUseTransition: vi.fn(
		() => [false, (fn: () => void) => fn()] as [boolean, (fn: () => void) => void],
	),
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
		useTransition: mockUseTransition,
	};
});

vi.mock("@/shared/components/filter-sheet-wrapper", () => ({
	FilterSheetWrapper: ({
		children,
		hasActiveFilters,
		activeFiltersCount,
		onClearAll,
		onApply,
		isPending,
		triggerClassName,
	}: {
		children: React.ReactNode;
		hasActiveFilters?: boolean;
		activeFiltersCount?: number;
		onClearAll?: () => void;
		onApply?: () => void;
		isPending?: boolean;
		triggerClassName?: string;
	}) => (
		<div
			data-testid="filter-sheet-wrapper"
			data-active={String(hasActiveFilters)}
			data-count={activeFiltersCount}
			data-pending={String(isPending ?? false)}
			data-trigger-classname={triggerClassName ?? ""}
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

const mockRadioOnCheckedChange = vi.fn();

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
				onChange={(e) => {
					mockRadioOnCheckedChange(value, e.target.checked);
					onCheckedChange(e.target.checked);
				}}
				data-testid={`radio-${value}`}
			/>
			{children}
		</label>
	),
}));

// Mock @tanstack/react-form so we can spy on handleSubmit and reset
const mockHandleSubmit = vi.fn();
const mockFormReset = vi.fn();
const mockFieldHandleChange = vi.fn();

// Per-field state storage so each Field renders with correct state.value
const fieldStateMap: Record<string, unknown> = {};

vi.mock("@tanstack/react-form", () => {
	const useForm = ({
		defaultValues,
		onSubmit,
	}: {
		defaultValues: Record<string, unknown>;
		onSubmit: (args: { value: unknown }) => Promise<void>;
	}) => ({
		handleSubmit: mockHandleSubmit.mockImplementation(() => {
			return onSubmit({ value: { ...defaultValues, ...fieldStateMap } });
		}),
		reset: mockFormReset,
		Field: ({
			name,
			children,
		}: {
			name: string;
			children: (field: {
				state: { value: unknown };
				handleChange: (v: unknown) => void;
			}) => React.ReactNode;
		}) => {
			const resolveDefault = (obj: Record<string, unknown>, path: string): unknown => {
				const parts = path.split(".");
				return parts.reduce<any>((acc, key) => (acc != null ? acc[key] : undefined), obj);
			};
			const stateValue =
				name in fieldStateMap ? fieldStateMap[name] : resolveDefault(defaultValues, name);
			return children({
				state: { value: stateValue ?? "all" },
				handleChange: (v: unknown) => {
					fieldStateMap[name] = v;
					mockFieldHandleChange(name, v);
				},
			});
		},
		defaultValues,
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

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CollectionsFilterSheet } from "../collections-filter-sheet";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	for (const key of Object.keys(fieldStateMap)) {
		delete fieldStateMap[key];
	}
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Builds a real URLSearchParams from an entries array.
 * Supports repeated keys (multiple values per key).
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

	it("renders radio items with correct ids", () => {
		render(<CollectionsFilterSheet />);
		expect(document.getElementById("products-all")).toBeInTheDocument();
		expect(document.getElementById("products-with")).toBeInTheDocument();
		expect(document.getElementById("products-without")).toBeInTheDocument();
	});

	it("renders radio items with correct data-testids", () => {
		render(<CollectionsFilterSheet />);
		expect(screen.getByTestId("radio-all")).toBeInTheDocument();
		expect(screen.getByTestId("radio-with")).toBeInTheDocument();
		expect(screen.getByTestId("radio-without")).toBeInTheDocument();
	});

	// ─── Default checked state ─────────────────────────────────────────────────

	it("defaults to 'all' option checked when no search params", () => {
		render(<CollectionsFilterSheet />);
		expect(screen.getByTestId("radio-all")).toBeChecked();
		expect(screen.getByTestId("radio-with")).not.toBeChecked();
		expect(screen.getByTestId("radio-without")).not.toBeChecked();
	});

	// ─── Radio filter interactions ─────────────────────────────────────────────

	it("calls field.handleChange with 'with' when 'Avec bijoux' radio is changed", () => {
		render(<CollectionsFilterSheet />);
		const radio = screen.getByTestId("radio-with") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("hasProducts", "with");
	});

	it("calls field.handleChange with 'without' when 'Sans bijoux' radio is changed", () => {
		render(<CollectionsFilterSheet />);
		const radio = screen.getByTestId("radio-without") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).toHaveBeenCalledWith("hasProducts", "without");
	});

	it("does not call field.handleChange when already-checked 'all' radio is re-clicked", () => {
		// 'all' is checked by default; clicking it fires onChange with checked=false,
		// which the onCheckedChange guard (if checked) correctly ignores.
		render(<CollectionsFilterSheet />);
		const radio = screen.getByTestId("radio-all") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockFieldHandleChange).not.toHaveBeenCalled();
	});

	it("calls mockRadioOnCheckedChange spy when a radio option is selected", () => {
		render(<CollectionsFilterSheet />);
		const radio = screen.getByTestId("radio-with") as HTMLInputElement;
		fireEvent.click(radio);
		expect(mockRadioOnCheckedChange).toHaveBeenCalledWith("with", true);
	});

	// ─── Active filters counting ───────────────────────────────────────────────

	it("shows 0 active filters when no filter params", () => {
		render(<CollectionsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper).toHaveAttribute("data-count", "0");
		expect(wrapper).toHaveAttribute("data-active", "false");
	});

	it("shows 1 active filter when filter_hasProducts is set", () => {
		mockSearchParams.current = makeSearchParams([["filter_hasProducts", "true"]]);
		render(<CollectionsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper).toHaveAttribute("data-count", "1");
		expect(wrapper).toHaveAttribute("data-active", "true");
	});

	it("does not count page/sortBy/search/perPage as active filters", () => {
		mockSearchParams.current = makeSearchParams([
			["page", "2"],
			["sortBy", "name"],
			["search", "bague"],
			["perPage", "20"],
		]);
		render(<CollectionsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper).toHaveAttribute("data-count", "0");
		expect(wrapper).toHaveAttribute("data-active", "false");
	});

	it("counts multiple filter_ keys independently", () => {
		mockSearchParams.current = makeSearchParams([
			["filter_hasProducts", "true"],
			["filter_someOther", "value"],
		]);
		render(<CollectionsFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper).toHaveAttribute("data-count", "2");
		expect(wrapper).toHaveAttribute("data-active", "true");
	});

	// ─── URL param initialization ──────────────────────────────────────────────

	it("selects 'with' when filter_hasProducts=true", () => {
		mockSearchParams.current = makeSearchParams([["filter_hasProducts", "true"]]);
		render(<CollectionsFilterSheet />);
		expect(screen.getByTestId("radio-with")).toBeChecked();
	});

	it("selects 'without' when filter_hasProducts=false", () => {
		mockSearchParams.current = makeSearchParams([["filter_hasProducts", "false"]]);
		render(<CollectionsFilterSheet />);
		expect(screen.getByTestId("radio-without")).toBeChecked();
	});

	it("falls back to 'all' when filter_hasProducts param is absent", () => {
		mockSearchParams.current = makeSearchParams([["search", "bague"]]);
		render(<CollectionsFilterSheet />);
		expect(screen.getByTestId("radio-all")).toBeChecked();
	});

	// ─── clearAllFilters ───────────────────────────────────────────────────────

	it("calls form.reset when the clear-all button is clicked", () => {
		render(<CollectionsFilterSheet />);
		fireEvent.click(screen.getByTestId("btn-clear"));
		expect(mockFormReset).toHaveBeenCalledOnce();
	});

	it("resets form to default values (hasProducts: 'all') on clear-all", () => {
		render(<CollectionsFilterSheet />);
		fireEvent.click(screen.getByTestId("btn-clear"));
		expect(mockFormReset).toHaveBeenCalledWith({ hasProducts: "all" });
	});

	it("calls router.push when the clear-all button is clicked", () => {
		render(<CollectionsFilterSheet />);
		fireEvent.click(screen.getByTestId("btn-clear"));
		expect(mockRouterPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
	});

	it("removes filter_hasProducts from URL when clearing filters", () => {
		mockSearchParams.current = makeSearchParams([["filter_hasProducts", "true"]]);
		render(<CollectionsFilterSheet />);
		fireEvent.click(screen.getByTestId("btn-clear"));
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("filter_hasProducts");
	});

	it("removes cursor and direction params when clearing filters", () => {
		mockSearchParams.current = makeSearchParams([
			["cursor", "abc123"],
			["direction", "next"],
			["filter_hasProducts", "true"],
		]);
		render(<CollectionsFilterSheet />);
		fireEvent.click(screen.getByTestId("btn-clear"));
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("cursor");
		expect(pushedUrl).not.toContain("direction");
	});

	it("preserves non-filter params (e.g. search) when clearing filters", () => {
		mockSearchParams.current = makeSearchParams([
			["search", "bague"],
			["filter_hasProducts", "true"],
		]);
		render(<CollectionsFilterSheet />);
		fireEvent.click(screen.getByTestId("btn-clear"));
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("search=bague");
	});

	// ─── applyFilters / form submit ────────────────────────────────────────────

	it("calls form.handleSubmit when the apply button is clicked", () => {
		render(<CollectionsFilterSheet />);
		fireEvent.click(screen.getByTestId("btn-apply"));
		expect(mockHandleSubmit).toHaveBeenCalledOnce();
	});

	it("does not bubble the form submit event to parent", () => {
		const parentSubmit = vi.fn();
		render(
			<div onSubmit={parentSubmit}>
				<CollectionsFilterSheet />
			</div>,
		);
		const form = document.querySelector("form")!;
		fireEvent.submit(form);
		expect(parentSubmit).not.toHaveBeenCalled();
	});

	it("calls form.handleSubmit when the inner form is submitted", () => {
		render(<CollectionsFilterSheet />);
		const form = document.querySelector("form")!;
		fireEvent.submit(form);
		expect(mockHandleSubmit).toHaveBeenCalled();
	});

	it("calls router.push with filter_hasProducts=true when 'with' is applied", () => {
		fieldStateMap["hasProducts"] = "with";
		render(<CollectionsFilterSheet />);
		fireEvent.click(screen.getByTestId("btn-apply"));
		expect(mockRouterPush).toHaveBeenCalledWith(
			expect.stringContaining("filter_hasProducts=true"),
			{ scroll: false },
		);
	});

	it("calls router.push with filter_hasProducts=false when 'without' is applied", () => {
		fieldStateMap["hasProducts"] = "without";
		render(<CollectionsFilterSheet />);
		fireEvent.click(screen.getByTestId("btn-apply"));
		expect(mockRouterPush).toHaveBeenCalledWith(
			expect.stringContaining("filter_hasProducts=false"),
			{ scroll: false },
		);
	});

	it("omits filter_hasProducts from URL when 'all' is applied", () => {
		fieldStateMap["hasProducts"] = "all";
		render(<CollectionsFilterSheet />);
		fireEvent.click(screen.getByTestId("btn-apply"));
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("filter_hasProducts");
	});

	it("removes cursor and direction params when applying filters", () => {
		mockSearchParams.current = makeSearchParams([
			["cursor", "abc123"],
			["direction", "next"],
		]);
		fieldStateMap["hasProducts"] = "with";
		render(<CollectionsFilterSheet />);
		fireEvent.click(screen.getByTestId("btn-apply"));
		const pushedUrl = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("cursor");
		expect(pushedUrl).not.toContain("direction");
	});

	// ─── isPending state ───────────────────────────────────────────────────────

	it("passes isPending=false to FilterSheetWrapper initially", () => {
		render(<CollectionsFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-pending", "false");
	});

	it("passes isPending=true when useTransition returns pending=true", () => {
		mockUseTransition.mockReturnValueOnce([true, (fn: () => void) => fn()]);
		render(<CollectionsFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-pending", "true");
	});

	// ─── className / triggerClassName prop ────────────────────────────────────

	it("accepts a className prop without crashing", () => {
		expect(() => render(<CollectionsFilterSheet className="test-class" />)).not.toThrow();
	});

	it("forwards className to FilterSheetWrapper as triggerClassName", () => {
		render(<CollectionsFilterSheet className="custom-class" />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute(
			"data-trigger-classname",
			"custom-class",
		);
	});
});
