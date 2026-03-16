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
		name: "test-textarea",
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

vi.mock("@/shared/components/ui/textarea", () => ({
	Textarea: ({
		id,
		disabled,
		name,
		placeholder,
		value,
		onChange,
		onBlur,
		maxLength,
		className,
		...props
	}: any) => (
		<textarea
			id={id}
			disabled={disabled}
			name={name}
			placeholder={placeholder}
			value={value}
			onChange={onChange}
			onBlur={onBlur}
			maxLength={maxLength}
			className={className}
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

import { TextareaField } from "../textarea-field";
import { useFieldContext } from "@/shared/lib/form-context";

// ============================================================================
// HELPERS
// ============================================================================

function makeFieldContext(value = "", errors: any[] = []) {
	return {
		name: "test-textarea",
		state: {
			value,
			meta: { errors },
		},
		handleChange: mockHandleChange,
		handleBlur: mockHandleBlur,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("TextareaField", () => {
	afterEach(cleanup);

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders a textarea element", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<TextareaField />);
		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});

	it("renders label when label prop is provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<TextareaField label="Description" />);
		expect(screen.getByText("Description")).toBeInTheDocument();
	});

	// ============================================================================
	// PLACEHOLDER
	// ============================================================================

	it("renders placeholder text on the textarea", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<TextareaField placeholder="Rédigez votre message..." />);
		expect(screen.getByPlaceholderText("Rédigez votre message...")).toBeInTheDocument();
	});

	// ============================================================================
	// CHAR COUNTER
	// ============================================================================

	it("displays character counter when showCounter and maxLength are provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext("Bonjour") as any);
		render(<TextareaField showCounter maxLength={200} />);
		expect(screen.getByText("7/200")).toBeInTheDocument();
	});

	it("does not display counter when showCounter is false", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext("Bonjour") as any);
		render(<TextareaField maxLength={200} />);
		expect(screen.queryByText("7/200")).toBeNull();
	});

	// ============================================================================
	// MAXLENGTH
	// ============================================================================

	it("sets maxLength attribute on textarea element", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<TextareaField maxLength={500} />);
		expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", "500");
	});

	// ============================================================================
	// ERROR DISPLAY
	// ============================================================================

	it("renders error alert when field has errors", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext("", [{ message: "Texte requis" }]) as any,
		);
		render(<TextareaField label="Description" />);
		expect(screen.getByRole("alert")).toHaveTextContent("Texte requis");
	});

	it("sets aria-invalid on textarea when field has errors", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext("", [{ message: "Texte requis" }]) as any,
		);
		render(<TextareaField />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
	});

	// ============================================================================
	// CHANGE HANDLER
	// ============================================================================

	it("calls handleChange with new value when user types", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<TextareaField />);
		fireEvent.change(screen.getByRole("textbox"), { target: { value: "Nouveau texte" } });
		expect(mockHandleChange).toHaveBeenCalledWith("Nouveau texte");
	});
});
