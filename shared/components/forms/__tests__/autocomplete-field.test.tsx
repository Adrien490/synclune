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
	FieldLabel: ({ children, required, optional }: any) => (
		<label>
			{children}
			{required && <span aria-hidden="true">*</span>}
			{optional && !required && <span>(Optionnel)</span>}
		</label>
	),
}));

/* eslint-disable jsx-a11y/role-has-required-aria-props, jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/click-events-have-key-events */
// Controllable Autocomplete mock
vi.mock("@/shared/components/autocomplete", () => ({
	Autocomplete: ({
		name,
		value,
		onChange,
		onSelect,
		items,
		getItemLabel,
		placeholder,
		disabled,
		"aria-invalid": ariaInvalid,
		"aria-required": ariaRequired,
	}: any) => {
		return (
			<div data-testid="autocomplete" aria-invalid={ariaInvalid} aria-required={ariaRequired}>
				<input
					name={name}
					value={value}
					placeholder={placeholder}
					disabled={disabled}
					onChange={(e) => onChange(e.target.value)}
					role="combobox"
					aria-autocomplete="list"
					aria-expanded={items?.length > 0}
				/>
				{items?.length > 0 && (
					<ul role="listbox">
						{items.map((item: any, index: number) => (
							<li
								key={index}
								role="option"
								onClick={() => onSelect?.(item)}
								data-testid={`suggestion-${index}`}
							>
								{getItemLabel(item)}
							</li>
						))}
					</ul>
				)}
				{value && (
					<button type="button" onClick={() => onChange("")} aria-label="Effacer">
						×
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

const createFieldState = (value: string, errors: any[] = []) => ({
	state: { value, meta: { errors } },
	name: "address",
	handleChange: mockHandleChange,
	handleBlur: vi.fn(),
});

vi.mock("@/shared/lib/form-context", () => ({
	useFieldContext: vi.fn(),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { AutocompleteField } from "../autocomplete-field";
import { useFieldContext } from "@/shared/lib/form-context";

const mockUseFieldContext = vi.mocked(useFieldContext);

type AddressItem = { label: string; city: string };

const items: AddressItem[] = [
	{ label: "12 rue de la Paix", city: "Paris" },
	{ label: "8 avenue Montaigne", city: "Paris" },
];

const baseProps = {
	items,
	getItemLabel: (item: AddressItem) => item.label,
	placeholder: "Rechercher une adresse",
	onSelect: vi.fn(),
};

// ============================================================================
// TESTS
// ============================================================================

describe("AutocompleteField", () => {
	afterEach(() => {
		cleanup();
		mockHandleChange.mockClear();
	});

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders the autocomplete input", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<AutocompleteField<AddressItem> {...baseProps} />);
		expect(screen.getByRole("combobox")).toBeInTheDocument();
	});

	it("renders label when provided", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<AutocompleteField<AddressItem> {...baseProps} label="Adresse" />);
		expect(screen.getByText("Adresse")).toBeInTheDocument();
	});

	it("passes current field value to the autocomplete input", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("12 rue") as any);
		render(<AutocompleteField<AddressItem> {...baseProps} />);
		expect(screen.getByRole("combobox")).toHaveValue("12 rue");
	});

	// ============================================================================
	// SUGGESTION DISPLAY
	// ============================================================================

	it("renders suggestion items in listbox", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("rue") as any);
		render(<AutocompleteField<AddressItem> {...baseProps} />);
		const options = screen.getAllByRole("option");
		expect(options).toHaveLength(2);
		expect(options[0]).toHaveTextContent("12 rue de la Paix");
		expect(options[1]).toHaveTextContent("8 avenue Montaigne");
	});

	// ============================================================================
	// SELECTION
	// ============================================================================

	it("calls onSelect callback when a suggestion is clicked", () => {
		const onSelect = vi.fn();
		mockUseFieldContext.mockReturnValue(createFieldState("rue") as any);
		render(<AutocompleteField<AddressItem> {...baseProps} onSelect={onSelect} />);
		fireEvent.click(screen.getByTestId("suggestion-0"));
		expect(onSelect).toHaveBeenCalledWith(items[0]);
	});

	// ============================================================================
	// TYPING / ONCHANGE
	// ============================================================================

	it("calls handleChange when user types in the input", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<AutocompleteField<AddressItem> {...baseProps} />);
		fireEvent.change(screen.getByRole("combobox"), { target: { value: "montaigne" } });
		expect(mockHandleChange).toHaveBeenCalledWith("montaigne");
	});

	// ============================================================================
	// CLEAR
	// ============================================================================

	it("renders clear button when field has a value", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("12 rue de la Paix") as any);
		render(<AutocompleteField<AddressItem> {...baseProps} />);
		expect(screen.getByRole("button", { name: "Effacer" })).toBeInTheDocument();
	});

	it("clears field value when clear button is clicked", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("12 rue de la Paix") as any);
		render(<AutocompleteField<AddressItem> {...baseProps} />);
		fireEvent.click(screen.getByRole("button", { name: "Effacer" }));
		expect(mockHandleChange).toHaveBeenCalledWith("");
	});

	it("does not render clear button when field is empty", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<AutocompleteField<AddressItem> {...baseProps} />);
		expect(screen.queryByRole("button", { name: "Effacer" })).toBeNull();
	});

	// ============================================================================
	// ERROR STATE
	// ============================================================================

	it("renders error message when field has errors", () => {
		mockUseFieldContext.mockReturnValue(
			createFieldState("", [{ message: "Adresse requise" }]) as any,
		);
		render(<AutocompleteField<AddressItem> {...baseProps} />);
		expect(screen.getByRole("alert")).toHaveTextContent("Adresse requise");
	});

	it("sets aria-invalid when field has errors", () => {
		mockUseFieldContext.mockReturnValue(
			createFieldState("", [{ message: "Adresse requise" }]) as any,
		);
		render(<AutocompleteField<AddressItem> {...baseProps} />);
		const autocomplete = screen.getByTestId("autocomplete");
		expect(autocomplete).toHaveAttribute("aria-invalid", "true");
	});
});
