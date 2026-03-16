import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/field", () => ({
	Field: ({ children, ...props }: any) => <div {...props}>{children}</div>,
	FieldError: ({ errors }: any) =>
		errors?.length > 0 ? <div role="alert">{errors[0]?.message ?? errors[0]}</div> : null,
}));

vi.mock("../field-label", () => ({
	FieldLabel: ({ children, required }: any) => (
		<label>
			{children}
			{required && <span aria-hidden="true">*</span>}
		</label>
	),
}));

// Controllable MultiSelect mock
let capturedOnValueChange: ((values: string[]) => void) | undefined;

vi.mock("@/shared/components/multi-select", () => ({
	MultiSelect: ({
		options,
		defaultValue,
		onValueChange,
		placeholder,
		disabled,
		"aria-invalid": ariaInvalid,
		"aria-required": ariaRequired,
	}: any) => {
		capturedOnValueChange = onValueChange;
		const selected: string[] = defaultValue ?? [];

		const toggle = (value: string) => {
			const next = selected.includes(value)
				? selected.filter((v: string) => v !== value)
				: [...selected, value];
			onValueChange(next);
		};

		return (
			<div data-testid="multi-select" aria-invalid={ariaInvalid} aria-required={ariaRequired}>
				<button type="button" data-testid="multi-select-trigger">
					{selected.length === 0
						? placeholder
						: selected.map((v: string) => (
								<span key={v} data-testid={`badge-${v}`} className="badge">
									{options.find((o: any) => o.value === v)?.label ?? v}
								</span>
							))}
				</button>
				<ul role="listbox">
					{options.map((option: any) => (
						<li
							key={option.value}
							role="option"
							aria-selected={selected.includes(option.value)}
							onClick={() => toggle(option.value)}
							data-testid={`option-${option.value}`}
						>
							{option.label}
						</li>
					))}
				</ul>
				{selected.length > 0 && (
					<button type="button" data-testid="clear-all" onClick={() => onValueChange([])}>
						Tout effacer
					</button>
				)}
			</div>
		);
	},
}));

// ============================================================================
// FORM CONTEXT MOCK
// ============================================================================

const mockHandleChange = vi.fn();

const createFieldState = (value: string[], errors: any[] = []) => ({
	state: { value, meta: { errors } },
	name: "collections",
	handleChange: mockHandleChange,
	handleBlur: vi.fn(),
});

vi.mock("@/shared/lib/form-context", () => ({
	useFieldContext: vi.fn(),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { MultiSelectField } from "../multi-select-field";
import { useFieldContext } from "@/shared/lib/form-context";

const mockUseFieldContext = vi.mocked(useFieldContext);

const options = [
	{ value: "col-1", label: "Printemps" },
	{ value: "col-2", label: "Été" },
	{ value: "col-3", label: "Automne" },
];

// ============================================================================
// TESTS
// ============================================================================

describe("MultiSelectField", () => {
	afterEach(() => {
		cleanup();
		mockHandleChange.mockClear();
	});

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders the MultiSelect component", () => {
		mockUseFieldContext.mockReturnValue(createFieldState([]) as any);
		render(<MultiSelectField options={options} />);
		expect(screen.getByTestId("multi-select")).toBeInTheDocument();
	});

	it("renders placeholder when no options are selected", () => {
		mockUseFieldContext.mockReturnValue(createFieldState([]) as any);
		render(<MultiSelectField options={options} placeholder="Choisir des collections" />);
		expect(screen.getByText("Choisir des collections")).toBeInTheDocument();
	});

	it("renders label when provided", () => {
		mockUseFieldContext.mockReturnValue(createFieldState([]) as any);
		render(<MultiSelectField options={options} label="Collections" />);
		expect(screen.getByText("Collections")).toBeInTheDocument();
	});

	it("renders all available options in listbox", () => {
		mockUseFieldContext.mockReturnValue(createFieldState([]) as any);
		render(<MultiSelectField options={options} />);
		const opts = screen.getAllByRole("option");
		expect(opts).toHaveLength(3);
	});

	// ============================================================================
	// MULTI SELECTION
	// ============================================================================

	it("calls handleChange when an option is selected", () => {
		mockUseFieldContext.mockReturnValue(createFieldState([]) as any);
		render(<MultiSelectField options={options} />);
		fireEvent.click(screen.getByTestId("option-col-1"));
		expect(mockHandleChange).toHaveBeenCalledWith(["col-1"]);
	});

	it("calls handleChange with multiple values when multiple options are selected", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(["col-1"]) as any);
		render(<MultiSelectField options={options} />);
		fireEvent.click(screen.getByTestId("option-col-2"));
		expect(mockHandleChange).toHaveBeenCalledWith(["col-1", "col-2"]);
	});

	// ============================================================================
	// DESELECTION
	// ============================================================================

	it("calls handleChange without deselected value when an already-selected option is clicked", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(["col-1", "col-2"]) as any);
		render(<MultiSelectField options={options} />);
		fireEvent.click(screen.getByTestId("option-col-1"));
		expect(mockHandleChange).toHaveBeenCalledWith(["col-2"]);
	});

	// ============================================================================
	// BADGE DISPLAY
	// ============================================================================

	it("renders badges for selected values", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(["col-1", "col-3"]) as any);
		render(<MultiSelectField options={options} />);
		expect(screen.getByTestId("badge-col-1")).toBeInTheDocument();
		expect(screen.getByTestId("badge-col-3")).toBeInTheDocument();
	});

	it("does not render badge for non-selected values", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(["col-1"]) as any);
		render(<MultiSelectField options={options} />);
		expect(screen.queryByTestId("badge-col-2")).toBeNull();
	});

	// ============================================================================
	// CLEAR ALL
	// ============================================================================

	it("renders clear-all button when at least one value is selected", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(["col-1"]) as any);
		render(<MultiSelectField options={options} />);
		expect(screen.getByTestId("clear-all")).toBeInTheDocument();
	});

	it("calls handleChange with empty array when clear-all is clicked", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(["col-1", "col-2"]) as any);
		render(<MultiSelectField options={options} />);
		fireEvent.click(screen.getByTestId("clear-all"));
		expect(mockHandleChange).toHaveBeenCalledWith([]);
	});

	it("does not render clear-all button when nothing is selected", () => {
		mockUseFieldContext.mockReturnValue(createFieldState([]) as any);
		render(<MultiSelectField options={options} />);
		expect(screen.queryByTestId("clear-all")).toBeNull();
	});

	// ============================================================================
	// ERROR STATE
	// ============================================================================

	it("renders error message when field has errors", () => {
		mockUseFieldContext.mockReturnValue(
			createFieldState([], [{ message: "Au moins une collection requise" }]) as any,
		);
		render(<MultiSelectField options={options} />);
		expect(screen.getByRole("alert")).toHaveTextContent("Au moins une collection requise");
	});

	it("sets aria-invalid when field has errors", () => {
		mockUseFieldContext.mockReturnValue(createFieldState([], [{ message: "Erreur" }]) as any);
		render(<MultiSelectField options={options} />);
		expect(screen.getByTestId("multi-select")).toHaveAttribute("aria-invalid", "true");
	});
});
