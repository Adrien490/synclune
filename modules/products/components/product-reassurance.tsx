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
			<li>
				<span className="font-medium text-foreground">Livraison France : 6€</span>
				<span> · Expédition sous 2-3 jours</span>
			</li>
			<li>Retours et échanges sous 14 jours</li>
			<li>Paiement sécurisé (CB, PayPal)</li>
		</ul>
	);
}
