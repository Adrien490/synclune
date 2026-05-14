import { Lock } from "lucide-react";
import { StripeWordmark } from "@/modules/payments/components/stripe-wordmark";

/**
 * Trust micro-mention rendered in the checkout header.
 * Visible from `sm` breakpoint (above the fold reassurance signal —
 * Baymard Institute: visible security cues reduce checkout abandonment).
 */
export function CheckoutTrustBadge() {
	return (
		<div className="text-muted-foreground absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 text-xs sm:inline-flex">
			<span className="inline-flex items-center gap-1.5">
				<Lock className="size-3" aria-hidden="true" />
				<span>Paiement sécurisé</span>
			</span>
			<span aria-hidden="true" className="text-border">
				·
			</span>
			<StripeWordmark className="h-3 w-auto opacity-60" />
		</div>
	);
}
