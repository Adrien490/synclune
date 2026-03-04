import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { formatShippingPrice } from "@/modules/orders/services/shipping.service";
import { RotateCcw, ShieldCheck, Truck } from "lucide-react";
import {
	VisaIcon,
	MastercardIcon,
	CBIcon,
	PayPalIcon,
	ApplePayIcon,
} from "@/shared/components/icons/payment-icons";
import { StripeWordmark } from "@/modules/payments/components/stripe-wordmark";

/**
 * ProductReassurance - Infos de confiance style Etsy (Baymard UX)
 *
 * Composant Server (RSC) pour le contenu statique.
 * Affiche les frais de livraison explicites (guideline Baymard : 64% des utilisateurs
 * cherchent cette info avant d'ajouter au panier).
 */
export function ProductReassurance() {
	return (
		<ul className="text-muted-foreground bg-muted/30 border-border/50 space-y-2.5 rounded-xl border px-4 py-4 text-sm">
			{/* Frais de livraison explicites - Baymard : 64% cherchent cette info avant add-to-cart */}
			<li className="flex items-start gap-2.5">
				<Truck className="text-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<div>
					<span className="text-foreground font-medium">
						France : {formatShippingPrice(SHIPPING_RATES.FR.amount)}
					</span>
					<span className="block">UE : {formatShippingPrice(SHIPPING_RATES.EU.amount)}</span>
				</div>
			</li>
			<li className="flex items-center gap-2.5">
				<RotateCcw className="text-foreground size-4 shrink-0" aria-hidden="true" />
				Retours et échanges sous 14 jours
			</li>
			<li className="flex items-start gap-2.5">
				<ShieldCheck className="text-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<div className="space-y-1.5">
					<span>Paiement sécurisé</span>
					<div className="flex items-center gap-2" aria-label="Moyens de paiement acceptés">
						<VisaIcon className="h-5 w-auto" aria-label="Visa" />
						<MastercardIcon className="h-5 w-auto" aria-label="Mastercard" />
						<CBIcon className="h-5 w-auto" aria-label="CB" />
						<PayPalIcon className="h-5 w-auto" aria-label="PayPal" />
						<ApplePayIcon className="h-5 w-auto" aria-label="Apple Pay" />
					</div>
					<div className="flex items-center gap-1.5 text-xs">
						<span>Propulsé par</span>
						<StripeWordmark className="h-3.5 w-auto" />
					</div>
				</div>
			</li>
		</ul>
	);
}
