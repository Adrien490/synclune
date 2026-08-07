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
		name: "test-phone",
		state: {
			value: "",
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

vi.mock("@/shared/components/forms/field-label", () => ({
	FieldLabel: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/shared/components/ui/input", () => ({
	inputBaseStyles: "input-base",
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock phone-input-lazy with a fake PhoneInput for tests
vi.mock("@/shared/components/forms/phone-input-lazy", () => {
	const FakePhoneInput = ({
		id,
		name,
		value,
		onChange,
		onBlur,
		disabled,
		placeholder,
		defaultCountry,
		"aria-invalid": ariaInvalid,
		"aria-describedby": ariaDescribedBy,
		"aria-required": ariaRequired,
		className,
	}: any) => (
		<div
			className={className}
			data-testid="phone-input-wrapper"
			data-default-country={defaultCountry}
		>
			<input
				id={id}
				name={name}
				type="tel"
				value={value}
				onChange={(e: any) => onChange(e.target.value)}
				onBlur={onBlur}
				disabled={disabled}
				placeholder={placeholder}
				aria-invalid={ariaInvalid}
				aria-describedby={ariaDescribedBy}
				aria-required={ariaRequired}
			/>
		</div>
	);
	FakePhoneInput.displayName = "FakePhoneInputWithFlags";
	return { default: FakePhoneInput };
});

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { PhoneField } from "../phone-field";
import { useFieldContext } from "@/shared/lib/form-context";

// ============================================================================
// HELPERS
// ============================================================================

function makeFieldContext(overrides: Record<string, unknown> = {}) {
	return {
		name: "test-phone",
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

describe("PhoneField", () => {
	afterEach(cleanup);

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders a telephone input", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PhoneField />);
		expect(screen.getByRole("textbox")).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toHaveAttribute("type", "tel");
	});

	it("renders label when label prop is provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PhoneField label="Téléphone" />);
		expect(screen.getByText("Téléphone")).toBeInTheDocument();
	});

	// ============================================================================
	// DEFAULT COUNTRY
	// ============================================================================

	it("passes defaultCountry prop to PhoneInput wrapper", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PhoneField defaultCountry="BE" />);
		expect(screen.getByTestId("phone-input-wrapper")).toHaveAttribute("data-default-country", "BE");
	});

	it("defaults to FR when defaultCountry is not provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PhoneField />);
		expect(screen.getByTestId("phone-input-wrapper")).toHaveAttribute("data-default-country", "FR");
	});

	// ============================================================================
	// PLACEHOLDER
	// ============================================================================

	it("renders placeholder on the phone input", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PhoneField placeholder="06 12 34 56 78" />);
		expect(screen.getByPlaceholderText("06 12 34 56 78")).toBeInTheDocument();
	});

	// ============================================================================
	// CHANGE HANDLER
	// ============================================================================

	it("calls handleChange when phone number value changes", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PhoneField />);
		fireEvent.change(screen.getByRole("textbox"), { target: { value: "+33612345678" } });
		expect(mockHandleChange).toHaveBeenCalledWith("+33612345678");
	});

	// ============================================================================
	// DISABLED STATE
	// ============================================================================

	it("disables the phone input when disabled prop is true", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PhoneField disabled />);
		expect(screen.getByRole("textbox")).toBeDisabled();
	});

	// ============================================================================
	// ERROR DISPLAY
	// ============================================================================

	it("renders error alert when field has errors", () => {
		vi.mocked(useFieldContext).mockReturnValue(
			makeFieldContext({
				state: {
					value: "",
					meta: { errors: [{ message: "Numéro invalide" }], isBlurred: true },
				},
			}) as any,
		);
		render(<PhoneField />);
		expect(screen.getByRole("alert")).toHaveTextContent("Numéro invalide");
	});

	// ============================================================================
	// DESCRIPTION
	// ============================================================================

	it("renders description text when description prop is provided", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PhoneField description="Format international requis" />);
		expect(screen.getByText("Format international requis")).toBeInTheDocument();
	});

	it("RELIE la description au champ par aria-describedby", () => {
		// ⚠️ « Le texte s'affiche » ne prouve rien : le texte d'aide du téléphone au
		// checkout s'affichait déjà — dans un `<p>` FRÈRE, rattaché à rien. Un
		// lecteur d'écran ne l'entendait jamais. C'est le LIEN qui est le contrat.
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PhoneField label="Téléphone" description="Format international requis" />);

		const described = screen.getByText("Format international requis");
		expect(described.id).toBeTruthy();

		const input = document.querySelector(`[aria-describedby~="${described.id}"]`);
		expect(input, "aucun champ ne référence la description").not.toBeNull();
	});
});
