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
		name: "test-password",
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

// Render Input with endIcon support so the toggle button is rendered
vi.mock("@/shared/components/ui/input", () => ({
	Input: ({
		id,
		type,
		disabled,
		placeholder,
		value,
		onChange,
		onBlur,
		endIcon,
		"aria-invalid": ariaInvalid,
		...props
	}: any) => (
		<div>
			<input
				id={id}
				type={type}
				disabled={disabled}
				placeholder={placeholder}
				value={value}
				onChange={onChange}
				onBlur={onBlur}
				aria-invalid={ariaInvalid}
				{...props}
			/>
			{endIcon}
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
	Eye: () => <span data-testid="eye-icon" />,
	EyeOff: () => <span data-testid="eye-off-icon" />,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { PasswordInputField } from "../password-input-field";
import { useFieldContext } from "@/shared/lib/form-context";

// ============================================================================
// HELPERS
// ============================================================================

function makeFieldContext(overrides: Record<string, unknown> = {}) {
	return {
		name: "test-password",
		state: {
			value: "",
			meta: { errors: [] },
			...(overrides.state as object),
		},
		handleChange: mockHandleChange,
		handleBlur: mockHandleBlur,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("PasswordInputField", () => {
	afterEach(cleanup);

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders a password input by default", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PasswordInputField />);
		expect(screen.getByDisplayValue("")).toBeInTheDocument();
		const input = document.querySelector("input");
		expect(input).toHaveAttribute("type", "password");
	});

	it("renders label when label prop is provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PasswordInputField label="Mot de passe" />);
		expect(screen.getByText("Mot de passe")).toBeInTheDocument();
	});

	// ============================================================================
	// SHOW/HIDE TOGGLE
	// ============================================================================

	it("shows Eye icon (show-password button) by default", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PasswordInputField />);
		expect(screen.getByTestId("eye-icon")).toBeInTheDocument();
		expect(screen.queryByTestId("eye-off-icon")).toBeNull();
	});

	it("changes input type to text when toggle button is clicked", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PasswordInputField />);
		const toggleBtn = screen.getByRole("button", { name: "Afficher le mot de passe" });
		fireEvent.click(toggleBtn);
		const input = document.querySelector("input");
		expect(input).toHaveAttribute("type", "text");
	});

	it("shows EyeOff icon after toggle to visible state", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PasswordInputField />);
		fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
		expect(screen.getByTestId("eye-off-icon")).toBeInTheDocument();
		expect(screen.queryByTestId("eye-icon")).toBeNull();
	});

	it("changes input type back to password on second toggle click", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PasswordInputField />);
		fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
		fireEvent.click(screen.getByRole("button", { name: "Masquer le mot de passe" }));
		const input = document.querySelector("input");
		expect(input).toHaveAttribute("type", "password");
	});

	// ============================================================================
	// ARIA ATTRIBUTES
	// ============================================================================

	it("toggle button has correct initial aria-label", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PasswordInputField />);
		expect(screen.getByRole("button", { name: "Afficher le mot de passe" })).toBeInTheDocument();
	});

	it("toggle button aria-label updates after toggle", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PasswordInputField />);
		fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
		expect(screen.getByRole("button", { name: "Masquer le mot de passe" })).toBeInTheDocument();
	});

	// ============================================================================
	// ERROR DISPLAY
	// ============================================================================

	it("renders error alert when field has errors", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext({
				state: { value: "", meta: { errors: [{ message: "Mot de passe invalide" }] } },
			}) as any,
		);
		render(<PasswordInputField />);
		expect(screen.getByRole("alert")).toHaveTextContent("Mot de passe invalide");
	});

	// ============================================================================
	// DISABLED STATE
	// ============================================================================

	it("disables the input when disabled prop is true", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PasswordInputField disabled />);
		expect(document.querySelector("input")).toBeDisabled();
	});
});
