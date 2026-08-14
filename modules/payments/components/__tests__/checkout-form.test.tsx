import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/modules/auth/actions/logout", () => ({
	logout: vi.fn(),
}));

vi.mock("@/shared/hooks/use-unsaved-changes", () => ({
	useUnsavedChanges: () => ({ isBlocking: false, allowNavigation: vi.fn() }),
}));

vi.mock("@/shared/hooks/use-focus-first-error", () => ({
	useFocusFirstError: () => ({
		formRef: { current: null },
		focusFirstInvalid: vi.fn(() => false),
		onInvalidCapture: vi.fn(),
	}),
}));

vi.mock("@/modules/orders/services/shipping.service", () => ({
	calculateShipping: vi.fn().mockReturnValue(490),
	getShippingInfo: vi.fn().mockReturnValue(null),
}));

vi.mock("@/modules/payments/hooks/use-checkout-form", () => ({
	useCheckoutForm: vi.fn(),
}));

vi.mock("@/modules/payments/components/checkout-summary", () => ({
	CheckoutSummary: () => <div data-testid="checkout-summary" />,
}));

vi.mock("@/modules/payments/components/payment-step", () => ({
	PaymentStep: ({ orderNumber }: { orderNumber: string | null }) => (
		<div data-testid="payment-step" data-order-number={orderNumber ?? ""} />
	),
}));

vi.mock("@/modules/payments/hooks/use-payment-intent", () => ({
	usePaymentIntent: vi.fn().mockReturnValue({
		clientSecret: null,
		paymentIntentId: null,
		isLoading: false,
		error: null,
	}),
}));

vi.mock("@stripe/react-stripe-js", () => ({
	Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	PaymentElement: () => <div data-testid="payment-element" />,
}));

vi.mock("@/shared/lib/stripe-client", () => ({
	getStripe: vi.fn(),
}));

vi.mock("@/modules/payments/components/pay-button", () => ({
	PayButton: () => <div data-testid="pay-button" />,
}));

// Bypass the Stripe-section chain (which transitively imports auth/Stripe init).
vi.mock("@/modules/payments/components/checkout-stripe-section", () => ({
	CheckoutStripeSection: () => <div data-testid="checkout-stripe-section" />,
}));

vi.mock("@/modules/payments/components/shipping-method-section", () => ({
	ShippingMethodSection: () => <div data-testid="shipping-method" />,
}));

vi.mock("@/modules/payments/components/checkout-section", () => ({
	CheckoutSection: ({ children, title }: { children: React.ReactNode; title: string }) => (
		<div data-testid={`section-${title}`}>
			<h2>{title}</h2>
			{children}
		</div>
	),
}));

// ─── Import under test ────────────────────────────────────────────────────────

import { CheckoutForm } from "../checkout-form";
import { useCheckoutForm } from "@/modules/payments/hooks/use-checkout-form";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function createMockForm(overrides: Record<string, unknown> = {}) {
	return {
		state: {
			values: {
				email: "",
				shipping: {
					fullName: "",
					addressLine1: "",
					addressLine2: "",
					city: "",
					postalCode: "",
					country: "FR",
					phoneNumber: "",
				},
			},
		},
		setFieldValue: vi.fn(),
		handleSubmit: vi.fn(),
		Subscribe: ({
			children,
			selector,
		}: {
			children: (state: unknown) => React.ReactNode;
			selector: (s: unknown) => unknown;
		}) =>
			children(
				selector({
					values: {
						email: "",
						shipping: {
							fullName: "",
							addressLine1: "",
							addressLine2: "",
							city: "",
							postalCode: "",
							country: "FR",
							phoneNumber: "",
						},
					},
					canSubmit: true,
					submissionAttempts: 0,
					fieldMeta: {},
				}),
			),
		AppField: ({ children }: { children: (field: unknown) => React.ReactNode }) =>
			children({
				InputField: () => null,
				CheckboxField: () => null,
				SelectField: () => null,
				PhoneField: () => null,
				AutocompleteField: () => null,
				state: { value: "", meta: { errors: [], isValidating: false } },
				handleBlur: vi.fn(),
			}),
		...overrides,
	};
}

function createMockCart() {
	return {
		id: "cart-1",
		items: [
			{
				id: "item-1",
				sku: { id: "sku-1" },
				quantity: 1,
				priceAtAdd: 4500,
			},
		],
	};
}

afterEach(cleanup);

beforeEach(() => {
	vi.mocked(useCheckoutForm).mockReturnValue({
		form: createMockForm() as unknown as ReturnType<typeof useCheckoutForm>["form"],
	});
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CheckoutForm", () => {
	describe("step display", () => {
		it("shows address step by default", () => {
			render(<CheckoutForm cart={createMockCart() as never} />);

			expect(screen.getByText("Livraison")).toBeInTheDocument();
			expect(screen.queryByTestId("payment-step")).toBeNull();
		});

		it("shows checkout summary alongside the form", () => {
			render(<CheckoutForm cart={createMockCart() as never} />);

			expect(screen.getByTestId("checkout-summary")).toBeInTheDocument();
		});

		it("does not duplicate h1 — page parent owns the page heading", () => {
			render(<CheckoutForm cart={createMockCart() as never} />);

			// The form labels itself with aria-label="Formulaire de paiement"; the page
			// (`app/paiement/page.tsx`) owns the single <h1>. CheckoutForm must not render its own.
			const inFormHeadings = screen
				.queryAllByRole("heading", { level: 1 })
				.filter((h) => h.textContent === "Paiement sécurisé");
			expect(inFormHeadings).toHaveLength(0);
		});
	});

	describe("note « champs obligatoires »", () => {
		// Déplacée depuis `checkout-address-fields.test.tsx` : elle vivait dans le
		// fieldset Livraison, donc SOUS le champ email requis de la section Contact.
		// Ici on monte le vrai CheckoutFormBody, ce qui permet d'asserter l'ORDRE —
		// l'invariant réel, que les anciens tests ne vérifiaient pas.
		// Audit UI/UX paiement 2026-07-26, F9.

		it("est rendue une seule fois dans le formulaire", () => {
			render(<CheckoutForm cart={createMockCart() as never} />);

			expect(screen.getAllByText(/champs marqués/i)).toHaveLength(1);
		});

		it("précède la section Contact dans l'ordre du document", () => {
			render(<CheckoutForm cart={createMockCart() as never} />);

			const note = screen.getByText(/champs marqués/i);
			const contact = screen.getByText("Contact");

			// DOCUMENT_POSITION_FOLLOWING (4) : `contact` suit `note`.
			expect(note.compareDocumentPosition(contact) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING,
			);
		});
	});

	describe("offline detection", () => {
		it("does not show offline banner when online", () => {
			vi.stubGlobal("navigator", { onLine: true });

			render(<CheckoutForm cart={createMockCart() as never} />);

			expect(screen.queryByText("Connexion internet perdue")).toBeNull();

			vi.unstubAllGlobals();
		});

		it("shows offline banner when navigator.onLine is false", () => {
			vi.stubGlobal("navigator", { onLine: false });

			render(<CheckoutForm cart={createMockCart() as never} />);

			expect(screen.getByText("Connexion internet perdue")).toBeInTheDocument();

			vi.unstubAllGlobals();
		});
	});

	describe("useCheckoutForm integration", () => {
		it("calls useCheckoutForm (parcours 100 % invité — aucune session)", () => {
			render(<CheckoutForm cart={createMockCart() as never} />);

			expect(useCheckoutForm).toHaveBeenCalledWith();
		});
	});
});
