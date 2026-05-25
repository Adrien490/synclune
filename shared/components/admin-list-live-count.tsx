/**
 * Région SR-only annonçant le nombre d'éléments visibles dans une liste admin
 * mobile après application d'un filtre/tri/recherche.
 *
 * Pattern : aria-live="polite" + aria-atomic="true" → annonce intégrale
 * du message dès qu'il change. Monter en haut de la mobile-list.
 */
interface AdminListLiveCountProps {
	/** Nombre d'éléments affichés dans la liste */
	count: number;
	/** Libellé singulier. Ex: "produit", "commande". */
	singular: string;
	/** Libellé pluriel. Ex: "produits", "commandes". */
	plural: string;
	/** Préfixe optionnel. Default: "" (annonce courte « N produits affichés »). */
	prefix?: string;
}

export function AdminListLiveCount({
	count,
	singular,
	plural,
	prefix = "",
}: AdminListLiveCountProps) {
	const tail =
		count === 0
			? `aucun ${singular}`
			: `${count} ${count > 1 ? plural : singular} affiché${count > 1 ? "s" : ""}`;
	const message = prefix ? `${prefix} ${tail}.` : `${tail}.`;

	return (
		<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
			{message}
		</span>
	);
}
