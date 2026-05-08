"use client";

import { useBulkSelectionContext } from "@/shared/components/data-table";

/**
 * Annonce VoiceOver/TalkBack du flip `selectionMode` (assertive, hors-flux).
 *
 * Pattern Mail iOS : à l'entrée du mode, le SR doit savoir que le contexte
 * d'interaction change (tap = toggle au lieu de nav). Sans ça, l'utilisateur
 * SR continue d'attendre une navigation et est désorienté.
 *
 * Au mount initial (mode OFF) la région est vide → aucune annonce parasite.
 * À l'entrée du mode, le contenu change vers "Mode sélection activé" et est
 * annoncé. À la sortie, retour à vide (l'utilisateur a demandé la sortie).
 */
export function SelectionModeAnnouncer() {
	const { selectionMode } = useBulkSelectionContext();

	return (
		<div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
			{selectionMode ? "Mode sélection activé" : ""}
		</div>
	);
}
