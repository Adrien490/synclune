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

/**
 * Hook pour fermer un modal avec le bouton retour du navigateur (mobile)
 *
 * Utilise history.pushState() pour intercepter le bouton retour et fermer
 * le modal au lieu de naviguer en arrière.
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

	// Réinitialiser le ref quand le modal se ferme (par n'importe quel moyen)
	useEffect(() => {
		if (!isOpen) {
			historyPushedRef.current = false;
		}
	}, [isOpen]);

	// Effect Event pour accéder aux dernières valeurs sans re-registration du listener
	const onPopState = useEffectEvent(() => {
		if (isOpen && historyPushedRef.current) {
			historyPushedRef.current = false;
			onClose();
		}
	});

	// Écouter le bouton retour (popstate) pour fermer le modal
	useEffect(() => {
		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, [onPopState]);

	// Fonction pour fermer proprement
	const handleClose = () => {
		historyPushedRef.current = false;
		onClose();
	};

	return { handleClose };
}
