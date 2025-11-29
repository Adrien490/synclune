"use client";

import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

import type { Slide } from "yet-another-react-lightbox";

interface ProductLightboxProps {
	open: boolean;
	close: () => void;
	slides: Slide[];
	index: number;
}

/**
 * Lightbox premium pour images produits
 * - Zoom plugin (pinch, double-tap, scroll)
 * - Counter plugin pour afficher la position
 * - Style premium personnalisé
 * - Navigation clavier (flèches, Esc)
 */
export default function ProductLightbox({
	open,
	close,
	slides,
	index,
}: ProductLightboxProps) {
	return (
		<Lightbox
			open={open}
			close={close}
			slides={slides}
			index={index}
			plugins={[Zoom, Counter]}
			zoom={{
				maxZoomPixelRatio: 3,
				zoomInMultiplier: 2,
				doubleTapDelay: 300,
				doubleClickDelay: 300,
				doubleClickMaxStops: 2,
				keyboardMoveDistance: 50,
				wheelZoomDistanceFactor: 100,
				pinchZoomDistanceFactor: 100,
				scrollToZoom: true,
			}}
			counter={{ container: { style: { top: "unset", bottom: 16 } } }}
			animation={{ fade: 350, swipe: 300 }}
			carousel={{ finite: false, preload: 2 }}
			controller={{ closeOnBackdropClick: true }}
			styles={{
				container: {
					backgroundColor: "rgba(0, 0, 0, 0.95)",
					backdropFilter: "blur(20px)",
				},
				button: {
					filter: "none",
					color: "white",
				},
				navigationPrev: {
					color: "white",
					background: "rgba(255, 255, 255, 0.1)",
					borderRadius: "50%",
					width: 48,
					height: 48,
					margin: 16,
					backdropFilter: "blur(8px)",
					border: "1px solid rgba(255, 255, 255, 0.2)",
					transition: "all 0.2s ease",
				},
				navigationNext: {
					color: "white",
					background: "rgba(255, 255, 255, 0.1)",
					borderRadius: "50%",
					width: 48,
					height: 48,
					margin: 16,
					backdropFilter: "blur(8px)",
					border: "1px solid rgba(255, 255, 255, 0.2)",
					transition: "all 0.2s ease",
				},
			}}
			className="synclune-lightbox"
		/>
	);
}
