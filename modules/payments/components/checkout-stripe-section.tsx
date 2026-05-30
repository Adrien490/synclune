"use client";

import { useState } from "react";
import { Elements, PaymentElement } from "@stripe/react-stripe-js";
import Link from "next/link";
import { ExternalLink, Lock } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { getStripe } from "@/shared/lib/stripe-client";
import { useStripeAppearance } from "../hooks/use-stripe-appearance";
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
	/** Forwarded to PayButton — sections incomplètes affichées dans le hint disabled. */
	incompleteSections?: string[];
	getFormData: () => Promise<ConfirmCheckoutData | null>;
	/** Called just before the Stripe redirect so beforeunload doesn't fire. */
	allowNavigation?: () => void;
}

/**
 * Stripe card block: <Elements> wrapper, standard PaymentElement, PayButton and trust badges.
 *
 * Carte uniquement : le PaymentIntent est restreint à `payment_method_types: ["card"]`
 * côté serveur (`initialize-payment.ts`). Aucun paiement express (Apple Pay / Google Pay /
 * Link) n'est proposé.
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
	incompleteSections,
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
								className="text-foreground inline-flex items-center gap-0.5 underline hover:no-underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								conditions générales de vente
								<ExternalLink className="size-3" aria-label="(nouvelle fenêtre)" />
							</Link>{" "}
							et notre{" "}
							<Link
								href="/confidentialite"
								className="text-foreground inline-flex items-center gap-0.5 underline hover:no-underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								politique de confidentialité
								<ExternalLink className="size-3" aria-label="(nouvelle fenêtre)" />
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
							incompleteSections={incompleteSections}
							getFormData={getFormData}
							allowNavigation={allowNavigation}
						/>
					</div>
				</div>
			</div>
		</Elements>
	);
}
