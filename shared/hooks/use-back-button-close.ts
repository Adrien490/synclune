"use client";

import { useEffect, useRef, useEffectEvent } from "react";

interface UseBackButtonCloseOptions {
	/** État d'ouverture du modal */
	isOpen: boolean;
	/** Callback appelé lors de la fermeture */
	onClose: () => void;
	/** Identifiant unique pour éviter les conflits entre modals */
	id?: string;
}

// ─── Coordinateur LIFO partagé ──────────────────────────────────────────────
//
// Plusieurs overlays peuvent coexister : un drawer empilé sur le mode sélection
// admin, un dialog au-dessus d'un sheet, etc. Chacun pousse une entrée
// d'historique à l'ouverture. Sans coordination, le listener `popstate` de
// CHAQUE instance réagit à n'importe quel `popstate` — donc fermer un overlay
// enfant (qui fait `history.back()`) fermait aussi l'overlay parent resté
// ouvert (bug : fermer le drawer « ... » désactivait le mode sélection).
//
// Règles :
//  • Seul l'overlay au SOMMET de la pile réagit à un `popstate` matériel.
//  • Une fermeture programmatique (`handleClose` → `history.back()`) incrémente
//    `suppressNextPops` : le `popstate` qui en résulte est « consommé » sans
//    fermer le parent encore ouvert.
interface BackEntry {
	id: string;
}

const openStack: BackEntry[] = [];
let suppressNextPops = 0;

function isTopEntry(entry: BackEntry): boolean {
	return openStack.length > 0 && openStack[openStack.length - 1] === entry;
}

function removeEntry(entry: BackEntry): void {
	const index = openStack.lastIndexOf(entry);
	if (index !== -1) openStack.splice(index, 1);
	// Garde-fou anti-fuite : sans overlay restant, aucun `popstate` à supprimer.
	if (openStack.length === 0) suppressNextPops = 0;
}

/**
 * Hook pour fermer un modal avec le bouton retour du navigateur (mobile)
 *
 * Utilise history.pushState() pour intercepter le bouton retour et fermer
 * le modal au lieu de naviguer en arrière. Coordonne les overlays imbriqués
 * via une pile LIFO partagée (cf. bloc ci-dessus).
 *
 * @example
 * ```tsx
 * useBackButtonClose({
 *   isOpen: open,
 *   onClose: () => setOpen(false),
 *   id: "my-modal",
 * });
 * ```
 */
export function useBackButtonClose({ isOpen, onClose, id = "modal" }: UseBackButtonCloseOptions) {
	const historyPushedRef = useRef(false);

	// Identité stable de cette instance dans la pile partagée.
	const entryRef = useRef<BackEntry | null>(null);
	entryRef.current ??= { id };

	// Pousser un état dans l'historique à l'ouverture + s'enregistrer dans la pile
	useEffect(() => {
		if (isOpen && !historyPushedRef.current) {
			history.pushState({ [id]: true }, "");
			historyPushedRef.current = true;
			openStack.push(entryRef.current!);
		}
	}, [isOpen, id]);

	// Réinitialiser le ref + sortir de la pile quand le modal se ferme (par n'importe quel moyen)
	useEffect(() => {
		if (!isOpen) {
			historyPushedRef.current = false;
			removeEntry(entryRef.current!);
		}
	}, [isOpen]);

	// Sécurité : sortir de la pile au démontage (cas d'un overlay démonté en étant ouvert,
	// ex. la card mobile qui bascule en checkbox et démonte son drawer long-press).
	useEffect(() => {
		const entry = entryRef.current!;
		return () => {
			removeEntry(entry);
		};
	}, []);

	// Effect Event pour accéder aux dernières valeurs sans re-registration du listener
	const onPopState = useEffectEvent(() => {
		if (!isOpen || !historyPushedRef.current) return;
		// Overlays imbriqués : seul le sommet de la pile réagit.
		if (!isTopEntry(entryRef.current!)) return;
		// `popstate` provoqué par la fermeture programmatique d'un enfant : ignoré.
		if (suppressNextPops > 0) {
			suppressNextPops -= 1;
			return;
		}
		historyPushedRef.current = false;
		removeEntry(entryRef.current!);
		onClose();
	});

	// Écouter le bouton retour (popstate) pour fermer le modal
	// Only attach the listener when the modal is open to avoid unnecessary work
	useEffect(() => {
		if (!isOpen) return;

		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, [isOpen]);

	// Fonction pour fermer proprement (pop l'entrée history pour éviter un back orphelin)
	const handleClose = () => {
		const entry = entryRef.current!;
		if (historyPushedRef.current) {
			// Reset ref AVANT history.back() pour que onPopState ne rappelle pas onClose
			historyPushedRef.current = false;
			removeEntry(entry);
			// S'il reste un overlay parent ouvert, protéger son listener du
			// `popstate` que `history.back()` va déclencher (sinon il se fermerait
			// à tort, ex. mode sélection sous un drawer d'actions groupées).
			if (openStack.length > 0) suppressNextPops += 1;
			history.back();
		}
		onClose();
	};

	return { handleClose };
}
