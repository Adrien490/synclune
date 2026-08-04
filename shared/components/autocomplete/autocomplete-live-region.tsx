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
}

export function AutocompleteLiveRegion({
	isOpen,
	isLoading,
	hasResults,
	hasValidQuery,
	itemCount,
}: AutocompleteLiveRegionProps) {
	return (
		<span className="sr-only" aria-live="polite">
			{!isOpen
				? ""
				: isLoading
					? "Recherche en cours"
					: hasResults
						? `${itemCount} résultat${itemCount > 1 ? "s" : ""} trouvé${itemCount > 1 ? "s" : ""}`
						: hasValidQuery
							? "Aucun résultat"
							: ""}
		</span>
	);
}
