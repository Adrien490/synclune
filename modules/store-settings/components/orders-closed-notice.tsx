import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { cn } from "@/shared/utils/cn";
import { ORDERS_PAUSED_NOTICE } from "@/shared/constants/orders-availability";
import { Info } from "lucide-react";

/**
 * Avis « commandes en pause » — composant canonique, présentationnel (pas
 * d'état), alimenté par le SSOT vivant `orders-availability.ts`.
 *
 * Utilisé partout où il faut expliquer la pause des commandes près d'un CTA
 * désactivé : fiche produit (sous « Ajouter au panier »), footer du panier et
 * page paiement. Le rendu de l'appelant décide de l'afficher via
 * `ORDERS_AVAILABLE === false`.
 *
 * Variante `info` (teinte cohérente avec l'icône Info) ; le titre n'est pas
 * tronqué (`line-clamp-none`) pour rester lisible en entier sur mobile étroit.
 *
 * `id` permet de relier l'avis à un bouton désactivé via `aria-describedby`.
 */
export function OrdersClosedNotice({ className, id }: { className?: string; id?: string }) {
	return (
		<Alert id={id} variant="info" className={cn("text-left", className)}>
			<Info aria-hidden="true" />
			<AlertTitle className="line-clamp-none">{ORDERS_PAUSED_NOTICE.title}</AlertTitle>
			<AlertDescription>
				<p>
					{ORDERS_PAUSED_NOTICE.body}{" "}
					<a
						href={`mailto:${ORDERS_PAUSED_NOTICE.email}`}
						className="text-primary focus-ring rounded-sm font-medium break-all underline underline-offset-4 hover:no-underline"
					>
						{ORDERS_PAUSED_NOTICE.email}
					</a>
				</p>
			</AlertDescription>
		</Alert>
	);
}
