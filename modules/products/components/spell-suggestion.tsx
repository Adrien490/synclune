"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface SpellSuggestionProps {
	suggestion: string;
}

/**
 * Affiche une suggestion de correction orthographique
 * "Vouliez-vous dire : [suggestion] ?"
 *
 * Le lien conserve tous les filtres actuels en ne remplaçant que le terme de recherche
 */
export function SpellSuggestion({ suggestion }: SpellSuggestionProps) {
	const searchParams = useSearchParams();

	// Construire l'URL avec le terme suggéré tout en conservant les autres params
	const newParams = new URLSearchParams(searchParams.toString());
	newParams.set("search", suggestion);
	// Reset pagination
	newParams.delete("cursor");
	newParams.delete("direction");

	const href = `/produits?${newParams.toString()}`;

	return (
		<p className="text-sm text-muted-foreground" role="status" aria-live="polite">
			Vouliez-vous dire :{" "}
			<Link
				href={href}
				className="font-medium underline underline-offset-4"
			>
				{suggestion}
			</Link>{" "}
			?
		</p>
	);
}
