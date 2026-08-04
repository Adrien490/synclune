import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================
// Seul le contexte TanStack est mocké : Field/FieldError/Input/FieldLabel sont
// les VRAIS composants — un mock de `ui/input` rendait les tests aveugles au
// contrat réel (ordre du spread, aria, type number). `formStore` est un shim
// minimal de @tanstack/store pour le `useStore` de `useFieldErrorVisibility`.

const { mockHandleChange, mockHandleBlur, formStore } = vi.hoisted(() => {
	// Interface attendue par le `useStore` de @tanstack/react-store :
	// `get()` pour le snapshot, `subscribe()` qui retourne `{ unsubscribe }`.
	const formStore = {
		state: { submissionAttempts: 0 },
		get: () => formStore.state,
		subscribe: () => ({ unsubscribe: () => {} }),
	};
	return { mockHandleChange: vi.fn(), mockHandleBlur: vi.fn(), formStore };
});

vi.mock("@/shared/lib/form-context", () => ({
	useFieldContext: vi.fn(),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { InputField } from "../input-field";
import { useFieldContext } from "@/shared/lib/form-context";

// ============================================================================
// HELPERS
// ============================================================================

interface MakeFieldOptions {
	value?: string | number | null;
	errors?: Array<{ message: string }>;
	isBlurred?: boolean;
	submissionAttempts?: number;
	name?: string;
}

function mockField({
	value = "",
	errors = [],
	isBlurred = false,
	submissionAttempts = 0,
	name = "test-input",
}: MakeFieldOptions = {}) {
	formStore.state = { submissionAttempts };
	vi.mocked(useFieldContext).mockReturnValue({
		name,
		state: { value, meta: { errors, isBlurred } },
		form: { store: formStore },
		handleChange: mockHandleChange,
		handleBlur: mockHandleBlur,
	} as never);
}

// ============================================================================
// TESTS
// ============================================================================

describe("InputField", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	// ==========================================================================
	// LABEL & CONTRAT id === field.name
	// ==========================================================================

	it("lie le label à l'input via le contrat id === field.name", () => {
		mockField();
		render(<InputField label="Nom" />);
		const input = screen.getByLabelText("Nom");
		expect(input).toHaveAttribute("id", "test-input");
		expect(input).toHaveAttribute("name", "test-input");
	});

	it("ne rend aucun élément label quand la prop est omise", () => {
		mockField();
		const { container } = render(<InputField />);
		expect(container.querySelector("label")).toBeNull();
	});

	// ==========================================================================
	// GATE D'AFFICHAGE DES ERREURS (use-field-error-visibility)
	// ==========================================================================

	it("masque l'erreur tant que le champ n'est ni blurré ni soumis", () => {
		mockField({ errors: [{ message: "Champ requis" }] });
		render(<InputField label="Nom" />);
		expect(screen.queryByText("Champ requis")).toBeNull();
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
	});

	it("révèle l'erreur une fois le champ blurré", () => {
		mockField({ errors: [{ message: "Champ requis" }], isBlurred: true });
		render(<InputField label="Nom" />);
		expect(screen.getByText("Champ requis")).toBeInTheDocument();
		const input = screen.getByRole("textbox");
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(input).toHaveAttribute("aria-describedby", "test-input-error");
	});

	it("révèle l'erreur après une tentative de soumission, même sans blur", () => {
		mockField({ errors: [{ message: "Champ requis" }], submissionAttempts: 1 });
		render(<InputField label="Nom" />);
		expect(screen.getByText("Champ requis")).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
	});

	// ==========================================================================
	// ARIA-DESCRIBEDBY (description + erreur)
	// ==========================================================================

	it("compose aria-describedby avec la description puis l'erreur", () => {
		mockField({ errors: [{ message: "Trop court" }], isBlurred: true });
		render(<InputField label="Nom" description="Ton prénom public" />);
		expect(screen.getByRole("textbox")).toHaveAttribute(
			"aria-describedby",
			"test-input-desc test-input-error",
		);
	});

	it("ne référence que la description quand il n'y a pas d'erreur visible", () => {
		mockField({ errors: [{ message: "Trop court" }] });
		render(<InputField label="Nom" description="Ton prénom public" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-describedby", "test-input-desc");
	});

	// ==========================================================================
	// REQUIRED : aria-required SANS required natif
	// ==========================================================================

	it("pose aria-required sans jamais poser le required natif (bulles navigateur)", () => {
		mockField();
		render(<InputField label="Nom" required />);
		const input = screen.getByRole("textbox");
		expect(input).toHaveAttribute("aria-required", "true");
		expect(input).not.toHaveAttribute("required");
	});

	// ==========================================================================
	// TYPE NUMBER (SSOT number-input-value)
	// ==========================================================================

	it("convertit la saisie numérique en number", () => {
		mockField({ value: null });
		render(<InputField type="number" />);
		fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "42" } });
		expect(mockHandleChange).toHaveBeenCalledWith(42);
	});

	it("convertit le champ numérique vidé en null (distinct de zéro)", () => {
		mockField({ value: 42 });
		render(<InputField type="number" />);
		fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "" } });
		expect(mockHandleChange).toHaveBeenCalledWith(null);
	});

	it("affiche 0 comme une vraie valeur et null comme champ vide", () => {
		mockField({ value: 0 });
		render(<InputField type="number" />);
		expect(screen.getByRole("spinbutton")).toHaveValue(0);
		cleanup();
		mockField({ value: null });
		render(<InputField type="number" />);
		expect(screen.getByRole("spinbutton")).not.toHaveValue();
	});

	// ==========================================================================
	// ORDRE DU SPREAD : le binding TanStack gagne toujours
	// ==========================================================================

	it("empêche un appelant d'écraser le binding TanStack via le spread", () => {
		mockField({ value: "valeur-du-state" });
		const injectedOnChange = vi.fn();
		// `value`/`onChange` sont exclus du type (Omit) — le cast simule un
		// appelant JS qui les passerait quand même à l'endpoint du composant.
		const hijack = { value: "piraté", onChange: injectedOnChange } as unknown as Parameters<
			typeof InputField
		>[0];
		render(<InputField {...hijack} />);
		const input = screen.getByRole("textbox");
		expect(input).toHaveValue("valeur-du-state");
		fireEvent.change(input, { target: { value: "abc" } });
		expect(mockHandleChange).toHaveBeenCalledWith("abc");
		expect(injectedOnChange).not.toHaveBeenCalled();
	});

	// ==========================================================================
	// COMPTEUR maxLength
	// ==========================================================================

	it("affiche le compteur de caractères quand showCounter et maxLength sont posés", () => {
		mockField({ value: "abc" });
		render(<InputField label="Code" maxLength={10} showCounter />);
		expect(screen.getByText("3/10")).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", "10");
	});

	it("n'affiche pas de compteur sans showCounter", () => {
		mockField({ value: "abc" });
		render(<InputField label="Code" maxLength={10} />);
		expect(screen.queryByText("3/10")).toBeNull();
	});

	// ==========================================================================
	// PROPS TRANSMISES À L'INPUT NATIF
	// ==========================================================================

	it("transmet les props mobile PWA à l'input natif via le spread", () => {
		mockField();
		render(
			<InputField
				inputMode="email"
				autoComplete="email"
				enterKeyHint="next"
				placeholder="ton@email.com"
			/>,
		);
		const input = screen.getByRole("textbox");
		expect(input).toHaveAttribute("inputmode", "email");
		expect(input).toHaveAttribute("autocomplete", "email");
		expect(input).toHaveAttribute("enterkeyhint", "next");
		expect(input).toHaveAttribute("placeholder", "ton@email.com");
	});

	it("désactive l'input natif quand disabled est posé", () => {
		mockField();
		render(<InputField disabled />);
		expect(screen.getByRole("textbox")).toBeDisabled();
	});

	// ==========================================================================
	// CHANGE / BLUR HANDLERS
	// ==========================================================================

	it("propage la saisie texte à field.handleChange et le blur à field.handleBlur", () => {
		mockField();
		render(<InputField />);
		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "Alice" } });
		expect(mockHandleChange).toHaveBeenCalledWith("Alice");
		fireEvent.blur(input);
		expect(mockHandleBlur).toHaveBeenCalled();
	});
});
