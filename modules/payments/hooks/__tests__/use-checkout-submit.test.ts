import { renderHook } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import type { StripeError } from "@stripe/stripe-js";
import { useCheckoutSubmit } from "../use-checkout-submit";
import type { ConfirmCheckoutData } from "../../schemas/checkout.schema";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockUseStripe, mockUseElements, mockConfirmCheckout } = vi.hoisted(() => ({
	mockUseStripe: vi.fn(),
	mockUseElements: vi.fn(),
	mockConfirmCheckout: vi.fn(),
}));

vi.mock("@stripe/react-stripe-js", () => ({
	useStripe: mockUseStripe,
	useElements: mockUseElements,
}));

vi.mock("../../actions/confirm-checkout", () => ({
	confirmCheckout: mockConfirmCheckout,
}));

// ============================================================================
// Fixtures
// ============================================================================

const FORM_DATA = { paymentIntentId: "pi_123" } as unknown as ConfirmCheckoutData;

function makeStripe(confirmPaymentResult: { error?: StripeError }) {
	return {
		confirmPayment: vi.fn().mockResolvedValue(confirmPaymentResult),
	};
}

const ELEMENTS = { submit: vi.fn().mockResolvedValue({ error: undefined }) };

function setup(stripe: unknown) {
	mockUseStripe.mockReturnValue(stripe);
	mockUseElements.mockReturnValue(ELEMENTS);
	mockConfirmCheckout.mockResolvedValue({
		success: true,
		orderId: "ord_1",
		orderNumber: "SYN-1",
		finalAmount: 1000,
	});
	const { result } = renderHook(() => useCheckoutSubmit({ getFormData: async () => FORM_DATA }));
	return result.current;
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("useCheckoutSubmit — mapping des erreurs Stripe client (3DS-01)", () => {
	it("ressort le message Stripe localisé sur un refus de carte (card_error)", async () => {
		// Régression 3DS-01 : le confirmError de stripe.confirmPayment est un objet
		// plat du SDK client — il ne doit PAS passer par classifyStripeError (instanceof
		// SDK serveur) qui le classerait "unknown" et masquerait le motif de refus.
		const cardError = {
			type: "card_error",
			code: "card_declined",
			message: "Votre carte a été refusée.",
		} as StripeError;
		const submit = setup(makeStripe({ error: cardError }));

		const res = await submit({ returnUrlSuffix: "" });

		expect(res).toEqual({
			status: "stripe-error",
			message: "Votre carte a été refusée.",
		});
	});

	it("ressort le message Stripe sur une validation_error", async () => {
		const validationError = {
			type: "validation_error",
			message: "Votre numéro de carte est incomplet.",
		} as StripeError;
		const submit = setup(makeStripe({ error: validationError }));

		const res = await submit({ returnUrlSuffix: "" });

		expect(res).toEqual({
			status: "stripe-error",
			message: "Votre numéro de carte est incomplet.",
		});
	});

	it("retombe sur le message générique pour un type non user-facing (api_error)", async () => {
		const apiError = {
			type: "api_error",
			message: "An internal error occurred (do not leak).",
		} as StripeError;
		const submit = setup(makeStripe({ error: apiError }));

		const res = await submit({ returnUrlSuffix: "" });

		expect(res).toEqual({
			status: "stripe-error",
			message: "Une erreur est survenue lors du paiement.",
		});
	});

	it("renvoie stripe-error si Stripe.js n'est pas chargé", async () => {
		const submit = setup(null);
		const res = await submit({ returnUrlSuffix: "" });
		expect(res.status).toBe("stripe-error");
	});

	it("propage une erreur de validation des Elements sans la masquer", async () => {
		const stripe = makeStripe({ error: undefined });
		mockUseStripe.mockReturnValue(stripe);
		mockUseElements.mockReturnValue({
			submit: vi.fn().mockResolvedValue({
				error: { type: "validation_error", message: "Champ manquant." },
			}),
		});
		const { result } = renderHook(() => useCheckoutSubmit({ getFormData: async () => FORM_DATA }));

		const res = await result.current({ returnUrlSuffix: "" });

		expect(res).toEqual({ status: "submit-error", message: "Champ manquant." });
		expect(stripe.confirmPayment).not.toHaveBeenCalled();
	});
});

// ============================================================================
// CHECKOUT-CONSENT-001 — verrouillage du montant dès la liaison de commande
// ============================================================================

describe("useCheckoutSubmit — onOrderBound (CHECKOUT-CONSENT-001)", () => {
	function setupWithCallback(confirmResult: unknown) {
		const stripe = makeStripe({ error: undefined });
		mockUseStripe.mockReturnValue(stripe);
		mockUseElements.mockReturnValue(ELEMENTS);
		mockConfirmCheckout.mockResolvedValue(confirmResult);
		const onOrderBound = vi.fn();
		const { result } = renderHook(() =>
			useCheckoutSubmit({ getFormData: async () => FORM_DATA, onOrderBound }),
		);
		return { submit: result.current, onOrderBound, stripe };
	}

	it("remonte finalAmount dès que la commande est liée au PaymentIntent", async () => {
		const { submit, onOrderBound } = setupWithCallback({
			success: true,
			orderId: "ord_1",
			orderNumber: "SYN-1",
			finalAmount: 3499,
		});

		await submit({ returnUrlSuffix: "" });

		expect(onOrderBound).toHaveBeenCalledWith(3499);
	});

	it("verrouille AVANT la confirmation Stripe (le 3DS peut échouer, la commande reste liée)", async () => {
		const { submit, onOrderBound, stripe } = setupWithCallback({
			success: true,
			orderId: "ord_1",
			orderNumber: "SYN-1",
			finalAmount: 3499,
		});

		await submit({ returnUrlSuffix: "" });

		expect(onOrderBound.mock.invocationCallOrder[0]).toBeLessThan(
			stripe.confirmPayment.mock.invocationCallOrder[0]!,
		);
	});

	it("ne verrouille rien quand confirmCheckout échoue", async () => {
		const { submit, onOrderBound } = setupWithCallback({
			success: false,
			error: "Stock insuffisant",
		});

		const res = await submit({ returnUrlSuffix: "" });

		expect(res).toEqual({ status: "checkout-error", message: "Stock insuffisant" });
		expect(onOrderBound).not.toHaveBeenCalled();
	});
});
