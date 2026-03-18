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
		name: "test-switch",
		state: {
			value: false,
			meta: { errors: [] },
		},
		handleChange: mockHandleChange,
		handleBlur: mockHandleBlur,
	})),
}));

// Render Switch as a native checkbox for easy interaction in jsdom
vi.mock("@/shared/components/ui/switch", () => ({
	Switch: ({
		id,
		checked,
		onCheckedChange,
		disabled,
		"aria-label": ariaLabel,
		"aria-invalid": ariaInvalid,
		"aria-describedby": ariaDescribedBy,
		"aria-required": ariaRequired,
	}: any) => (
		<button
			role="switch"
			id={id}
			aria-checked={checked}
			aria-label={ariaLabel}
			aria-invalid={ariaInvalid}
			aria-describedby={ariaDescribedBy}
			aria-required={ariaRequired}
			disabled={disabled}
			onClick={() => onCheckedChange(!checked)}
			type="button"
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

import { SwitchField } from "../switch-field";
import { useFieldContext } from "@/shared/lib/form-context";

// ============================================================================
// HELPERS
// ============================================================================

function makeFieldContext(overrides: Record<string, unknown> = {}) {
	return {
		name: "test-switch",
		state: {
			value: false,
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

describe("SwitchField", () => {
	afterEach(cleanup);

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders a switch element", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<SwitchField />);
		expect(screen.getByRole("switch")).toBeInTheDocument();
	});

	it("renders label text when label prop is provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<SwitchField label="Activer les notifications" />);
		expect(screen.getByText("Activer les notifications")).toBeInTheDocument();
	});

	// ============================================================================
	// DEFAULT STATE
	// ============================================================================

	it("reflects default off state from field value", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext({ state: { value: false, meta: { errors: [] } } }) as any,
		);
		render(<SwitchField />);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
	});

	it("reflects checked state when field value is true", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext({ state: { value: true, meta: { errors: [] } } }) as any,
		);
		render(<SwitchField />);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
	});

	// ============================================================================
	// TOGGLE
	// ============================================================================

	it("calls handleChange with true when off switch is toggled", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<SwitchField />);
		fireEvent.click(screen.getByRole("switch"));
		expect(mockHandleChange).toHaveBeenCalledWith(true);
	});

	it("calls handleChange with false when on switch is toggled", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext({ state: { value: true, meta: { errors: [] } } }) as any,
		);
		render(<SwitchField />);
		fireEvent.click(screen.getByRole("switch"));
		expect(mockHandleChange).toHaveBeenCalledWith(false);
	});

	// ============================================================================
	// DISABLED STATE
	// ============================================================================

	it("disables the switch when disabled prop is true", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<SwitchField disabled />);
		expect(screen.getByRole("switch")).toBeDisabled();
	});

	// ============================================================================
	// DESCRIPTION
	// ============================================================================

	it("renders description text when description prop is provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<SwitchField description="Active les emails promotionnels" />);
		expect(screen.getByText("Active les emails promotionnels")).toBeInTheDocument();
	});

	// ============================================================================
	// ARIA
	// ============================================================================

	it("sets aria-label on switch element when aria-label prop is provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<SwitchField aria-label="Activer le mode sombre" />);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-label", "Activer le mode sombre");
	});
});
