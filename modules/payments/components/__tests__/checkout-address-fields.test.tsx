import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/payments/hooks/use-address-autocomplete", () => ({
	useAddressAutocomplete: vi.fn().mockReturnValue({
		suggestions: [],
		isSearching: false,
		error: null,
		retry: vi.fn(),
	}),
}));

vi.mock("@/modules/addresses/data/search-address", () => ({
	searchAddressForCheckout: vi.fn(),
}));

vi.mock("@/modules/payments/components/address-selector", () => ({
	AddressSelector: ({
		addresses,
		selectedAddressId,
		onSelectAddress,
	}: {
		addresses: { id: string }[];
		selectedAddressId: string | null;
		onSelectAddress: (addr: unknown) => void;
	}) => (
		<div
			data-testid="address-selector"
			data-selected={selectedAddressId ?? ""}
			data-count={addresses.length}
		>
			{addresses.map((a) => (
				<button key={a.id} onClick={() => onSelectAddress(a)}>
					select-{a.id}
				</button>
			))}
		</div>
	),
}));

// NB : plus de mock de `CheckoutErrorSummary` ici — le résumé d'erreurs a été
// remonté en tête de <form> (`CheckoutFormBody`). Sa projection fieldMeta →
// entrées est couverte par `constants/__tests__/checkout-fields.test.ts`.

