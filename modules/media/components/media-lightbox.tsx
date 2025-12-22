"use client";

import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

import type { Slide } from "yet-another-react-lightbox";

interface MediaLightboxProps {
	open: boolean;
	close: () => void;
	slides: Slide[];
	index: number;
	/** Callback appelé quand l'utilisateur navigue dans la lightbox */
	onIndexChange?: (index: number) => void;
}

/**
 * Lightbox générique pour médias (images/vidéos)
 * - Zoom plugin (pinch, double-tap, scroll)
 * - Counter plugin pour afficher la position
 * - Style premium personnalisé
 * - Navigation clavier (flèches, Esc)
 * - Synchronisation d'index avec le parent via onIndexChange
 */
export default function MediaLightbox({
	open,
	close,
	slides,
	index,
	onIndexChange,
}: MediaLightboxProps) {
	return (
		<Lightbox
			open={open}
			close={close}
			slides={slides}
			index={index}
			on={{
				view: ({ index: newIndex }) => {
					onIndexChange?.(newIndex);
				},
			}}
			plugins={[Zoom, Counter, Video]}
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
			video={{
				autoPlay: true,
				controls: false,
				playsInline: true,
				loop: true,
				muted: true,
			}}
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
			}}
			className="synclune-lightbox"
		/>
	);
}
