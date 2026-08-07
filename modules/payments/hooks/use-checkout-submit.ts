"use client";

import { useStripe, useElements } from "@stripe/react-stripe-js";
import type { StripeError } from "@stripe/stripe-js";
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
	/**
	 * Appelé dès qu'une commande est liée au PaymentIntent (CHECKOUT-CONSENT-001).
	 * À partir de là le montant est FIGÉ côté serveur : `updatePaymentAmount`
	 * refuse toute mise à jour et `confirmCheckout` rejette une resoumission
	 * divergente. Le caller s'en sert pour verrouiller l'affichage sur
	 * `finalAmount` et geler les sections qui modifieraient le total.
	 */
	onOrderBound?: (finalAmount: number) => void;
}

/**
 * Checkout submission sequence for the PayButton (standard card flow).
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
	onOrderBound,
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

		// ⚠️ `elements.submit()` est appelé ici alors que `<Elements>` est monté AVEC un
		// `clientSecret` (flux intent-first). `js/elements_object` — la seule page du
		// mirror qui documente `submit()`, il n'en a pas de dédiée — le décrit « when
		// creating the Elements object WITHOUT an Intent ». Ce n'est pas un écart : ce
		// flux-ci n'y est simplement pas décrit.
		//
		// L'appel est STRUCTUREL, pas décoratif : `confirmCheckout` crée une commande en
		// base et la lie au PaymentIntent. Valider la saisie carte APRÈS coup laisserait
		// une commande PENDING orpheline à chaque champ mal rempli — le cas le plus
		// fréquent du tunnel. On valide donc d'abord, on écrit ensuite.
		//
		// La doc impose en revanche d'ATTENDRE sa promesse avant toute autre opération :
		// c'est ce que fait le `await` ci-dessous, et c'est non négociable.
		// Ne pas « simplifier » en supprimant cet appel.
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

		// La commande est liée au PI : le montant ne bougera plus.
		onOrderBound?.(result.finalAmount);

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

/**
 * Maps a CLIENT-side Stripe error (from `stripe.confirmPayment`, SDK
 * `@stripe/stripe-js`) to a user-facing message.
 *
 * ⚠️ Ne PAS réutiliser `classifyStripeError` ici : ce classifieur repose sur
 * `instanceof Stripe.errors.*` (classes du SDK SERVEUR `stripe`). Le
 * `confirmError` renvoyé par `stripe.confirmPayment` est un objet plat du SDK
 * client (une `interface`, jamais une instance de ces classes) → il ressortirait
 * toujours `kind: "unknown"` et MASQUERAIT le motif de refus de carte. En
 * card-only, le refus de carte est le chemin d'erreur le plus fréquent : on doit
 * afficher le message localisé fourni par Stripe (conçu pour l'utilisateur final).
 *
 * On discrimine donc sur `error.type` :
 *  - `card_error`       : refus carte (insufficient_funds, incorrect_cvc, card_declined…)
 *  - `validation_error` : champ de paiement invalide côté Stripe
 * Pour ces deux types, `error.message` est sûr à afficher. Tout autre type
 * (api_error, invalid_request_error…) reste un message générique.
 *
 * ⚠️ EXCEPTION DE VOIX ASSUMÉE — le reste du tunnel tutoie (convention repo), mais
 * `error.message` est la copie de Stripe en `locale: "fr"`, donc vouvoyante
 * (« Votre carte a été refusée. »). Elle n'est pas réécrivable : c'est elle qui
 * porte le MOTIF du refus (fonds insuffisants, CVC, plafond…), et le paraphraser
 * le perdrait. Seuls NOS propres fallbacks ci-dessous tutoient.
 * Verrouillé par `checkout-voice-tutoiement.regression.test.ts` (allowlist).
 */
function mapStripeErrorMessage(error: StripeError | undefined): string {
	// `redirect: "always"` (défaut) fait qu'un succès redirige : on ne repasse ici
	// qu'avec une erreur. Garde défensive quand même — un `undefined` inattendu ne
	// doit pas lever un TypeError qui masquerait l'état réel du paiement.
	if (!error) return "Une erreur est survenue lors du paiement.";
	if (error.type === "card_error" || error.type === "validation_error") {
		return error.message ?? "Ton paiement a été refusé.";
	}
	return "Une erreur est survenue lors du paiement.";
}
