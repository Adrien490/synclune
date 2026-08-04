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

vi.mock("@/shared/components/ui/input-group", () => ({
	InputGroup: ({ children, ...props }: any) => (
		<div role="group" {...props}>
			{children}
		</div>
	),
	InputGroupInput: ({
		id,
		type,
		value,
		onChange,
		onBlur,
		disabled,
		placeholder,
		...props
	}: any) => (
		<input
			id={id}
			type={type}
			value={value}
			onChange={onChange}
			onBlur={onBlur}
			disabled={disabled}
			placeholder={placeholder}
			{...props}
		/>
	),
}));

vi.mock("../field-label", () => ({
	FieldLabel: ({ children, required, optional, htmlFor }: any) => (
		<label htmlFor={htmlFor}>
			{children}
			{required && <span aria-hidden="true">*</span>}
			{optional && !required && <span>(Optionnel)</span>}
		</label>
	),
}));

// ============================================================================
// FORM CONTEXT MOCK
// ============================================================================

const { fakeFormStore } = vi.hoisted(() => {
	const fakeFormStore = {
		state: { submissionAttempts: 0 },
		get: () => fakeFormStore.state,
		subscribe: () => ({ unsubscribe: () => {} }),
	};
	return { fakeFormStore };
});

const mockHandleChange = vi.fn();
const mockHandleBlur = vi.fn();

const createFieldState = (value: string | number | null, errors: any[] = []) => ({
	state: { value, meta: { errors, isBlurred: true } },
	name: "price",
	form: { store: fakeFormStore },
	handleChange: mockHandleChange,
	handleBlur: mockHandleBlur,
});

vi.mock("@/shared/lib/form-context", () => ({
	useFieldContext: vi.fn(),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { InputGroupField } from "../input-group-field";
import { useFieldContext } from "@/shared/lib/form-context";

const mockUseFieldContext = vi.mocked(useFieldContext);

// ============================================================================
// TESTS
// ============================================================================

describe("InputGroupField", () => {
	afterEach(() => {
		cleanup();
		mockHandleChange.mockClear();
		mockHandleBlur.mockClear();
	});

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders the input element", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<InputGroupField />);
		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});

	it("renders label when provided", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<InputGroupField label="Prix" />);
		expect(screen.getByText("Prix")).toBeInTheDocument();
	});

	it("renders placeholder when provided", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<InputGroupField placeholder="0.00" />);
		expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
	});

	// ============================================================================
	// PREFIX / SUFFIX DISPLAY
	// ============================================================================

	it("renders prefix addon children", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(
			<InputGroupField>
				<span data-testid="prefix">€</span>
			</InputGroupField>,
		);
		expect(screen.getByTestId("prefix")).toBeInTheDocument();
	});

	it("renders suffix addon children", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(
			<InputGroupField>
				<span data-testid="suffix">kg</span>
			</InputGroupField>,
		);
		expect(screen.getByTestId("suffix")).toBeInTheDocument();
	});

	// ============================================================================
	// INPUT INTERACTIONS
	// ============================================================================

	it("calls handleChange with string value for text type input", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<InputGroupField />);
		fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
		expect(mockHandleChange).toHaveBeenCalledWith("hello");
	});

	it("calls handleChange with numeric value for number type input", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(null) as any);
		render(<InputGroupField type="number" />);
		const input = screen.getByRole("spinbutton");
		fireEvent.change(input, { target: { value: "42", valueAsNumber: 42 } });
		expect(mockHandleChange).toHaveBeenCalledWith(42);
	});

	it("calls handleChange with null when number input is cleared", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(10) as any);
		render(<InputGroupField type="number" />);
		const input = screen.getByRole("spinbutton");
		fireEvent.change(input, { target: { value: "", valueAsNumber: NaN } });
		expect(mockHandleChange).toHaveBeenCalledWith(null);
	});

	it("displays 0 correctly for number type (not empty string)", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(0) as any);
		render(<InputGroupField type="number" />);
		const input = screen.getByRole("spinbutton");
		expect(input).toHaveValue(0);
	});

	it("calls handleBlur when input loses focus", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<InputGroupField />);
		fireEvent.blur(screen.getByRole("textbox"));
		expect(mockHandleBlur).toHaveBeenCalledOnce();
	});

	// ============================================================================
	// DISABLED
	// ============================================================================

	it("disables the input when disabled prop is true", () => {
		mockUseFieldContext.mockReturnValue(createFieldState("") as any);
		render(<InputGroupField disabled />);
		expect(screen.getByRole("textbox")).toBeDisabled();
	});

	// ============================================================================
	// ERROR STATE
	// ============================================================================

	it("renders error message when field has errors", () => {
		mockUseFieldContext.mockReturnValue(
			createFieldState("", [{ message: "Prix invalide" }]) as any,
		);
		render(<InputGroupField />);
		expect(screen.getByRole("alert")).toHaveTextContent("Prix invalide");
	});

	it("sets aria-invalid on input when field has errors", () => {
		mockUseFieldContext.mockReturnValue(
			createFieldState("", [{ message: "Prix invalide" }]) as any,
		);
		render(<InputGroupField />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
	});
});
