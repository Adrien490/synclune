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
		name: "test-password",
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

vi.mock("@phosphor-icons/react/ssr", () => ({
	EyeIcon: () => <span data-testid="eye-icon" />,
	EyeSlashIcon: () => <span data-testid="eye-off-icon" />,
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
				state: {
					value: "",
					meta: { errors: [{ message: "Mot de passe invalide" }], isBlurred: true },
				},
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

	// ============================================================================
	// MOBILE NATIVE 2026 — TOUCH TARGET WCAG 2.5.5 (44×44)
	// ============================================================================

	it("toggle button has extended hit-area via pseudo-element (44×44 WCAG 2.5.5)", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PasswordInputField />);
		const toggleBtn = screen.getByRole("button", { name: "Afficher le mot de passe" });
		// Check the className includes the invisible hit-area extension
		expect(toggleBtn.className).toContain("after:absolute");
		expect(toggleBtn.className).toContain("after:inset-[-12px]");
		expect(toggleBtn.className).toContain("after:content-['']");
	});

	it("toggle button is a relative-positioned container for pseudo-element", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PasswordInputField />);
		const toggleBtn = screen.getByRole("button", { name: "Afficher le mot de passe" });
		expect(toggleBtn.className).toContain("relative");
	});

	it("toggle button respects prefers-reduced-motion (motion-safe transition)", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PasswordInputField />);
		const toggleBtn = screen.getByRole("button", { name: "Afficher le mot de passe" });
		expect(toggleBtn.className).toContain("motion-safe:transition-colors");
	});

	it("toggle button has aria-pressed reflecting current visibility state", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		render(<PasswordInputField />);
		const toggleBtn = screen.getByRole("button", { name: "Afficher le mot de passe" });
		expect(toggleBtn.getAttribute("aria-pressed")).toBe("false");
		fireEvent.click(toggleBtn);
		expect(
			screen.getByRole("button", { name: "Masquer le mot de passe" }).getAttribute("aria-pressed"),
		).toBe("true");
	});

	// ============================================================================
	// ERGONOMIE CLAVIER MOBILE
	// ============================================================================
	//
	// Les tests d'attributs des formulaires auth (sign-in, reset…) tournent contre
	// un MOCK manuel de `@/shared/components/forms` : ils prouvent que le
	// formulaire *passe* la prop, jamais que cette primitive la *forwarde*. Ils
	// resteraient donc verts si le passthrough `...rest` disparaissait d'ici.
	// C'est ce contrat-là que les cas ci-dessous verrouillent.

	it("forwards autoComplete to the native input (current-password / new-password)", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		const { container } = render(<PasswordInputField autoComplete="new-password" />);
		expect(container.querySelector("input")).toHaveAttribute("autocomplete", "new-password");
	});

	it("forwards enterKeyHint through the ...rest passthrough", () => {
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		const { container } = render(<PasswordInputField enterKeyHint="done" />);
		expect(container.querySelector("input")).toHaveAttribute("enterkeyhint", "done");
	});

	it("neutralise majuscule auto / autocorrection / orthographe (mot de passe dévoilé)", () => {
		// Au clic sur l'œil, `type` passe à "text" : sans ces attributs, iOS
		// réécrit un mot de passe en clair sous les doigts de l'utilisateur et
		// l'enregistre dans le dictionnaire du clavier.
		vi.mocked(useFieldContext).mockReturnValue(makeFieldContext() as any);
		const { container } = render(<PasswordInputField />);
		const input = container.querySelector("input");

		expect(input).toHaveAttribute("autocapitalize", "none");
		expect(input).toHaveAttribute("autocorrect", "off");
		expect(input).toHaveAttribute("spellcheck", "false");

		fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));

		const revealed = container.querySelector("input");
		expect(revealed).toHaveAttribute("type", "text");
		expect(revealed).toHaveAttribute("autocapitalize", "none");
		expect(revealed).toHaveAttribute("autocorrect", "off");
		expect(revealed).toHaveAttribute("spellcheck", "false");
	});
});