vi.mock("@/shared/constants/countries", () => ({
	SORTED_SHIPPING_COUNTRIES: ["FR", "BE", "DE"],
	COUNTRY_NAMES: { FR: "France", BE: "Belgique", DE: "Allemagne" },
	NUMERIC_POSTAL_CODE_COUNTRIES: new Set(["FR", "BE", "DE"]),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CheckoutAddressFields } from "../checkout-address-fields";
import type { Session } from "@/modules/auth/lib/auth";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";

// ============================================================================
// HELPERS
// ============================================================================

type FormValues = {
	email: string;
	shipping: {
		fullName: string;
		addressLine1: string;
		addressLine2: string;
		city: string;
		postalCode: string;
		country: string;
		phoneNumber: string;
	};
	_appliedDiscount: null;
	_selectedAddressId: string | null;
	_discountOpen: boolean;
	discountCode: string;
	saveInfo: boolean;
};

function createFormValues(overrides: Partial<FormValues["shipping"]> = {}): FormValues {
	return {
		email: "",
		shipping: {
			fullName: "",
			addressLine1: "",
			addressLine2: "",
			city: "",
			postalCode: "",
			country: "FR",
			phoneNumber: "",
			...overrides,
		},
		_appliedDiscount: null,
		_selectedAddressId: null,
		_discountOpen: false,
		discountCode: "",
		saveInfo: false,
	};
}

function createMockForm(
	options: {
		values?: FormValues;
		submissionAttempts?: number;
		canSubmit?: boolean;
		fieldMeta?: Record<string, { errors: string[] }>;
	} = {},
) {
	const values = options.values ?? createFormValues();
	const submissionAttempts = options.submissionAttempts ?? 0;
	const canSubmit = options.canSubmit ?? true;
	const fieldMeta = options.fieldMeta ?? {};

	const fullState = {
		values,
		canSubmit,
		submissionAttempts,
		fieldMeta,
	};

	return {
		setFieldValue: vi.fn(),
		handleSubmit: vi.fn(),
		Subscribe: ({
			children,
			selector,
		}: {
			children: (state: unknown) => React.ReactNode;
			selector?: (s: unknown) => unknown;
		}) => {
			const selected = selector ? selector(fullState) : fullState;
			return children(selected);
		},
		AppField: ({
			children,
			name,
		}: {
			name: string;
			validators?: unknown;
			children: (field: unknown) => React.ReactNode;
		}) =>
			children({
				InputField: (props: Record<string, unknown>) => (
					<input
						data-testid={`input-${name}`}
						aria-label={(props.label as string) || name}
						required={props.required as boolean}
						type={(props.type as string) || "text"}
						autoComplete={(props.autoComplete as string) || undefined}
						// Relayés pour les assertions d'ergonomie clavier mobile.
						inputMode={props.inputMode as React.HTMLAttributes<HTMLInputElement>["inputMode"]}
						enterKeyHint={
							props.enterKeyHint as React.HTMLAttributes<HTMLInputElement>["enterKeyHint"]
						}
						autoCapitalize={props.autoCapitalize as string}
						maxLength={props.maxLength as number}
					/>
				),
				SelectField: (props: Record<string, unknown>) => (
					<select
						data-testid={`select-${name}`}
						aria-label={(props.label as string) || name}
						required={props.required as boolean}
						autoComplete={props.autoComplete as string}
					>
						{(props.options as { value: string; label: string }[]).map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
				),
				PhoneField: (props: Record<string, unknown>) => (
					<input
						data-testid={`phone-${name}`}
						aria-label={(props.label as string) || name}
						type="tel"
						required={props.required as boolean}
						enterKeyHint={
							props.enterKeyHint as React.HTMLAttributes<HTMLInputElement>["enterKeyHint"]
						}
					/>
				),
				CheckboxField: (props: Record<string, unknown>) => (
					<input
						data-testid={`checkbox-${name}`}
						aria-label={(props.label as string) || name}
						type="checkbox"
					/>
				),
				AutocompleteField: (props: Record<string, unknown>) => (
					<input
						data-testid={`autocomplete-${name}`}
						aria-label={(props.label as string) || name}
						type="text"
						inputMode={props.inputMode as React.HTMLAttributes<HTMLInputElement>["inputMode"]}
						enterKeyHint={
							props.enterKeyHint as React.HTMLAttributes<HTMLInputElement>["enterKeyHint"]
						}
						autoCapitalize={props.autoCapitalize as string}
					/>
				),
				state: { value: "", meta: { errors: [], isValidating: false } },
				handleChange: vi.fn(),
				handleBlur: vi.fn(),
			}),
	} as unknown as Parameters<typeof CheckoutAddressFields>[0]["form"];
}

function createSession(email = "user@example.com"): Session {
	return {
		user: { id: "u-1", email, name: "Utilisateur Test" },
	} as unknown as Session;
}

function createAddresses(count = 2): NonNullable<GetUserAddressesReturn> {
	return Array.from({ length: count }, (_, i) => ({
		id: `addr-${i + 1}`,
		userId: "u-1",
		firstName: "Marie",
		lastName: "Dupont",
		address1: `${i + 1} Rue Test`,
		address2: null,
		postalCode: "75001",
		city: "Paris",
		country: "FR",
		phone: "+33612345678",
		isDefault: i === 0,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
	})) as unknown as NonNullable<GetUserAddressesReturn>;
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("CheckoutAddressFields", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Fieldset structure ───────────────────────────────────────────────────

	describe("fieldset structure", () => {
		it("renders a fieldset element", () => {
			const { container } = render(
				<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />,
			);
			expect(container.querySelector("fieldset")).toBeInTheDocument();
		});

		it("ne rend PAS la note « champs obligatoires »", () => {
			// Elle vit désormais en tête de <form> (checkout-form-body), donc AVANT le
			// champ email requis de la section Contact — ici elle apparaissait sous le
			// premier champ qu'elle décrit. Assertions déplacées dans
			// `checkout-form.test.tsx`, qui monte le vrai CheckoutFormBody et peut donc
			// vérifier l'ORDRE, ce que ces tests ne faisaient pas.
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.queryByText(/champs marqués/i)).not.toBeInTheDocument();
		});

		it("expose une légende accessible pour le groupe adresse", () => {
			const { container } = render(
				<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />,
			);
			const legend = container.querySelector("legend");
			expect(legend).toBeInTheDocument();
			expect(legend).toHaveTextContent("Adresse de livraison");
			expect(legend).toHaveClass("sr-only");
		});

		it("utilise flex+gap et non space-y (la legend sr-only est absolue)", () => {
			// `space-y-*` cible `& > * + *` : la <legend> en `position:absolute` aurait
			// collé 20px de marge fantôme sur le premier vrai champ.
			const { container } = render(
				<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />,
			);
			const fieldset = container.querySelector("fieldset");
			expect(fieldset).toHaveClass("flex", "flex-col", "gap-5");
			expect(fieldset?.className).not.toMatch(/space-y-/);
		});
	});

	// ─── Form fields ──────────────────────────────────────────────────────────

	describe("form fields rendering", () => {
		it("renders the full name input field", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByTestId("input-shipping.fullName")).toBeInTheDocument();
		});

		it("renders the address autocomplete field", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByTestId("autocomplete-shipping.addressLine1")).toBeInTheDocument();
		});

		it("renders the address line 2 field", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByTestId("input-shipping.addressLine2")).toBeInTheDocument();
		});

		it("renders the postal code field", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByTestId("input-shipping.postalCode")).toBeInTheDocument();
		});

		it("renders the city field", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByTestId("input-shipping.city")).toBeInTheDocument();
		});

		it("renders the country select field", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByTestId("select-shipping.country")).toBeInTheDocument();
		});

		it("renders the phone number field", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByTestId("phone-shipping.phoneNumber")).toBeInTheDocument();
		});
	});

	// ─── Country options ──────────────────────────────────────────────────────

	describe("country select options", () => {
		it("renders country options from SORTED_SHIPPING_COUNTRIES", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			const select = screen.getByTestId("select-shipping.country");
			const options = select.querySelectorAll("option");
			// FR, BE, DE from mock
			expect(options).toHaveLength(3);
		});

		it("renders France option with correct label", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			const select = screen.getByTestId("select-shipping.country");
			expect(select.innerHTML).toContain("France");
		});
	});

	// ─── Phone helper text ────────────────────────────────────────────────────

	describe("phone field helper text", () => {
		it("shows delivery notice below the phone field", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByText(/transporteur/i)).toBeInTheDocument();
		});
	});

	// ─── Address selector (logged-in, multiple addresses) ─────────────────────

	describe("address selector", () => {
		it("does not render AddressSelector for guest users", () => {
			render(
				<CheckoutAddressFields
					form={createMockForm()}
					session={null}
					addresses={createAddresses(2)}
				/>,
			);
			expect(screen.queryByTestId("address-selector")).not.toBeInTheDocument();
		});

		it("does not render AddressSelector when addresses is null", () => {
			render(
				<CheckoutAddressFields
					form={createMockForm()}
					session={createSession()}
					addresses={null}
				/>,
			);
			expect(screen.queryByTestId("address-selector")).not.toBeInTheDocument();
		});

		it("does not render AddressSelector when user has only one address", () => {
			render(
				<CheckoutAddressFields
					form={createMockForm()}
					session={createSession()}
					addresses={createAddresses(1)}
				/>,
			);
			expect(screen.queryByTestId("address-selector")).not.toBeInTheDocument();
		});

		it("renders AddressSelector for logged-in user with multiple addresses", () => {
			render(
				<CheckoutAddressFields
					form={createMockForm()}
					session={createSession()}
					addresses={createAddresses(2)}
				/>,
			);
			expect(screen.getByTestId("address-selector")).toBeInTheDocument();
		});

		it("renders AddressSelector with the correct address count", () => {
			render(
				<CheckoutAddressFields
					form={createMockForm()}
					session={createSession()}
					addresses={createAddresses(3)}
				/>,
			);
			const selector = screen.getByTestId("address-selector");
			expect(selector.getAttribute("data-count")).toBe("3");
		});
	});

	// ─── Save info checkbox ───────────────────────────────────────────────────

	describe("saveInfo checkbox", () => {
		it("renders the saveInfo checkbox for logged-in users", () => {
			render(
				<CheckoutAddressFields
					form={createMockForm()}
					session={createSession()}
					addresses={null}
				/>,
			);
			expect(screen.getByTestId("checkbox-saveInfo")).toBeInTheDocument();
		});

		it("does not render the saveInfo checkbox for guest users", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.queryByTestId("checkbox-saveInfo")).not.toBeInTheDocument();
		});
	});

	// ─── Required attributes ──────────────────────────────────────────────────

	describe("required field attributes", () => {
		it("marks full name as required", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByTestId("input-shipping.fullName")).toHaveAttribute("required");
		});

		it("marks postal code as required", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByTestId("input-shipping.postalCode")).toHaveAttribute("required");
		});

		it("marks city as required", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByTestId("input-shipping.city")).toHaveAttribute("required");
		});

		it("marks country as required", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByTestId("select-shipping.country")).toHaveAttribute("required");
		});

		it("marks phone number as required", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByTestId("phone-shipping.phoneNumber")).toHaveAttribute("required");
		});
	});
	// ─── Ergonomie clavier mobile ─────────────────────────────────────────────

	describe("ergonomie clavier mobile", () => {
		function renderGuest() {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
		}

		it("le pays déclare autoComplete='country' (code ISO), pas 'country-name'", () => {
			// Les options ont pour `value` un code ISO ("FR"). Avec `country-name`,
			// l'autofill d'adresse OS tente d'injecter « France » et échoue en silence.
			renderGuest();
			expect(screen.getByTestId("select-shipping.country")).toHaveAttribute(
				"autocomplete",
				"country",
			);
		});

		it("le code postal sert un clavier numérique et borne la saisie", () => {
			renderGuest();
			const postalCode = screen.getByTestId("input-shipping.postalCode");
			expect(postalCode).toHaveAttribute("inputmode", "numeric");
			expect(postalCode).toHaveAttribute("autocomplete", "postal-code");
			// Borne alignée sur le validateur (10) — sinon le champ accepte une
			// saisie que la validation rejettera.
			expect(postalCode).toHaveAttribute("maxlength", "10");
		});

		it("la ville met une majuscule automatique (aligné sur le formulaire adresse)", () => {
			renderGuest();
			expect(screen.getByTestId("input-shipping.city")).toHaveAttribute("autocapitalize", "words");
		});

		it("le champ adresse force le clavier texte plutôt que le défaut « recherche »", () => {
			renderGuest();
			const address = screen.getByTestId("autocomplete-shipping.addressLine1");
			expect(address).toHaveAttribute("inputmode", "text");
			expect(address).toHaveAttribute("enterkeyhint", "next");
			expect(address).toHaveAttribute("autocapitalize", "words");
		});

		it("le téléphone porte enterKeyHint='done' — invité comme connecté", () => {
			// Dernier champ texte dans les deux cas : la case « enregistrer mes
			// informations » qui suit (connecté) n'est pas une saisie clavier.
			renderGuest();
			expect(screen.getByTestId("phone-shipping.phoneNumber")).toHaveAttribute(
				"enterkeyhint",
				"done",
			);
			cleanup();

			render(
				<CheckoutAddressFields
					form={createMockForm()}
					session={createSession()}
					addresses={null}
				/>,
			);
			expect(screen.getByTestId("phone-shipping.phoneNumber")).toHaveAttribute(
				"enterkeyhint",
				"done",
			);
		});
	});
});
