"use client";

import type { Slide } from "yet-another-react-lightbox";
import { useState, type ReactNode } from "react";
import ProductLightbox from "./product-lightbox";

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
 */
export function OpenLightboxButton({
	slides,
	index,
	onIndexChange,
	children,
}: OpenLightboxButtonProps) {
	const [lightboxOpen, setLightboxOpen] = useState(false);

	const openLightbox = () => {
		setLightboxOpen(true);
	};

	const closeLightbox = () => {
		setLightboxOpen(false);
	};

	return (
		<>
			{children({ openLightbox })}

			{slides.length > 0 && (
				<ProductLightbox
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
