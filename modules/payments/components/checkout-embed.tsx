"use client";

import { useCallback, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { CircleAlert, RotateCw } from "lucide-react";
import { getStripe } from "@/shared/lib/stripe-client";
import { createCheckoutSession } from "../actions/create-checkout-session";

interface CheckoutEmbedProps {
	/** Identifiant du panier — utilisé en clé React pour forcer un re-mount à la sortie. */
	cartKey: string;
}

/**
 * Iframe Stripe Checkout en mode `embedded`. La Session est créée côté serveur
 * via `createCheckoutSession`, le `clientSecret` est passé à
 * `EmbeddedCheckoutProvider` qui rend ensuite le form Stripe hébergé dans une
 * iframe sur la page Synclune.
 */
export function CheckoutEmbed({ cartKey }: CheckoutEmbedProps) {
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [retryToken, setRetryToken] = useState(0);

	const fetchClientSecret = useCallback(async () => {
		const result = await createCheckoutSession();
		if (!result.success) {
			setErrorMessage(result.error);
			throw new Error(result.error);
		}
		return result.clientSecret;
	}, []);

	function retry() {
		setErrorMessage(null);
		setRetryToken((n) => n + 1);
	}

	if (errorMessage) {
		return (
			<Alert variant="destructive" className="my-6">
				<CircleAlert className="size-4" />
				<AlertTitle>Le paiement n&apos;a pas pu démarrer</AlertTitle>
				<AlertDescription className="mt-2 space-y-3">
					<p className="text-sm">{errorMessage}</p>
					<Button size="sm" variant="outline" onClick={retry}>
						<RotateCw className="size-4" />
						<span>Réessayer</span>
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div
			id="checkout-embed"
			className="bg-card overflow-hidden rounded-xl border shadow-sm"
			style={{ viewTransitionName: "checkout-embed" }}
		>
			<EmbeddedCheckoutProvider
				key={`${cartKey}-${retryToken}`}
				stripe={getStripe()}
				options={{ fetchClientSecret }}
			>
				<EmbeddedCheckout />
			</EmbeddedCheckoutProvider>
		</div>
	);
}
