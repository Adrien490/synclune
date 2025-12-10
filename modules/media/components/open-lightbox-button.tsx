"use client";

import type { Slide } from "yet-another-react-lightbox";
import { useState, useEffect, useRef, type ReactNode } from "react";
import MediaLightbox from "./media-lightbox";

interface OpenLightboxButtonProps {
	slides: Slide[];
	index: number;
	/** Callback pour synchroniser l'index de la galerie avec la lightbox */
	onIndexChange?: (index: number) => void;
	children: (props: { openLightbox: () => void }) => ReactNode;
}

/**
 * Composant qui gère l'état d'ouverture de la lightbox
 * Utilise un render prop pattern pour permettre au parent de déclencher l'ouverture
 * Synchronise la navigation lightbox avec le parent via onIndexChange
 *
 * Gère le bouton "retour" mobile : ferme la lightbox au lieu de naviguer en arrière
 */
export function OpenLightboxButton({
	slides,
	index,
	onIndexChange,
	children,
}: OpenLightboxButtonProps) {
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const historyPushedRef = useRef(false);

	const openLightbox = () => {
		// Pousser un état dans l'historique pour intercepter le bouton retour
		history.pushState({ lightbox: true }, "");
		historyPushedRef.current = true;
		setLightboxOpen(true);
	};

	const closeLightbox = () => {
		// Si on a poussé un état, revenir en arrière pour le nettoyer
		if (historyPushedRef.current) {
			historyPushedRef.current = false;
			history.back();
		}
		setLightboxOpen(false);
	};

	// Écouter le bouton retour (popstate) pour fermer la lightbox
	useEffect(() => {
		const handlePopState = (event: PopStateEvent) => {
			// Si la lightbox est ouverte et qu'on navigue en arrière
			if (lightboxOpen) {
				// Empêcher la navigation, fermer la lightbox
				historyPushedRef.current = false;
				setLightboxOpen(false);
			}
		};

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [lightboxOpen]);

	return (
		<>
			{children({ openLightbox })}

			{slides.length > 0 && (
				<MediaLightbox
					open={lightboxOpen}
					close={closeLightbox}
					slides={slides}
					index={index}
					onIndexChange={onIndexChange}
				/>
			)}
		</>
	);
}
