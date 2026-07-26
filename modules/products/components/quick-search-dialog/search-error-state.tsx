"use client";

import { Button } from "@/shared/components/ui/button";

interface SearchErrorStateProps {
	/** Relance la requête courante. */
	onRetry: () => void;
}

/**
 * État d'erreur de la recherche rapide, partagé par les DEUX chemins d'échec :
 *
 * - `quick-search-dialog.tsx` — erreur **client/réseau**, détectée par
 *   `isSearchError()` (garde sur une clé `"type"`), quand l'appel de la Server
 *   Action lui-même échoue ;
 * - `quick-search-content.tsx` — erreur **serveur**, quand l'action répond
 *   `{ kind: "error" }`.
 *
 * Les deux branches sont atteignables et couvrent des pannes distinctes ; ce
 * n'est donc pas du code mort à supprimer. Le markup était en revanche dupliqué
 * mot pour mot des deux côtés — d'où cette SSOT, pour que la formulation et
 * l'affordance de reprise ne puissent plus diverger.
 */
export function SearchErrorState({ onRetry }: SearchErrorStateProps) {
	return (
		<div
			role="alert"
			aria-live="assertive"
			className="flex flex-col items-center justify-center gap-3 px-4 py-8"
		>
			<p className="text-muted-foreground text-sm">La recherche est temporairement indisponible.</p>
			<Button variant="outline" size="sm" onClick={onRetry}>
				Réessayer
			</Button>
		</div>
	);
}
