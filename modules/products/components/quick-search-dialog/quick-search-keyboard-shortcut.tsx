"use client";

import { useEffect } from "react";

import { useDialog } from "@/shared/providers/dialog-store-provider";

import { QUICK_SEARCH_DIALOG_ID } from "./constants";
import { setLastTrigger } from "./last-trigger";

/**
 * Lightweight listener for the global ⌘K / Ctrl+K shortcut.
 *
 * Lives outside the heavy `QuickSearchDialog` so the dialog chunk
 * (motion/react + search logic, ~85-125 KiB) stays unloaded until the
 * user actually requests the search. Sets `isOpen=true` in the store
 * which then triggers the lazy mount of the dialog itself.
 */
export function QuickSearchKeyboardShortcut() {
	const { isOpen, open, close } = useDialog(QUICK_SEARCH_DIALOG_ID);

	// Préchauffe le chunk du dialog pendant un temps mort, pour que le tout
	// premier ⌘K / tap n'attende pas le réseau. `loading: () => null` côté
	// `dynamic()` ne donne AUCUN retour visuel entre l'ouverture et l'arrivée du
	// chunk ; un skeleton, lui, ajouterait un flash sur le chemin courant (chunk
	// déjà en cache). Audit recherche 2026-07-26.
	useEffect(() => {
		const prefetch = () => {
			void import("./quick-search-dialog");
		};
		if (typeof window.requestIdleCallback === "function") {
			const handle = window.requestIdleCallback(prefetch, { timeout: 3000 });
			return () => window.cancelIdleCallback(handle);
		}
		const timer = window.setTimeout(prefetch, 2000);
		return () => window.clearTimeout(timer);
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// ⌥⌘K est une combinaison OS/navigateur sur certaines plateformes.
			if (e.altKey) return;
			// `toLowerCase()` : avec Shift ou CapsLock, `e.key` vaut "K" — ⇧⌘K ne
			// faisait rien.
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				// Volontairement PAS de garde `isInteractiveTarget` ici (contrairement à
				// la cheatsheet admin, qui écoute la touche `?` nue et collisionne donc
				// vraiment avec la frappe) : ⌘K est un accélérateur modifié, et le
				// bloquer dans les champs casserait « sélectionner du texte puis ⌘K ».
				e.preventDefault();
				if (isOpen) {
					close();
				} else {
					// Remember the focused element so focus returns there on close.
					if (document.activeElement instanceof HTMLElement) {
						setLastTrigger(document.activeElement);
					}
					open();
				}
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, open, close]);

	return null;
}
