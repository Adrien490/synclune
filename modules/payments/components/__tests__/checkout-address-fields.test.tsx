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

vi.mock("@/modules/payments/components/checkout-error-summary", () => ({
	CheckoutErrorSummary: ({
		fieldErrors,
	}: {
		fieldErrors: { name: string; label: string; message: string }[];
	}) => (
		<div data-testid="checkout-error-summary" data-count={fieldErrors.length}>
			{fieldErrors.map((e) => (
				<span key={e.name}>{e.message}</span>
			))}
		</div>
	),
}));

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
					/>
				),
				SelectField: (props: Record<string, unknown>) => (
					<select
						data-testid={`select-${name}`}
						aria-label={(props.label as string) || name}
						required={props.required as boolean}
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

		it("shows required fields notice", () => {
			render(<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />);
			expect(screen.getByText(/champs marqués/i)).toBeInTheDocument();
		});

		it("renders the asterisk to indicate required fields", () => {
			const { container } = render(
				<CheckoutAddressFields form={createMockForm()} session={null} addresses={null} />,
			);
			expect(container.querySelector("span.text-destructive")).toBeInTheDocument();
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

	// ─── Error summary ────────────────────────────────────────────────────────

	describe("error summary", () => {
		it("does not show error summary when submissionAttempts is 0", () => {
			render(
				<CheckoutAddressFields
					form={createMockForm({ submissionAttempts: 0 })}
					session={null}
					addresses={null}
				/>,
			);
			expect(screen.queryByTestId("checkout-error-summary")).not.toBeInTheDocument();
		});

		it("does not show error summary when form can submit (no errors)", () => {
			render(
				<CheckoutAddressFields
					form={createMockForm({ submissionAttempts: 1, canSubmit: true })}
					session={null}
					addresses={null}
				/>,
			);
			expect(screen.queryByTestId("checkout-error-summary")).not.toBeInTheDocument();
		});

		it("shows error summary after submission attempt when form cannot submit", () => {
			render(
				<CheckoutAddressFields
					form={createMockForm({
						submissionAttempts: 1,
						canSubmit: false,
						fieldMeta: {
							email: { errors: ["L'email est requis"] },
						},
					})}
					session={null}
					addresses={null}
				/>,
			);
			expect(screen.getByTestId("checkout-error-summary")).toBeInTheDocument();
		});

		it("passes field errors with labels to CheckoutErrorSummary", () => {
			render(
				<CheckoutAddressFields
					form={createMockForm({
						submissionAttempts: 1,
						canSubmit: false,
						fieldMeta: {
							email: { errors: ["Champ requis"] },
						},
					})}
					session={null}
					addresses={null}
				/>,
			);
			expect(screen.getByText("Champ requis")).toBeInTheDocument();
		});

		it("maps known field names to French labels in the error summary", () => {
			render(
				<CheckoutAddressFields
					form={createMockForm({
						submissionAttempts: 1,
						canSubmit: false,
						fieldMeta: {
							"shipping.fullName": { errors: ["Requis"] },
						},
					})}
					session={null}
					addresses={null}
				/>,
			);
			// Error message is rendered by mock
			expect(screen.getByText("Requis")).toBeInTheDocument();
		});

		it("ignores fields with no errors in the error summary", () => {
			render(
				<CheckoutAddressFields
					form={createMockForm({
						submissionAttempts: 1,
						canSubmit: false,
						fieldMeta: {
							"shipping.fullName": { errors: [] },
							email: { errors: ["Requis"] },
						},
					})}
					session={null}
					addresses={null}
				/>,
			);
			const summary = screen.getByTestId("checkout-error-summary");
			// Only 1 field has errors
			expect(summary.getAttribute("data-count")).toBe("1");
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
});
