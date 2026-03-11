interface AutocompleteLiveRegionProps {
	isLoading: boolean;
	hasResults: boolean;
	hasValidQuery: boolean;
	itemCount: number;
}

export function AutocompleteLiveRegion({
	isLoading,
	hasResults,
	hasValidQuery,
	itemCount,
}: AutocompleteLiveRegionProps) {
	return (
		<span className="sr-only" aria-live="polite" aria-atomic="true">
			{isLoading
				? "Recherche en cours"
				: hasResults
					? `${itemCount} résultat${itemCount > 1 ? "s" : ""} trouvé${itemCount > 1 ? "s" : ""}`
					: hasValidQuery
						? "Aucun résultat"
						: ""}
		</span>
	);
}
