import { SearchX } from "lucide-react";
import { Button } from "./button";
import {
	Empty,
	EmptyActions,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "./empty";

export interface EmptySearchResultsProps {
	/** Terme de recherche (optionnel, affiche dans le titre) */
	query?: string;
	/** Callback pour effacer la recherche */
	onClear?: () => void;
	/** Label du bouton d'effacement */
	clearLabel?: string;
	/** Description personnalisee */
	description?: string;
	/** Classe CSS additionnelle */
	className?: string;
}

/**
 * Composant d'etat vide pour les resultats de recherche
 *
 * @example
 * ```tsx
 * <EmptySearchResults
 *   query="bijou lune"
 *   onClear={() => setSearch("")}
 * />
 * ```
 */
export function EmptySearchResults({
	query,
	onClear,
	clearLabel = "Effacer la recherche",
	description = "Essayez d'ajuster vos criteres de recherche.",
	className,
}: EmptySearchResultsProps) {
	const title = query
		? `Aucun resultat pour "${query}"`
		: "Aucun resultat trouve";

	return (
		<Empty size="default" className={className}>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<SearchX />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			{onClear && (
				<EmptyActions>
					<Button variant="outline" onClick={onClear}>
						{clearLabel}
					</Button>
				</EmptyActions>
			)}
		</Empty>
	);
}
