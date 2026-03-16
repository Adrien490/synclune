import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockHandleChange, mockHandleBlur } = vi.hoisted(() => ({
	mockHandleChange: vi.fn(),
	mockHandleBlur: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/lib/form-context", () => ({
	useFieldContext: vi.fn(() => ({
		name: "test-input",
		state: {
			value: "",
			meta: { errors: [] },
		},
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

vi.mock("@/shared/components/ui/input", () => ({
	Input: ({
		id,
		type,
		disabled,
		placeholder,
		value,
		onChange,
		onBlur,
		inputMode,
		...props
	}: any) => (
		<input
			id={id}
			type={type}
			disabled={disabled}
			placeholder={placeholder}
			value={value}
			onChange={onChange}
			onBlur={onBlur}
			inputMode={inputMode}
			{...props}
		/>
	),
}));

vi.mock("./field-label", () => ({
	FieldLabel: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { InputField } from "../input-field";
import { useFieldContext } from "@/shared/lib/form-context";

// ============================================================================
// HELPERS
// ============================================================================

function makeFieldContext(overrides: Record<string, unknown> = {}) {
	return {
		name: "test-input",
		state: {
			value: "",
			meta: { errors: [] },
			...((overrides.state as object) ?? {}),
		},
		handleChange: mockHandleChange,
		handleBlur: mockHandleBlur,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("InputField", () => {
	afterEach(cleanup);

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders input with label when label prop is provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<InputField label="Nom" />);
		expect(screen.getByText("Nom")).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});

	it("does not render label element when label prop is omitted", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<InputField />);
		expect(screen.queryByRole("label")).toBeNull();
	});

	// ============================================================================
	// MOBILE INPUTMODE
	// ============================================================================

	it("forwards inputMode prop to native input for mobile keyboards", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<InputField inputMode="email" />);
		const input = screen.getByRole("textbox");
		expect(input).toHaveAttribute("inputmode", "email");
	});

	// ============================================================================
	// ERROR DISPLAY
	// ============================================================================

	it("renders error message and sets aria-invalid when field has errors", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext({
				state: { value: "", meta: { errors: [{ message: "Champ requis" }] } },
			}) as any,
		);
		render(<InputField label="Nom" />);
		expect(screen.getByRole("alert")).toBeInTheDocument();
		expect(screen.getByRole("alert")).toHaveTextContent("Champ requis");
		const input = screen.getByRole("textbox");
		expect(input).toHaveAttribute("aria-invalid", "true");
	});

	// ============================================================================
	// DISABLED STATE
	// ============================================================================

	it("disables the native input when disabled prop is true", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<InputField disabled />);
		expect(screen.getByRole("textbox")).toBeDisabled();
	});

	// ============================================================================
	// PLACEHOLDER
	// ============================================================================

	it("renders placeholder text on the input element", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<InputField placeholder="Entrez votre nom" />);
		expect(screen.getByPlaceholderText("Entrez votre nom")).toBeInTheDocument();
	});

	// ============================================================================
	// CHANGE HANDLER
	// ============================================================================

	it("calls handleChange with the new value on input change", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<InputField />);
		fireEvent.change(screen.getByRole("textbox"), { target: { value: "Alice" } });
		expect(mockHandleChange).toHaveBeenCalledWith("Alice");
	});
});
