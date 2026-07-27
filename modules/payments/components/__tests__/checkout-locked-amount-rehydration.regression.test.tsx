import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * @regression checkout-locked-amount-rehydration-2026-07-26
 *
 * IMPASSE FERMÉE après un refus de carte. Chaîne vérifiée avant correctif :
 *
 *  1. l'Alert « Montant verrouillé » invitait à « Actualise la page si tu veux
 *     modifier ta livraison ou ton code promo » ;
 *  2. au rechargement, `initializePayment` rejoue sa clé d'idempotence — un PI refusé
 *     est en `requires_payment_method`, donc la garde d'état terminal ne s'applique
 *     pas — et la réponse rejouée est celle de la CRÉATION, sans `metadata.orderId` ;
 *  3. le client repartait donc `lockedAmount: null` : l'Alert disparaissait, le
 *     `<fieldset disabled>` se dégelait, l'UI invitait à des modifications qui ne
 *     pouvaient plus prendre effet ;
 *  4. `syncStripeAmount` partait au montage → `updatePaymentAmount` → garde
 *     `metadata.orderId` → « Commande déjà initiée — actualisez la page. » en Alert
 *     destructive, avec un bouton « Réessayer » qui rejouait la même séquence ;
 *  5. et corriger pays/code postal se faisait refuser par `resolveIdempotentHit`.
 *
 * Bref : la seule action proposée était celle qui cassait, et l'erreur qui en
 * résultait proposait la même action.
 *
 * Correctif : `initializePayment` renvoie `boundAmount` (commande PENDING liée au PI,
 * lu dans NOTRE base via l'index unique `stripePaymentIntentId`), que `CheckoutForm`
 * reprend comme `lockedAmount` dès son arrivée. La page se remonte donc DANS l'état
 * verrouillé, et `updateAmount` est court-circuité par la garde `isAmountLocked`
 * existante.
 *
 * Audit UI/UX paiement 2026-07-26, F2.
 */

const mockAllowNavigation = vi.fn();
const mockUpdateAmount = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/modules/auth/actions/logout", () => ({ logout: vi.fn() }));

vi.mock("@/shared/hooks/use-unsaved-changes", () => ({
	useUnsavedChanges: () => ({ isBlocking: false, allowNavigation: mockAllowNavigation }),
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

vi.mock("@/modules/payments/components/address-selector", () => ({
	AddressSelector: () => <div data-testid="address-selector" />,
}));

vi.mock("@/modules/discounts/actions/validate-discount-code", () => ({
	validateDiscountCode: vi.fn(),
}));

vi.mock("@/modules/payments/hooks/use-payment-intent", () => ({
	usePaymentIntent: vi.fn(),
}));

vi.mock("@stripe/react-stripe-js", () => ({
	Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	PaymentElement: () => <div data-testid="payment-element" />,
}));

vi.mock("@/shared/lib/stripe-client", () => ({ getStripe: vi.fn() }));

vi.mock("@/modules/payments/components/pay-button", () => ({
	PayButton: () => <div data-testid="pay-button" />,
}));

vi.mock("@/modules/payments/components/checkout-stripe-section", () => ({
	CheckoutStripeSection: () => <div data-testid="checkout-stripe-section" />,
}));

vi.mock("@/modules/addresses/data/search-address", () => ({
	searchAddressForCheckout: vi.fn(),
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

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CheckoutForm } from "../checkout-form";
import { useCheckoutForm } from "@/modules/payments/hooks/use-checkout-form";
import { usePaymentIntent } from "@/modules/payments/hooks/use-payment-intent";

function createMockForm() {
	const values = {
		email: "",
		shipping: {
			fullName: "",
			addressLine1: "",
			addressLine2: "",
			city: "",
			postalCode: "75001",
			country: "FR",
			phoneNumber: "",
		},
		_appliedDiscount: null,
		_selectedAddressId: null,
		_discountOpen: false,
		discountCode: "",
	};

	return {
		state: { values, isDirty: false },
		setFieldValue: vi.fn(),
		handleSubmit: vi.fn(),
		validateAllFields: vi.fn(),
		Subscribe: ({
			children,
			selector,
		}: {
			children: (state: unknown) => React.ReactNode;
			selector: (s: unknown) => unknown;
		}) => children(selector({ values, canSubmit: true, submissionAttempts: 0, fieldMeta: {} })),
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
	};
}

const cart = {
	id: "cart-1",
	appliedDiscountCode: null,
	items: [{ id: "item-1", sku: { id: "sku-1" }, quantity: 1, priceAtAdd: 4500 }],
};

/** État de `usePaymentIntent` tel que renvoyé après un rechargement post-refus. */
function piState(boundAmount: number | null) {
	return {
		clientSecret: "pi_test_secret",
		paymentIntentId: "pi_test_123",
		subtotal: 4500,
		shipping: 490,
		total: 4990,
		isLoading: false,
		error: null,
		boundAmount,
		updateAmount: mockUpdateAmount,
		retry: vi.fn(),
	};
}

afterEach(cleanup);

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(useCheckoutForm).mockReturnValue({
		form: createMockForm() as unknown as ReturnType<typeof useCheckoutForm>["form"],
	});
});

describe("Checkout — réhydratation du montant verrouillé", () => {
	describe("une commande PENDING est déjà liée au PaymentIntent", () => {
		beforeEach(() => {
			vi.mocked(usePaymentIntent).mockReturnValue(
				piState(12900) as unknown as ReturnType<typeof usePaymentIntent>,
			);
		});

		it("remonte la page dans l'état verrouillé", () => {
			render(<CheckoutForm cart={cart as never} session={null} addresses={null} />);

			expect(screen.getByText("Montant verrouillé")).toBeInTheDocument();
		});

		it("gèle le fieldset des informations de commande", () => {
			const { container } = render(
				<CheckoutForm cart={cart as never} session={null} addresses={null} />,
			);

			const fieldset = container.querySelector("fieldset");
			expect(fieldset).toBeDisabled();
		});

		it("n'appelle JAMAIS updateAmount (sinon « Commande déjà initiée » en boucle)", () => {
			render(<CheckoutForm cart={cart as never} session={null} addresses={null} />);

			expect(mockUpdateAmount).not.toHaveBeenCalled();
		});

		it("ne promet plus de pouvoir modifier la livraison", () => {
			// `resolveIdempotentHit` refuse toute divergence de pays / code postal :
			// l'ancienne copie « Actualise la page si tu veux modifier ta livraison »
			// décrivait une action impossible.
			render(<CheckoutForm cart={cart as never} session={null} addresses={null} />);

			expect(screen.queryByText(/modifier ta livraison/i)).not.toBeInTheDocument();
			expect(screen.getByText(/ne peuvent plus changer/i)).toBeInTheDocument();
		});

		it("offre un vrai bouton de rechargement, qui libère le garde beforeunload d'abord", async () => {
			const reload = vi.fn();
			Object.defineProperty(window, "location", {
				configurable: true,
				value: { ...window.location, reload },
			});

			render(<CheckoutForm cart={cart as never} session={null} addresses={null} />);
			await userEvent.click(screen.getByRole("button", { name: "Recharger la page" }));

			expect(mockAllowNavigation).toHaveBeenCalled();
			expect(reload).toHaveBeenCalled();
			// Ordre : sans `allowNavigation()` d'abord, `useUnsavedChanges` demande à
			// l'utilisateur de confirmer une perte de données pour l'action qu'il vient
			// justement de demander.
			const allowOrder = mockAllowNavigation.mock.invocationCallOrder[0];
			const reloadOrder = reload.mock.invocationCallOrder[0];
			expect(allowOrder).toBeDefined();
			expect(reloadOrder).toBeDefined();
			expect(allowOrder!).toBeLessThan(reloadOrder!);
		});
	});

	describe("aucune commande liée (premier passage)", () => {
		beforeEach(() => {
			vi.mocked(usePaymentIntent).mockReturnValue(
				piState(null) as unknown as ReturnType<typeof usePaymentIntent>,
			);
		});

		it("ne verrouille rien", () => {
			render(<CheckoutForm cart={cart as never} session={null} addresses={null} />);

			expect(screen.queryByText("Montant verrouillé")).not.toBeInTheDocument();
		});

		it("laisse le fieldset actif", () => {
			const { container } = render(
				<CheckoutForm cart={cart as never} session={null} addresses={null} />,
			);

			expect(container.querySelector("fieldset")).not.toBeDisabled();
		});
	});
});
