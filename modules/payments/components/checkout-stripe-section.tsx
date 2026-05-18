"use client";

import { useState } from "react";
import { Elements, ExpressCheckoutElement, PaymentElement } from "@stripe/react-stripe-js";
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { cn } from "@/shared/utils/cn";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { getStripe } from "@/shared/lib/stripe-client";
import { useStripeAppearance } from "../hooks/use-stripe-appearance";
import { useCheckoutSubmit } from "../hooks/use-checkout-submit";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";
import { PayButton } from "./pay-button";
import { PaymentSectionSkeleton } from "./payment-section-skeleton";
import { StripeWordmark } from "./stripe-wordmark";

interface CheckoutStripeSectionProps {
	clientSecret: string;
	total: number;
	canSubmit: boolean;
	shippingUnavailable: boolean;
	isOnline: boolean;
	email?: string;
	billingName?: string;
	getFormData: () => Promise<ConfirmCheckoutData | null>;
	/** Called just before the Stripe redirect so beforeunload doesn't fire. */
	allowNavigation?: () => void;
}

/**
 * Full Stripe block: <Elements> wrapper, ExpressCheckoutElement (Apple Pay / Google Pay / Link),
 * standard PaymentElement, PayButton and trust badges.
 *
 * Isolated in its own file so `checkout-form.tsx` can load it via `next/dynamic`
 * and keep the ~100KB `@stripe/react-stripe-js` bundle off the critical path.
 */
export function CheckoutStripeSection({
	clientSecret,
	total,
	canSubmit,
	shippingUnavailable,
	isOnline,
	email,
	billingName,
	getFormData,
	allowNavigation,
}: CheckoutStripeSectionProps) {
	const [isPaymentReady, setIsPaymentReady] = useState(false);
	const appearance = useStripeAppearance();

	return (
		<Elements
			stripe={getStripe()}
			options={{
				clientSecret,
				appearance,
				locale: "fr",
			}}
		>
			<div className="space-y-6">
				<p className="text-muted-foreground text-sm">
					Toutes les transactions sont sécurisées et chiffrées.
				</p>

				{!isPaymentReady && <PaymentSectionSkeleton />}

				<div className={cn("space-y-6", !isPaymentReady && "hidden")}>
					<ExpressCheckoutSection
						getFormData={getFormData}
						allowNavigation={allowNavigation}
						isOnline={isOnline}
					/>

					<div className="bg-card border-primary/10 overflow-hidden rounded-2xl border p-4 shadow-sm">
						<PaymentElement onReady={() => setIsPaymentReady(true)} />
					</div>

					{/* Trust strip — kept above the sticky CTA on mobile so it stays visible */}
					<div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
						<span className="inline-flex items-center gap-1">
							<Lock className="size-3" aria-hidden="true" />
							Paiement sécurisé
						</span>
						<span aria-hidden="true" className="text-border hidden sm:inline">
							|
						</span>
						<span className="inline-flex items-center gap-1">
							Propulsé par <StripeWordmark className="h-4 w-auto opacity-50" />
						</span>
					</div>

					{/* Terms notice + Pay button */}
					<div className="space-y-3">
						<p className="text-muted-foreground text-center text-xs">
							En passant commande, tu acceptes nos{" "}
							<Link
								href="/cgv"
								className="text-foreground underline hover:no-underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								conditions générales de vente
							</Link>{" "}
							et notre{" "}
							<Link
								href="/confidentialite"
								className="text-foreground underline hover:no-underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								politique de confidentialité
							</Link>
							.
						</p>
						<PayButton
							total={total}
							disabled={!canSubmit}
							shippingUnavailable={shippingUnavailable}
							isOnline={isOnline}
							email={email}
							billingName={billingName}
							getFormData={getFormData}
							allowNavigation={allowNavigation}
						/>
					</div>
				</div>
			</div>
		</Elements>
	);
}

interface ExpressCheckoutSectionProps {
	getFormData: () => Promise<ConfirmCheckoutData | null>;
	allowNavigation?: () => void;
	isOnline: boolean;
}

/**
 * ExpressCheckoutElement wrapper — renders Apple Pay / Google Pay / Link wallets
 * when available on the current device/browser. Hides itself (plus the divider)
 * when no wallet is detected so card-only users don't see an empty block.
 */
function ExpressCheckoutSection({
	getFormData,
	allowNavigation,
	isOnline,
}: ExpressCheckoutSectionProps) {
	const haptic = useHaptic();
	const [hasExpress, setHasExpress] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = useCheckoutSubmit({ getFormData, allowNavigation });

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
		<div className={cn(!hasExpress && "hidden")}>
			{error && (
				<Alert variant="destructive" role="alert" aria-live="assertive" className="mb-4">
					<AlertDescription>{error}</AlertDescription>
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
					<span className="text-muted-foreground text-xs">Ou payer par carte</span>
					<div className="border-border flex-1 border-t" />
				</div>
			</div>
		</div>
	);
}
