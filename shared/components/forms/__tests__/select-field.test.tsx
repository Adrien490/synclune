import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockHandleChange, mockHandleBlur, fakeFormStore } = vi.hoisted(() => {
	const fakeFormStore = {
		state: { submissionAttempts: 0 },
		get: () => fakeFormStore.state,
		subscribe: () => ({ unsubscribe: () => {} }),
	};
	return {
		mockHandleChange: vi.fn(),
		mockHandleBlur: vi.fn(),
		fakeFormStore,
	};
});

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/lib/form-context", () => ({
	useFieldContext: vi.fn(() => ({
		name: "test-select",
		state: {
			value: undefined,
			meta: { errors: [], isBlurred: true },
		},
		form: { store: fakeFormStore },
		handleChange: mockHandleChange,
		handleBlur: mockHandleBlur,
	})),
}));

vi.mock("@/shared/components/ui/field", () => ({
	Field: ({ children, ...props }: any) => (
		<div data-testid="field" {...props}>
			{children}
		</div>
	),
	FieldError: ({ errors, id }: any) =>
		errors && errors.length > 0 ? (
			<div role="alert" id={id}>
				{errors[0]?.message ?? errors[0]}
			</div>
		) : null,
}));

// Mock NativeSelect to render a real <select> so we can interact with it in jsdom
vi.mock("@/shared/components/ui/native-select", () => ({
	NativeSelect: ({ id, name, disabled, value, onChange, onBlur, children, ...props }: any) => (
		<select
			id={id}
			name={name}
			disabled={disabled}
			value={value}
			onChange={onChange}
			onBlur={onBlur}
			{...props}
		>
			{children}
		</select>
	),
	NativeSelectOption: ({ value, disabled, children }: any) => (
		<option value={value} disabled={disabled}>
			{children}
		</option>
	),
}));

// Mock Radix Select — it is hidden on mobile (md:block), but we render a simplified
// version for tests. jsdom has no concept of CSS, so both branches render visually.
vi.mock("@/shared/components/ui/select", () => ({
	Select: ({ children, onValueChange: _onValueChange, value, disabled }: any) => (
		<div data-testid="radix-select" data-value={value} data-disabled={disabled}>
			{children}
		</div>
	),
	SelectTrigger: ({ children }: any) => <div>{children}</div>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
	SelectContent: ({ children }: any) => <div>{children}</div>,
	SelectItem: ({ value, children, ...props }: any) => (
		<div data-testid={`select-item-${value}`} {...props}>
			{children}
		</div>
	),
}));

vi.mock("./field-label", () => ({
	FieldLabel: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	X: () => <span data-testid="x-icon" />,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { SelectField } from "../select-field";
import { useFieldContext } from "@/shared/lib/form-context";

// ============================================================================
// HELPERS
// ============================================================================

const OPTIONS = [
	{ value: "fr", label: "France" },
	{ value: "be", label: "Belgique" },
	{ value: "ch", label: "Suisse" },
];

function makeFieldContext(overrides: Record<string, unknown> = {}) {
	return {
		name: "test-select",
		state: {
			value: undefined,
			meta: { errors: [], isBlurred: true },
			...(overrides.state as object),
		},
		form: { store: fakeFormStore },
		handleChange: mockHandleChange,
		handleBlur: mockHandleBlur,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("SelectField", () => {
	afterEach(cleanup);

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders all option labels in the native select", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<SelectField options={OPTIONS} />);
		for (const opt of OPTIONS) {
			expect(screen.getByRole("option", { name: opt.label })).toBeInTheDocument();
		}
	});

	it("renders label when label prop is provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<SelectField options={OPTIONS} label="Pays" />);
		expect(screen.getByText("Pays")).toBeInTheDocument();
	});

	// ============================================================================
	// PLACEHOLDER
	// ============================================================================

	it("renders placeholder option in native select when placeholder is provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<SelectField options={OPTIONS} placeholder="Sélectionner..." />);
		expect(screen.getByRole("option", { name: "Sélectionner..." })).toBeInTheDocument();
	});

	// ============================================================================
	// SELECTION CHANGE
	// ============================================================================

	it("calls handleChange with selected value on native select change", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<SelectField options={OPTIONS} />);
		const select = screen.getByRole("combobox");
		fireEvent.change(select, { target: { value: "fr" } });
		expect(mockHandleChange).toHaveBeenCalledWith("fr");
	});

	// ============================================================================
	// DISABLED STATE
	// ============================================================================

	it("disables the native select when disabled prop is true", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<SelectField options={OPTIONS} disabled />);
		expect(screen.getByRole("combobox")).toBeDisabled();
	});

	// ============================================================================
	// ERROR DISPLAY
	// ============================================================================

	it("renders error alert when field has errors", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext({
				state: {
					value: undefined,
					meta: { errors: [{ message: "Sélection requise" }], isBlurred: true },
				},
			}) as any,
		);
		render(<SelectField options={OPTIONS} />);
		expect(screen.getByRole("alert")).toHaveTextContent("Sélection requise");
	});

	// ============================================================================
	// CLEARABLE
	// ============================================================================

	it("clears selection when clearable button is clicked (native select: empty value)", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext({ state: { value: "fr", meta: { errors: [], isBlurred: true } } }) as any,
		);
		render(<SelectField options={OPTIONS} clearable />);
		// Selecting empty string on native select triggers handleChange with undefined
		const select = screen.getByRole("combobox");
		fireEvent.change(select, { target: { value: "" } });
		expect(mockHandleChange).toHaveBeenCalledWith(undefined);
	});
});
