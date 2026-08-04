"use client";

import { Suspense, type ComponentProps } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface SearchCorrectionSuggestionProps {
	suggestion: string;
	/**
	 * Porte `role="status"` (défaut). Passer `false` quand un ancêtre annonce déjà
	 * — c'est le cas dans `SearchFallbackSuggestions`, où le `<Empty>` est lui-même
	 * une live region : deux régions imbriquées produisent une double annonce.
	 */
	announce?: boolean;
}

/**
 * Affiche une suggestion de correction de recherche
 * "Tu voulais dire : [suggestion] ?"
 *
 * Le lien conserve tous les filtres actuels en ne remplaçant que le terme de
 * recherche — c'est la raison d'être de ce composant, et pourquoi il remplace le
 * `SuggestionLink` local de `search-fallback-suggestions.tsx`, qui reconstruisait
 * l'URL de zéro et perdait donc silencieusement tous les filtres actifs (filtrer
 * par couleur puis accepter une correction effaçait le filtre).
 *
 * Rendu en `<span class="block">` et non `<div>` : il est monté dans un
 * `EmptyDescription`, qui est un `<p>` — un `<div>` y serait du HTML invalide.
 */
function SearchCorrectionSuggestionInner({
	suggestion,
	announce = true,
}: SearchCorrectionSuggestionProps) {
	const searchParams = useSearchParams();

	// Construire l'URL avec le terme suggéré tout en conservant les autres params
	const newParams = new URLSearchParams(searchParams.toString());
	newParams.set("search", suggestion);
	// Reset pagination
	newParams.delete("cursor");
	newParams.delete("direction");

	const href = `/produits?${newParams.toString()}`;

	return (
		<span
			className="text-muted-foreground block text-sm"
			role={announce ? "status" : undefined}
			aria-live={announce ? "polite" : undefined}
		>
			Tu voulais dire :{" "}
			<Link href={href} className="font-medium underline underline-offset-4">
				{suggestion}
			</Link>{" "}
			?
		</span>
	);
}

export function SearchCorrectionSuggestion(
	props: ComponentProps<typeof SearchCorrectionSuggestionInner>,
) {
	return (
		<Suspense fallback={null}>
			<SearchCorrectionSuggestionInner {...props} />
		</Suspense>
	);
}
