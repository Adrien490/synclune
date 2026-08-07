interface AutocompleteLiveRegionProps {
	/**
	 * Gate sur l'état ouvert du combobox : sans lui, une recherche relancée
	 * APRÈS sélection (le hook checkout re-cherche l'adresse complète écrite
	 * par onSelect) faisait annoncer « Recherche en cours » puis « N résultats
	 * trouvés » alors que la liste était fermée et la saisie terminée.
	 */
	isOpen: boolean;
	isLoading: boolean;
	hasResults: boolean;
	hasValidQuery: boolean;
	itemCount: number;
	/**
	 * Panne du service d'adresses.
	 *
	 * ⚠️ Cet état N'ÉTAIT PAS annoncé : la région ne couvrait que chargement,
	 * résultats et « aucun résultat ». Quand l'API BAN tombe, le dropdown affiche
	 * un message et un bouton « Réessayer » — mais dans un `<li role="presentation">`
	 * du listbox, donc muet. Un utilisateur non-voyant attendait indéfiniment des
	 * suggestions qui ne viendraient jamais, sur le champ Adresse du tunnel de
	 * paiement (audit a11y 2026-08-07).
	 */
	hasError?: boolean;
}

export function AutocompleteLiveRegion({
	isOpen,
	isLoading,
	hasResults,
	hasValidQuery,
	itemCount,
	hasError = false,
}: AutocompleteLiveRegionProps) {
	const message = (() => {
		// L'erreur prime sur l'état ouvert : elle peut survenir liste fermée.
		if (hasError) return "La recherche d'adresse est indisponible. Saisis ton adresse à la main.";
		if (!isOpen) return "";
		if (isLoading) return "Recherche en cours";
		if (hasResults) {
			return `${itemCount} résultat${itemCount > 1 ? "s" : ""} trouvé${itemCount > 1 ? "s" : ""}`;
		}
		return hasValidQuery ? "Aucun résultat" : "";
	})();

	return (
		<span className="sr-only" aria-live="polite">
			{message}
		</span>
	);
}
