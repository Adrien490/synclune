import { Check } from "lucide-react";

/**
 * ProductReassurance - Infos de confiance style Etsy
 *
 * Composant Server (RSC) pour le contenu statique.
 * Layout fluide avec checks verts, texte naturel et conversationnel.
 */
export function ProductReassurance() {
	return (
		<div className="space-y-2 text-sm text-muted-foreground">
			<div className="flex items-center gap-2">
				<Check className="w-4 h-4 text-green-600 shrink-0" aria-hidden="true" />
				<span>Retours et echanges acceptes sous 14 jours</span>
			</div>
			<div className="flex items-center gap-2">
				<Check className="w-4 h-4 text-green-600 shrink-0" aria-hidden="true" />
				<span>Paiement securise (CB, PayPal)</span>
			</div>
			<div className="flex items-center gap-2">
				<Check className="w-4 h-4 text-green-600 shrink-0" aria-hidden="true" />
				<span>Expedie depuis la France</span>
			</div>
		</div>
	);
}
