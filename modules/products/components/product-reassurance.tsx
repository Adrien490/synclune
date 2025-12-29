/**
 * ProductReassurance - Infos de confiance style Etsy (Baymard UX)
 *
 * Composant Server (RSC) pour le contenu statique.
 * Affiche les frais de livraison explicites (guideline Baymard : 64% des utilisateurs
 * cherchent cette info avant d'ajouter au panier).
 */
export function ProductReassurance() {
	return (
		<ul className="space-y-1.5 text-sm text-muted-foreground">
			{/* Frais de livraison explicites - Baymard : 64% cherchent cette info avant add-to-cart */}
			<li className="flex items-center gap-2">
				<span className="text-muted-foreground/70" aria-hidden="true">•</span>
				<span>
					<span className="font-medium text-foreground">Livraison France : 6€</span>
					<span> · Expédition sous 2-3 jours</span>
				</span>
			</li>
			<li className="flex items-center gap-2">
				<span className="text-muted-foreground/70" aria-hidden="true">•</span>
				<span>Retours et échanges sous 14 jours</span>
			</li>
			<li className="flex items-center gap-2">
				<span className="text-muted-foreground/70" aria-hidden="true">•</span>
				<span>Paiement sécurisé (CB, PayPal)</span>
			</li>
		</ul>
	);
}
