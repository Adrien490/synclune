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
		name: "test-checkbox",
		state: {
			value: false,
			meta: { errors: [], isBlurred: true },
		},
		form: { store: fakeFormStore },
		handleChange: mockHandleChange,
		handleBlur: mockHandleBlur,
	})),
}));

// Render Checkbox as a native checkbox for easy interaction in jsdom
vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({
		id,
		checked,
		onCheckedChange,
		disabled,
		"aria-label": ariaLabel,
		...props
	}: any) => (
		<input
			type="checkbox"
			id={id}
			checked={checked}
			disabled={disabled}
			aria-label={ariaLabel}
			onChange={(e) => onCheckedChange(e.target.checked)}
			{...props}
		/>
	),
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
	FieldLabel: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CheckboxField } from "../checkbox-field";
import { useFieldContext } from "@/shared/lib/form-context";

// ============================================================================
// HELPERS
// ============================================================================

function makeFieldContext(overrides: Record<string, unknown> = {}) {
	return {
		name: "test-checkbox",
		state: {
			value: false,
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

describe("CheckboxField", () => {
	afterEach(cleanup);

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders a checkbox input", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<CheckboxField />);
		expect(screen.getByRole("checkbox")).toBeInTheDocument();
	});

	it("renders label text when label prop is provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<CheckboxField label="J'accepte les CGU" />);
		expect(screen.getByText("J'accepte les CGU")).toBeInTheDocument();
	});

	// ============================================================================
	// CHECKED STATE
	// ============================================================================

	it("reflects checked state from field value", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext({ state: { value: true, meta: { errors: [], isBlurred: true } } }) as any,
		);
		render(<CheckboxField />);
		expect(screen.getByRole("checkbox")).toBeChecked();
	});

	it("reflects unchecked state from field value", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext({ state: { value: false, meta: { errors: [], isBlurred: true } } }) as any,
		);
		render(<CheckboxField />);
		expect(screen.getByRole("checkbox")).not.toBeChecked();
	});

	// ============================================================================
	// TOGGLE
	// ============================================================================

	it("calls handleChange with true when unchecked checkbox is toggled", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<CheckboxField />);
		fireEvent.click(screen.getByRole("checkbox"));
		expect(mockHandleChange).toHaveBeenCalledWith(true);
	});

	// ============================================================================
	// ARIA-LABEL
	// ============================================================================

	it("passes aria-label to checkbox element when provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<CheckboxField aria-label="Accepter les conditions d'utilisation" />);
		expect(screen.getByRole("checkbox")).toHaveAttribute(
			"aria-label",
			"Accepter les conditions d'utilisation",
		);
	});

	// ============================================================================
	// DISABLED STATE
	// ============================================================================

	it("disables the checkbox when disabled prop is true", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<CheckboxField disabled />);
		expect(screen.getByRole("checkbox")).toBeDisabled();
	});
});
