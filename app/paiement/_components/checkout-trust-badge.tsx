import { LockIcon } from "@phosphor-icons/react/ssr";
import { StripeWordmark } from "@/modules/payments/components/stripe-wordmark";

/**
 * Micro-mention de confiance de l'en-tête du tunnel.
 *
 * ⚠️ Elle était `hidden sm:inline-flex`, donc **absente sous 640px** — et le
 * libellé « Boutique » du lien retour l'était aussi. L'en-tête du tunnel de
 * paiement ne contenait alors aucun mot : une flèche et un logo. Le signal de
 * confiance disparaissait exactement là où l'écran est le plus pauvre et
 * l'anxiété la plus forte (Baymard : les repères de sécurité visibles réduisent
 * l'abandon au paiement).
 *
 * Sous `sm`, seul le wordmark Stripe se retire : c'est lui qui coûte le plus de
 * largeur, et « Paiement sécurisé » porte l'essentiel du message. La bande
 * centrale disponible à 390px vaut ~188px entre le lien retour et le logo ;
 * le texte + cadenas y tient, le wordmark en plus non.
 *
 * C'est l'UNE des deux mentions de sécurité qui subsistent, et elle répond à
 * « suis-je dans un tunnel sûr ? ». L'autre vit dans la section Paiement et
 * répond à « que devient ma carte ? ». Les deux autres ont été retirées.
 */
export function CheckoutTrustBadge() {
	return (
		<div className="text-muted-foreground absolute left-1/2 inline-flex -translate-x-1/2 items-center gap-2 text-xs">
			<span className="inline-flex items-center gap-1.5">
				<LockIcon className="size-3 shrink-0" aria-hidden="true" />
				<span className="whitespace-nowrap">Paiement sécurisé</span>
			</span>
			<span aria-hidden="true" className="text-border hidden sm:inline">
				·
			</span>
			<StripeWordmark className="hidden h-3 w-auto opacity-60 sm:block" />
		</div>
	);
}
