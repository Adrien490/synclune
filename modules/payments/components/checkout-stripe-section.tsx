"use client";

import { useState } from "react";
import {
	Elements,
	ExpressCheckoutElement,
	PaymentElement,
	useElements,
	useStripe,
} from "@stripe/react-stripe-js";
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { getStripe } from "@/shared/lib/stripe-client";
import { stripeAppearance } from "../constants/stripe-appearance";
import { confirmCheckout } from "../actions/confirm-checkout";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";
import { PayButton } from "./pay-button";
import { StripeWordmark } from "./stripe-wordmark";

interface CheckoutStripeSectionProps {
	clientSecret: string;
	total: number;
	canSubmit: boolean;
	shippingUnavailable: boolean;
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
	email,
	billingName,
	getFormData,
	allowNavigation,
}: CheckoutStripeSectionProps) {
	const [isPaymentReady, setIsPaymentReady] = useState(false);

	return (
		<Elements
			stripe={getStripe()}
			options={{
				clientSecret,
				appearance: stripeAppearance,
				locale: "fr",
			}}
		>
			<div className="space-y-6">
				<p className="text-muted-foreground text-sm">
					Toutes les transactions sont sécurisées et chiffrées.
				</p>

				{!isPaymentReady && (
					<div
						className="min-h-[360px] space-y-4 motion-safe:animate-pulse"
						aria-busy="true"
						role="status"
					>
						<span className="sr-only">Chargement du formulaire de paiement…</span>
						<div className="bg-muted h-4 w-40 rounded" />
						<div className="bg-muted h-11 w-full rounded" />
						<div className="grid grid-cols-2 gap-4">
							<div className="bg-muted h-11 rounded" />
							<div className="bg-muted h-11 rounded" />
						</div>
					</div>
				)}

				<div className={cn("space-y-6", !isPaymentReady && "hidden")}>
					<ExpressCheckoutSection getFormData={getFormData} allowNavigation={allowNavigation} />

					<div className="bg-card border-primary/10 overflow-hidden rounded-2xl border p-4 shadow-sm">
						<PaymentElement onReady={() => setIsPaymentReady(true)} />
					</div>

					{/* Terms notice + Pay button */}
					<div className="space-y-3">
						<p className="text-muted-foreground text-center text-xs">
							En passant commande, vous acceptez nos{" "}
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
							email={email}
							billingName={billingName}
							getFormData={getFormData}
							allowNavigation={allowNavigation}
						/>
					</div>

					{/* Trust badges */}
					<div className="border-primary/5 bg-primary/2 rounded-xl border p-4">
						<div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
							<span className="inline-flex items-center gap-1">
								<Lock className="h-3 w-3" />
								Paiement sécurisé
							</span>
							<span aria-hidden="true" className="text-border hidden sm:inline">
								|
							</span>
							<span className="inline-flex items-center gap-1">
								Propulsé par <StripeWordmark className="h-4 w-auto opacity-50" />
							</span>
						</div>
					</div>
				</div>
			</div>
		</Elements>
	);
}

interface ExpressCheckoutSectionProps {
	getFormData: () => Promise<ConfirmCheckoutData | null>;
	allowNavigation?: () => void;
}

/**
 * ExpressCheckoutElement wrapper — renders Apple Pay / Google Pay / Link wallets
 * when available on the current device/browser. Hides itself (plus the divider)
 * when no wallet is detected so card-only users don't see an empty block.
 */
function ExpressCheckoutSection({ getFormData, allowNavigation }: ExpressCheckoutSectionProps) {
	const stripe = useStripe();
	const elements = useElements();
	const [hasExpress, setHasExpress] = useState(false);

	async function handleConfirm(_event: StripeExpressCheckoutElementConfirmEvent) {
		if (!stripe || !elements) return;

		const formData = await getFormData();
		if (!formData) return;

		const { error: submitError } = await elements.submit();
		if (submitError) return;

		const result = await confirmCheckout(formData);
		if (!result.success) return;

		// Disable beforeunload guard before Stripe takes over the page.
		allowNavigation?.();

		await stripe.confirmPayment({
			elements,
			confirmParams: {
				return_url: `${window.location.origin}/paiement/retour?order_id=${result.orderId}`,
			},
		});
	}

	return (
		<div className={cn(!hasExpress && "hidden")}>
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
