"use client";

import { useEffect, useState } from "react";
import { ExpressCheckoutElement } from "@stripe/react-stripe-js";
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { X } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useCheckoutSubmit } from "../hooks/use-checkout-submit";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";

interface ExpressCheckoutSectionProps {
	getFormData: () => Promise<ConfirmCheckoutData | null>;
	allowNavigation?: () => void;
	isOnline: boolean;
	/** Titre court affiché au-dessus du bloc (ex. "Paiement rapide"). Masqué si absent. */
	heading?: string;
	/** Libellé du séparateur sous le bloc express. */
	dividerLabel?: string;
}

/**
 * ExpressCheckoutElement wrapper — renders Apple Pay / Google Pay / Link wallets
 * when available on the current device/browser. Hides itself (heading + divider
 * included) via the native `hidden` attribute when no wallet is detected so
 * card-only users don't see an empty block — and Tailwind `space-y-*` siblings
 * don't keep a phantom gap (`:not([hidden])` excludes it).
 *
 * Must be rendered inside a Stripe <Elements> provider.
 */
export function ExpressCheckoutSection({
	getFormData,
	allowNavigation,
	isOnline,
	heading,
	dividerLabel = "Ou payer par carte",
}: ExpressCheckoutSectionProps) {
	const haptic = useHaptic();
	const [hasExpress, setHasExpress] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = useCheckoutSubmit({ getFormData, allowNavigation });

	// Auto-clear error after 8s so the alert doesn't stick indefinitely
	// when the user moves on to another payment method.
	useEffect(() => {
		if (!error) return;
		const timeout = window.setTimeout(() => setError(null), 8000);
		return () => window.clearTimeout(timeout);
	}, [error]);

	function showError(message: string) {
		setError(message);
		haptic("error");
	}

	async function handleConfirm(_event: StripeExpressCheckoutElementConfirmEvent) {
		setError(null);
		haptic("medium");

		if (!isOnline) {
			showError("Vérifie ta connexion internet pour continuer.");
			return;
		}

		const result = await submit({ returnUrlSuffix: "" });

		switch (result.status) {
			case "form-invalid":
				// Form validation surfaced its own errors via aria-live;
				// signal to wallet flow with a short hint above the element.
				showError("Complète le formulaire avant de payer.");
				return;
			case "submit-error":
			case "checkout-error":
			case "stripe-error":
				showError(result.message);
				return;
			case "redirecting":
				return;
		}
	}

	return (
		<div hidden={!hasExpress}>
			{heading && <p className="text-foreground mb-3 text-sm font-medium">{heading}</p>}

			{error && (
				<Alert variant="destructive" role="alert" aria-live="assertive" className="mb-4">
					<AlertDescription className="flex items-start justify-between gap-2">
						<span>{error}</span>
						<button
							type="button"
							onClick={() => setError(null)}
							aria-label="Fermer le message d'erreur"
							className="text-destructive hover:text-destructive/80 focus-visible:ring-ring -m-1 shrink-0 rounded-sm p-1 focus-visible:ring-2 focus-visible:outline-none"
						>
							<X className="size-3.5" aria-hidden="true" />
						</button>
					</AlertDescription>
				</Alert>
			)}

			<div role="group" aria-label="Paiement express" className="space-y-4">
				<ExpressCheckoutElement
					onReady={({ availablePaymentMethods }) => {
						setHasExpress(Boolean(availablePaymentMethods));
					}}
					onConfirm={handleConfirm}
					options={{
						paymentMethods: {
							applePay: "auto",
							googlePay: "auto",
							link: "auto",
							amazonPay: "never",
							paypal: "never",
						},
						buttonTheme: {
							applePay: "black",
							googlePay: "black",
						},
						buttonHeight: 44,
					}}
				/>

				<div className="flex items-center gap-3">
					<div className="border-border flex-1 border-t" />
					<span className="text-muted-foreground text-xs">{dividerLabel}</span>
					<div className="border-border flex-1 border-t" />
				</div>
			</div>
		</div>
	);
}
