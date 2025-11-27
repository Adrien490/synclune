"use client";

import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

import type { Slide } from "yet-another-react-lightbox";

interface ProductLightboxProps {
	open: boolean;
	close: () => void;
	slides: Slide[];
	index: number;
}

/**
 * Lightbox optimized for product images
 * - Zoom plugin enabled
 * - Next.js Image optimization via URL generation (not custom render)
 * - Keyboard navigation (arrows, Esc)
 *
 * Note: According to Yet Another React Lightbox docs,
 * the Zoom plugin doesn't work well with Next.js Image component.
 * Instead, we generate optimized Next.js URLs in the slides array.
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
			plugins={[Zoom]}
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
			animation={{ fade: 300 }}
			carousel={{ finite: false }}
			controller={{ closeOnBackdropClick: true }}
		/>
	);
}
