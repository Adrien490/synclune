/**
 * ProductReassurance - Infos de confiance style Etsy
 *
 * Composant Server (RSC) pour le contenu statique.
 * Layout simple avec puces, texte naturel et conversationnel.
 */
export function ProductReassurance() {
	return (
		<ul className="space-y-1.5 text-sm text-muted-foreground">
			<li className="flex items-center gap-2">
				<span className="text-muted-foreground/70" aria-hidden="true">•</span>
				<span>Retours et échanges acceptés sous 14 jours</span>
			</li>
			<li className="flex items-center gap-2">
				<span className="text-muted-foreground/70" aria-hidden="true">•</span>
				<span>Paiement sécurisé (CB, PayPal)</span>
			</li>
			<li className="flex items-center gap-2">
				<span className="text-muted-foreground/70" aria-hidden="true">•</span>
				<span>Expédié depuis la France</span>
			</li>
		</ul>
	);
}
