"use client";

import { useState, useEffect, useRef, useEffectEvent } from "react";

/**
 * Hook pour gérer l'état d'une lightbox
 * - Gère le bouton "retour" mobile : ferme la lightbox au lieu de naviguer
 * - Focus management : sauvegarde et restaure le focus (WCAG 2.4.3)
 */
export function useLightbox() {
	const [isOpen, setIsOpen] = useState(false);
	const historyPushedRef = useRef(false);
	const previousFocusRef = useRef<HTMLElement | null>(null);

	const open = () => {
		// Sauvegarder l'élément actuellement focalisé
		previousFocusRef.current = document.activeElement as HTMLElement;

		if (typeof window !== "undefined" && typeof window.history?.pushState === "function") {
			history.pushState({ lightbox: true }, "");
			historyPushedRef.current = true;
		}
		setIsOpen(true);
	};

	const close = () => {
		if (historyPushedRef.current && typeof window !== "undefined") {
			historyPushedRef.current = false;
			history.back();
		}
		setIsOpen(false);

		// Restaurer le focus après fermeture
		requestAnimationFrame(() => {
			if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
				previousFocusRef.current.focus();
				previousFocusRef.current = null;
			}
		});
	};

	// Effect Event pour accéder aux dernières valeurs sans re-registration du listener
	const onPopState = useEffectEvent(() => {
		if (isOpen) {
			historyPushedRef.current = false;
			setIsOpen(false);

			// Restaurer le focus
			requestAnimationFrame(() => {
				if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
					previousFocusRef.current.focus();
					previousFocusRef.current = null;
				}
			});
		}
	});

	// Écouter le bouton retour (popstate) pour fermer la lightbox
	useEffect(() => {
		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, [onPopState]);

	return { isOpen, open, close };
}
