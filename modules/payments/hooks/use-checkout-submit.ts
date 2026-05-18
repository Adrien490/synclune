"use client";

import { useStripe, useElements } from "@stripe/react-stripe-js";
import type { StripeError } from "@stripe/stripe-js";
import { classifyStripeError } from "@/shared/lib/stripe-errors";
import { confirmCheckout } from "../actions/confirm-checkout";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";

interface SubmitOptions {
	returnUrlSuffix: string;
	paymentMethodData?: {
		billing_details?: {
			name?: string;
			email?: string;
		};
	};
}

export type CheckoutSubmitResult =
	| { status: "form-invalid" }
	| { status: "submit-error"; message: string }
	| { status: "checkout-error"; message: string }
	| { status: "stripe-error"; message: string }
	| { status: "redirecting" };

interface UseCheckoutSubmitParams {
	getFormData: () => Promise<ConfirmCheckoutData | null>;
	allowNavigation?: () => void;
	onPhase?: (phase: "validating" | "creating-order" | "awaiting-3ds") => void;
}

/**
 * Shared checkout submission sequence for both PayButton (standard card flow)
 * and ExpressCheckoutSection (Apple Pay / Google Pay / Link).
 *
 * Steps:
 *  1. Resolve form data (returns null if form invalid → caller surfaces validation errors).
 *  2. elements.submit() — Stripe payment details validation.
 *  3. confirmCheckout — server action that creates the Order and binds it to the PI.
 *  4. stripe.confirmPayment — triggers 3DS / capture. On success the page redirects;
 *     on error we map the Stripe error to a user-friendly message via classifyStripeError.
 *
 * `onPhase` lets the caller drive its own phase UI (loader text, haptic, aria-busy).
 */
export function useCheckoutSubmit({
	getFormData,
	allowNavigation,
	onPhase,
}: UseCheckoutSubmitParams) {
	const stripe = useStripe();
	const elements = useElements();

	return async function submit(options: SubmitOptions): Promise<CheckoutSubmitResult> {
		if (!stripe || !elements) {
			return { status: "stripe-error", message: "Service de paiement indisponible." };
		}

		onPhase?.("validating");

		const formData = await getFormData();
		if (!formData) {
			return { status: "form-invalid" };
		}

		const { error: submitError } = await elements.submit();
		if (submitError) {
			return {
				status: "submit-error",
				message: submitError.message ?? "Erreur de validation du paiement.",
			};
		}

		onPhase?.("creating-order");

		const result = await confirmCheckout(formData);
		if (!result.success) {
			return { status: "checkout-error", message: result.error };
		}

		onPhase?.("awaiting-3ds");
		allowNavigation?.();

		const { error: confirmError } = await stripe.confirmPayment({
			elements,
			confirmParams: {
				return_url: `${window.location.origin}/paiement/retour?order_id=${result.orderId}${options.returnUrlSuffix}`,
				...(options.paymentMethodData && { payment_method_data: options.paymentMethodData }),
			},
		});

		// confirmPayment only returns when there's an error (success → redirect to return_url).
		return { status: "stripe-error", message: mapStripeErrorMessage(confirmError) };
	};
}

function mapStripeErrorMessage(error: StripeError): string {
	const { kind } = classifyStripeError(error);
	return kind === "user"
		? (error.message ?? "Erreur de paiement.")
		: "Une erreur est survenue lors du paiement.";
}
