"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import * as Sentry from "@sentry/nextjs";

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { CircleAlert, RotateCw } from "lucide-react";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { getStripe } from "@/shared/lib/stripe-client";
import { createCheckoutSession } from "../actions/create-checkout-session";

interface CheckoutEmbedProps {
	/** Identifiant du panier — utilisé en clé React pour forcer un re-mount à la sortie. */
	cartKey: string;
}

/** Délai avant de considérer que `js.stripe.com` est bloqué (ad-blocker, CSP corp). */
const STRIPE_BLOCKED_TIMEOUT_MS = 8000;

/**
 * Iframe Stripe Checkout en mode `embedded`. La Session est créée côté serveur
 * via `createCheckoutSession`, le `clientSecret` est passé à
 * `EmbeddedCheckoutProvider` qui rend ensuite le form Stripe hébergé dans une
 * iframe sur la page Synclune.
 */
export function CheckoutEmbed({ cartKey }: CheckoutEmbedProps) {
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [stripeBlocked, setStripeBlocked] = useState(false);
	const [retryToken, setRetryToken] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const retryButtonRef = useRef<HTMLButtonElement>(null);

	const fetchClientSecret = useCallback(async () => {
		Sentry.addBreadcrumb({
			category: "checkout",
			message: "session-requested",
			level: "info",
		});
		const result = await createCheckoutSession();
		if (!result.success) {
			setErrorMessage(result.error);
			throw new Error(result.error);
		}
		return result.clientSecret;
	}, []);

	function retry() {
		triggerHaptic("medium");
		Sentry.addBreadcrumb({
			category: "checkout",
			message: "retry-clicked",
			level: "info",
		});
		setErrorMessage(null);
		setStripeBlocked(false);
		setRetryToken((n) => n + 1);
	}

	// Auto-focus retry button when an error appears (SR + keyboard a11y).
	useEffect(() => {
		if (errorMessage || stripeBlocked) {
			retryButtonRef.current?.focus();
		}
	}, [errorMessage, stripeBlocked]);

	// Detect iframe mount + fallback if Stripe.js is blocked (ad-blocker, CSP).
	useEffect(() => {
		if (errorMessage || stripeBlocked) return;
		const container = containerRef.current;
		if (!container) return;

		let resolved = false;
		const timer = setTimeout(() => {
			if (resolved) return;
			if (!container.querySelector("iframe")) {
				resolved = true;
				Sentry.addBreadcrumb({
					category: "checkout",
					message: "iframe-blocked",
					level: "warning",
				});
				setStripeBlocked(true);
			}
		}, STRIPE_BLOCKED_TIMEOUT_MS);

		const observer = new MutationObserver(() => {
			if (resolved) return;
			if (container.querySelector("iframe")) {
				resolved = true;
				Sentry.addBreadcrumb({
					category: "checkout",
					message: "iframe-mounted",
					level: "info",
				});
				clearTimeout(timer);
				observer.disconnect();
			}
		});
		observer.observe(container, { childList: true, subtree: true });

		return () => {
			clearTimeout(timer);
			observer.disconnect();
		};
	}, [errorMessage, stripeBlocked, retryToken]);

	if (errorMessage) {
		return (
			<Alert variant="destructive" className="my-6">
				<CircleAlert className="size-4" />
				<AlertTitle>Le paiement n&apos;a pas pu démarrer</AlertTitle>
				<AlertDescription className="mt-2 space-y-3">
					<p className="text-sm">{errorMessage}</p>
					<Button ref={retryButtonRef} size="sm" variant="outline" onClick={retry}>
						<RotateCw className="size-4" />
						<span>Réessayer</span>
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	if (stripeBlocked) {
		return (
			<Alert variant="destructive" className="my-6">
				<CircleAlert className="size-4" />
				<AlertTitle>Le module de paiement semble bloqué</AlertTitle>
				<AlertDescription className="mt-2 space-y-3">
					<p className="text-sm">
						Une extension de blocage (ad-blocker) ou ton réseau empêche le chargement de Stripe.
						Essaie en navigation privée ou désactive momentanément tes bloqueurs sur cette page.
					</p>
					<Button ref={retryButtonRef} size="sm" variant="outline" onClick={retry}>
						<RotateCw className="size-4" />
						<span>Réessayer</span>
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div
			ref={containerRef}
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
