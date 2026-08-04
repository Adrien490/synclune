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
		name: "test-radio",
		state: {
			value: "",
			meta: { errors: [], isBlurred: true },
		},
		form: { store: fakeFormStore },
		handleChange: mockHandleChange,
		handleBlur: mockHandleBlur,
	})),
}));

// Render RadioGroup as a fieldset and each item as a native radio button
vi.mock("@/shared/components/ui/radio-group", () => ({
	RadioGroup: ({
		children,
		onValueChange,
		disabled,
		value,
		"aria-label": ariaLabel,
		"aria-labelledby": ariaLabelledBy,
		"aria-invalid": ariaInvalid,
		"aria-describedby": ariaDescribedBy,
	}: any) => (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
		<div
			role="radiogroup"
			aria-label={ariaLabel}
			aria-labelledby={ariaLabelledBy}
			aria-invalid={ariaInvalid}
			aria-describedby={ariaDescribedBy}
			data-value={value}
			data-disabled={disabled}
			onClick={(e) => {
				const target = e.target as HTMLInputElement;
				if (target.type === "radio") {
					onValueChange?.(target.value);
				}
			}}
		>
			{children}
		</div>
	),
	RadioGroupItem: ({ value, id, disabled }: any) => (
		<input type="radio" id={id} value={value} disabled={disabled} readOnly />
	),
}));

vi.mock("@/shared/components/ui/field", () => ({
	FieldSet: ({ children, ...props }: any) => (
		<fieldset data-testid="fieldset" {...props}>
			{children}
		</fieldset>
	),
	FieldError: ({ errors, id }: any) =>
		errors && errors.length > 0 ? (
			<div role="alert" id={id}>
				{errors[0]?.message ?? errors[0]}
			</div>
		) : null,
}));

vi.mock("./field-label", () => ({
	FieldLabel: ({ children }: any) => <legend>{children}</legend>,
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor, className }: any) => (
		<label htmlFor={htmlFor} className={className}>
			{children}
		</label>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { RadioGroupField } from "../radio-group-field";
import { useFieldContext } from "@/shared/lib/form-context";

// ============================================================================
// HELPERS
// ============================================================================

const OPTIONS = [
	{ value: "standard", label: "Standard" },
	{ value: "express", label: "Express" },
	{ value: "overnight", label: "Nuit" },
];

function makeFieldContext(overrides: Record<string, unknown> = {}) {
	return {
		name: "test-radio",
		state: {
			value: "",
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

describe("RadioGroupField", () => {
	afterEach(cleanup);

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders all option labels", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<RadioGroupField options={OPTIONS} />);
		for (const opt of OPTIONS) {
			expect(screen.getByText(opt.label)).toBeInTheDocument();
		}
	});

	it("renders a radio input for each option", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<RadioGroupField options={OPTIONS} />);
		const radios = screen.getAllByRole("radio");
		expect(radios).toHaveLength(OPTIONS.length);
	});

	// ============================================================================
	// LABEL
	// ============================================================================

	it("renders group label when label prop is provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<RadioGroupField options={OPTIONS} label="Livraison" />);
		expect(screen.getByText("Livraison")).toBeInTheDocument();
	});

	// ============================================================================
	// SELECTION
	// ============================================================================

	it("calls handleChange when a radio option is clicked", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<RadioGroupField options={OPTIONS} />);
		const radios = screen.getAllByRole("radio");
		fireEvent.click(radios[0]!);
		expect(mockHandleChange).toHaveBeenCalledWith(OPTIONS[0]!.value);
	});

	// ============================================================================
	// DEFAULT VALUE
	// ============================================================================

	it("reflects default value from field state in radiogroup data attribute", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext({
				state: { value: "express", meta: { errors: [], isBlurred: true } },
			}) as any,
		);
		render(<RadioGroupField options={OPTIONS} />);
		const group = screen.getByRole("radiogroup");
		expect(group).toHaveAttribute("data-value", "express");
	});

	// ============================================================================
	// DISABLED STATE
	// ============================================================================

	it("marks radiogroup as disabled when disabled prop is true", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<RadioGroupField options={OPTIONS} disabled />);
		const group = screen.getByRole("radiogroup");
		expect(group).toHaveAttribute("data-disabled", "true");
	});

	// ============================================================================
	// ERROR DISPLAY
	// ============================================================================

	it("renders error alert when field has errors", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext({
				state: {
					value: "",
					meta: { errors: [{ message: "Sélection requise" }], isBlurred: true },
				},
			}) as any,
		);
		render(<RadioGroupField options={OPTIONS} />);
		expect(screen.getByRole("alert")).toHaveTextContent("Sélection requise");
	});

	// ============================================================================
	// ARIA
	// ============================================================================

	it("uses aria-label on radiogroup when no visible label is provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<RadioGroupField options={OPTIONS} aria-label="Mode de livraison" />);
		expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-label", "Mode de livraison");
	});

	it("invokes onValueChangeCallback when an option is clicked", () => {
		const callback = vi.fn();
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<RadioGroupField options={OPTIONS} onValueChangeCallback={callback} />);
		const radios = screen.getAllByRole("radio");
		fireEvent.click(radios[1]!);
		expect(callback).toHaveBeenCalledWith(OPTIONS[1]!.value);
	});
});
