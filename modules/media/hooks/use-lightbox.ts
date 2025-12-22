"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Hook pour gérer l'état d'une lightbox
 * Gère le bouton "retour" mobile : ferme la lightbox au lieu de naviguer
 */
export function useLightbox() {
	const [isOpen, setIsOpen] = useState(false);
	const historyPushedRef = useRef(false);

	const open = () => {
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
	};

	// Écouter le bouton retour (popstate) pour fermer la lightbox
	useEffect(() => {
		const handlePopState = () => {
			if (isOpen) {
				historyPushedRef.current = false;
				setIsOpen(false);
			}
		};

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [isOpen]);

	return { isOpen, open, close };
}
