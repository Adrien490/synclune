import { use } from "react";

interface ResultCountLiveRegionProps {
	/**
	 * Total, toutes pages confondues. Accepte une promesse pour les pages qui
	 * streament leur liste (`getOrders(...)` non awaité) : y forcer un `await`
	 * au niveau page supprimerait le streaming. Monter alors le composant sous
	 * un `<Suspense fallback={null}>` — une frontière déjà révélée ne retombe
	 * pas sur son fallback pendant une transition, donc la région reste en
	 * place et son texte est bien mis à jour (et donc annoncé).
	 */
	totalCount: number | Promise<number>;
	/** Terme de recherche actif. Vide/undefined → la région reste muette. */
	query?: string;
	/** Libellé singulier du nom compté. Ex: "produit", "commande". */
	singular: string;
	/** Libellé pluriel. Ex: "produits", "commandes". */
	plural: string;
}

/**
 * Annonce le nombre de résultats d'une recherche aux lecteurs d'écran.
 *
 * **Pourquoi une SSOT** — après une recherche inline, rien n'était annoncé :
 *
 * - `CursorPagination` construit bien un message, mais fait
 *   `if (!canNavigate) return null` (décision UX assumée) : la barre **et sa live
 *   region** disparaissent dès que la liste tient sur une page — l'issue normale
 *   d'une recherche qui filtre.
 * - `AdminListLiveCount` n'est délibérément pas une live region, sa docstring
 *   s'appuyant sur celle de `CursorPagination` « montée juste en dessous » —
 *   prémisse fausse exactement dans ce cas.
 * - Côté boutique, le compteur de `product-list.tsx` était placé **après** les
 *   early-returns `error` / `products.length === 0` : passer de N à 0 supprimait
 *   la région, de 0 à N la créait déjà remplie. Une région qui apparaît en même
 *   temps que son texte n'est pas annoncée.
 *
 * **Le point clé : la clé est (query, totalCount), pas la taille de page.** Une
 * live region ne parle que si son contenu *change*. Paginer à l'intérieur d'une
 * même requête laisse le texte identique → aucune annonce → aucune collision
 * avec le « Page chargée, N résultats. » de `CursorPagination`. C'est ce qui
 * permet d'honorer la décision « pas de live region » d'`AdminListLiveCount`
 * plutôt que de la contredire.
 *
 * **Montage** : au niveau page, à une position stable **au-dessus** de toute
 * bifurcation vide/erreur/peuplée — sinon on reproduit le défaut d'origine.
 *
 * Modelé sur `shared/components/autocomplete/autocomplete-live-region.tsx`,
 * seule implémentation du repo qui annonçait correctement (toujours montée).
 */
export function ResultCountLiveRegion({
	totalCount,
	query,
	singular,
	plural,
}: ResultCountLiveRegionProps) {
	const count = typeof totalCount === "number" ? totalCount : use(totalCount);
	const trimmed = query?.trim();
	const noun = count > 1 ? plural : singular;

	const message = !trimmed
		? ""
		: count === 0
			? `Aucun ${singular} pour « ${trimmed} »`
			: `${count} ${noun} pour « ${trimmed} »`;

	return (
		<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
			{message}
		</span>
	);
}
