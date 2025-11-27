"use client";

import { ProductLightbox, type Slide } from "@/shared/components/lightbox";
import { useState, type ReactNode } from "react";

interface OpenLightboxButtonProps {
	slides: Slide[];
	index: number;
	children: (props: { openLightbox: () => void }) => ReactNode;
}

/**
 * Composant qui gère l'état d'ouverture de la lightbox
 * Utilise un render prop pattern pour permettre au parent de déclencher l'ouverture
 */
export function OpenLightboxButton({
	slides,
	index,
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
				/>
			)}
		</>
	);
}
