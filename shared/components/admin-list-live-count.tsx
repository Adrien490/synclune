/**
 * Compteur de résultats des listes admin mobile.
 *
 * **Visible**, pas `sr-only` : la barre `CursorPagination` disparaît quand la
 * liste tient sur une page (cas normal à faible volume) et son compteur est de
 * toute façon masqué sous `sm` — sans ce composant, aucune liste admin
 * n'affichait son nombre de résultats sur mobile.
 *
 * **Pas de live region** (`role=status` / `aria-live`) ici — mais la raison a
 * changé. L'ancienne justification (« le changement de page est déjà annoncé
 * par la live region de `CursorPagination` montée juste en dessous ») était
 * FAUSSE dans le cas le plus courant : `CursorPagination` fait
 * `if (!canNavigate) return null`, donc sa barre *et sa live region*
 * disparaissent dès que la liste tient sur une page — l'issue normale d'une
 * recherche. Résultat : après une recherche inline, plus rien n'était annoncé.
 *
 * L'annonce appartient désormais à `ResultCountLiveRegion`, montée au niveau
 * page. Elle ne dépend que de (requête, total), jamais de la page courante :
 * paginer laisse le texte identique, donc silencieux — pas de double message
 * avec `CursorPagination`. Ce composant-ci reste donc purement visuel.
 * Audit recherche 2026-07-26.
 *
 * Monter en haut de la mobile-list.
 */
interface AdminListLiveCountProps {
	/** Nombre d'éléments affichés sur la page courante. */
	count: number;
	/** Libellé singulier. Ex: "produit", "commande". */
	singular: string;
	/** Libellé pluriel. Ex: "produits", "commandes". */
	plural: string;
	/**
	 * Total toutes pages confondues. Quand il dépasse `count`, l'affichage
	 * devient « X sur N produits » — aligné sur le compteur desktop, qui
	 * annonçait déjà le total alors que le mobile ne montrait que la page.
	 */
	totalCount?: number;
	/** Préfixe optionnel. Ex: "Résultats filtrés :". */
	prefix?: string;
}

export function AdminListLiveCount({
	count,
	singular,
	plural,
	totalCount,
	prefix = "",
}: AdminListLiveCountProps) {
	const showTotal = typeof totalCount === "number" && totalCount > count;
	const pluralRef = totalCount ?? count;
	const noun = pluralRef > 1 ? plural : singular;

	const label =
		count === 0
			? `Aucun ${singular}`
			: showTotal
				? `${count} sur ${totalCount} ${noun}`
				: `${count} ${noun}`;

	return (
		<p className="text-muted-foreground px-1 text-sm md:hidden">
			{prefix ? `${prefix} ${label}` : label}
		</p>
	);
}
