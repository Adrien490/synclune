"use client";

import { useEffect, useRef } from "react";

interface UseBackButtonCloseOptions {
	/** État d'ouverture du modal */
	isOpen: boolean;
	/** Callback appelé lors de la fermeture */
	onClose: () => void;
	/** Identifiant unique pour éviter les conflits entre modals */
	id?: string;
}

/**
 * Hook pour fermer un modal avec le bouton retour du navigateur (mobile)
 *
 * Utilise history.pushState() pour intercepter le bouton retour et fermer
 * le modal au lieu de naviguer en arrière.
 *
 * @example
 * ```tsx
 * const { handleClose } = useBackButtonClose({
 *   isOpen: open,
 *   onClose: () => setOpen(false),
 *   id: "my-modal",
 * });
 * ```
 */
export function useBackButtonClose({
	isOpen,
	onClose,
	id = "modal",
}: UseBackButtonCloseOptions) {
	const historyPushedRef = useRef(false);

	// Pousser un état dans l'historique à l'ouverture
	useEffect(() => {
		if (isOpen && !historyPushedRef.current) {
			history.pushState({ [id]: true }, "");
			historyPushedRef.current = true;
		}
	}, [isOpen, id]);

	// Écouter le bouton retour (popstate)
	useEffect(() => {
		const handlePopState = () => {
			if (isOpen && historyPushedRef.current) {
				historyPushedRef.current = false;
				onClose();
			}
		};

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [isOpen, onClose]);

	// Fonction à appeler lors de la fermeture programmatique
	const handleClose = () => {
		if (historyPushedRef.current) {
			historyPushedRef.current = false;
			history.back();
		} else {
			onClose();
		}
	};

	return { handleClose };
}
