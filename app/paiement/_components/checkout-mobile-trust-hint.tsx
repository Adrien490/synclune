import { Lock } from "lucide-react";
import { StripeWordmark } from "@/modules/payments/components/stripe-wordmark";

/**
 * Trust signal compact rendu juste avant l'iframe Stripe sur mobile uniquement.
 *
 * Sur desktop, `CheckoutTrustBadge` (header) couvre ce rôle. En mobile, la confiance
 * est 2.4× plus critique (Baymard Institute) — afficher Lock + Stripe wordmark
 * au-dessus de l'iframe rassure avant la saisie carte.
 */
export function CheckoutMobileTrustHint() {
	return (
		<div className="text-muted-foreground mb-3 flex items-center justify-center gap-2 text-xs sm:hidden">
			<Lock className="size-3" aria-hidden="true" />
			<span>Paiement sécurisé</span>
			<span aria-hidden="true" className="text-border">
				·
			</span>
			<StripeWordmark className="h-3 w-auto opacity-80" />
		</div>
	);
}
