"use client";

import { useBulkSelectionContext } from "@/shared/components/data-table";

/**
 * Annonce VoiceOver/TalkBack du flip `selectionMode` (polite, hors-flux).
 *
 * `polite` et non `assertive` : un `role="status"` est consultatif et implicitement
 * polite — le forcer en assertive interrompt (voire vide) la file de parole en
 * cours. Le flip étant déclenché par l'utilisateur lui-même, l'annonce n'a pas
 * besoin de couper l'énoncé courant.
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
		<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
			{selectionMode ? "Mode sélection activé" : ""}
		</div>
	);
}
