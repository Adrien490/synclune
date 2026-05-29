"use client";

import { Elements } from "@stripe/react-stripe-js";
import { getStripe } from "@/shared/lib/stripe-client";
import { useStripeAppearance } from "../hooks/use-stripe-appearance";
import { ExpressCheckoutSection } from "./checkout-express-section";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";

interface CheckoutExpressTopProps {
	clientSecret: string;
	isOnline: boolean;
	getFormData: () => Promise<ConfirmCheckoutData | null>;
	allowNavigation?: () => void;
}

/**
 * Bloc paiement express affiché EN HAUT du checkout (au-dessus de Contact) pour
 * la découvrabilité Apple Pay / Google Pay / Link sans scroll (P1-a).
 *
 * Possède son propre <Elements> (deux instances partageant le même clientSecret
 * sont supportées par Stripe). Lazy-loadé via next/dynamic depuis le form-body
 * pour garder le bundle @stripe/react-stripe-js hors du critical path. Se masque
 * tout seul (heading + divider inclus) si aucun wallet n'est disponible.
 */
export function CheckoutExpressTop({
	clientSecret,
	isOnline,
	getFormData,
	allowNavigation,
}: CheckoutExpressTopProps) {
	const appearance = useStripeAppearance();

	return (
		<Elements stripe={getStripe()} options={{ clientSecret, appearance, locale: "fr" }}>
			<ExpressCheckoutSection
				getFormData={getFormData}
				allowNavigation={allowNavigation}
				isOnline={isOnline}
				heading="Paiement rapide"
				dividerLabel="Ou renseigne tes informations"
			/>
		</Elements>
	);
}
