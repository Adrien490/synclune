import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AMOUNT_LOCK_ALERT_ID } from "../../constants/checkout-fields";

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
		cancelPendingUpdate: vi.fn(),
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
			render(<CheckoutForm cart={cart as never} />);

			expect(screen.getByText("Montant verrouillé")).toBeInTheDocument();
		});

		it("expose l'alerte du verrou avec l'id que les champs gelés référencent", () => {
			const { container } = render(<CheckoutForm cart={cart as never} />);

			// ⚠️ Ce test exigeait naguère `<fieldset disabled>` autour de « Frais de
			// livraison ». Ce fieldset ne gelait RIEN : la section est en lecture seule,
			// et le `disabled` d'un fieldset n'agit que sur les contrôles qu'il contient.
			// Retiré à l'audit a11y du 2026-08-07, avec sa `<legend>` sr-only qui
			// annonçait un groupe de saisie inexistant.
			//
			// Ce qui compte désormais : l'alerte porte l'`id` auquel les deux champs
			// tarifaires se rattachent.
			expect(screen.getByText("Montant verrouillé")).toBeInTheDocument();
			expect(container.querySelector(`#${AMOUNT_LOCK_ALERT_ID}`)).not.toBeNull();
		});

		it("ne gèle AUCUNE section entière (KI-001)", () => {
			// Le serveur répercute une correction de rue / ville / nom sur la commande encore
			// PENDING. L'enfermer sous un gel rendait ce recours inatteignable — c'est le
			// scénario du défaut : faute de frappe dans la rue, carte refusée, plus aucun
			// moyen de corriger.
			//
			// Cette suite ne rend aucun `<input>` (le mock de `AppField` renvoie `null`) : le
			// gel champ par champ — `readOnly` sur le code postal, `disabled` sur le pays, et
			// eux seuls — est verrouillé par
			// `locked-amount-address-editable.regression.test.ts`.
			const { container } = render(<CheckoutForm cart={cart as never} />);

			expect(screen.getByTestId("section-Livraison").closest("fieldset[disabled]")).toBeNull();
			expect(container.querySelectorAll("fieldset[disabled]")).toHaveLength(0);
		});

		it("n'appelle JAMAIS updateAmount (sinon « Commande déjà initiée » en boucle)", () => {
			render(<CheckoutForm cart={cart as never} />);

			expect(mockUpdateAmount).not.toHaveBeenCalled();
		});

		it("ne promet plus de pouvoir modifier la livraison", () => {
			// `resolveIdempotentHit` refuse toute divergence de pays / code postal :
			// l'ancienne copie « Actualise la page si tu veux modifier ta livraison »
			// décrivait une action impossible.
			render(<CheckoutForm cart={cart as never} />);

			expect(screen.queryByText(/modifier ta livraison/i)).not.toBeInTheDocument();
			// Et ne prétend plus l'adresse figée : elle l'était par un gel trop large,
			// désormais restreint aux 2 champs tarifaires (KI-001).
			expect(screen.queryByText(/l'adresse de livraison ne peuvent plus changer/i)).toBeNull();
			expect(screen.getByText(/le montant ne changera plus/i)).toBeInTheDocument();
			expect(screen.getByText(/corriger ta rue/i)).toBeInTheDocument();
		});

		it("offre un vrai bouton de rechargement, qui libère le garde beforeunload d'abord", async () => {
			const reload = vi.fn();
			Object.defineProperty(window, "location", {
				configurable: true,
				value: { ...window.location, reload },
			});

			render(<CheckoutForm cart={cart as never} />);
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
			render(<CheckoutForm cart={cart as never} />);

			expect(screen.queryByText("Montant verrouillé")).not.toBeInTheDocument();
		});

		it("n'expose ni alerte de verrou ni fieldset désactivé", () => {
			const { container } = render(<CheckoutForm cart={cart as never} />);

			expect(container.querySelector(`#${AMOUNT_LOCK_ALERT_ID}`)).toBeNull();
			expect(container.querySelectorAll("fieldset[disabled]")).toHaveLength(0);
		});
	});
});
