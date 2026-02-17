"use client";

import * as FocusScope from "@radix-ui/react-focus-scope";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

import type { Slide } from "yet-another-react-lightbox";
import { useReducedMotion } from "motion/react";
import { LIGHTBOX_CONFIG, UI_DELAYS } from "@/modules/media/constants/media.constants";

interface MediaLightboxProps {
	open: boolean;
	close: () => void;
	slides: Slide[];
	index: number;
	/** Callback called when the user navigates in the lightbox */
	onIndexChange?: (index: number) => void;
}

/**
 * Generic lightbox for media (images/videos)
 * - Zoom plugin (pinch, double-tap, scroll)
 * - Counter plugin to show position
 * - Custom premium styling
 * - Keyboard navigation (arrows, Esc)
 * - Index synchronization with parent via onIndexChange
 */
export default function MediaLightbox({
	open,
	close,
	slides,
	index,
	onIndexChange,
}: MediaLightboxProps) {
	const prefersReducedMotion = useReducedMotion();

	if (!open) return null;

	return (
		<FocusScope.Root trapped onMountAutoFocus={(e) => e.preventDefault()}>
			<div role="dialog" aria-modal="true" aria-label="Galerie en plein écran">
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
						maxZoomPixelRatio: LIGHTBOX_CONFIG.MAX_ZOOM_PIXEL_RATIO,
						zoomInMultiplier: LIGHTBOX_CONFIG.ZOOM_IN_MULTIPLIER,
						doubleTapDelay: UI_DELAYS.DOUBLE_TAP_DELAY_MS,
						doubleClickDelay: UI_DELAYS.DOUBLE_CLICK_DELAY_MS,
						doubleClickMaxStops: LIGHTBOX_CONFIG.DOUBLE_CLICK_MAX_STOPS,
						keyboardMoveDistance: LIGHTBOX_CONFIG.KEYBOARD_MOVE_DISTANCE,
						wheelZoomDistanceFactor: LIGHTBOX_CONFIG.WHEEL_ZOOM_DISTANCE_FACTOR,
						pinchZoomDistanceFactor: LIGHTBOX_CONFIG.PINCH_ZOOM_DISTANCE_FACTOR,
						scrollToZoom: true,
					}}
					counter={{ container: { style: { top: "unset", bottom: LIGHTBOX_CONFIG.COUNTER_BOTTOM_OFFSET } } }}
					video={{
						autoPlay: !prefersReducedMotion,
						controls: true,
						playsInline: true,
						loop: true,
						muted: true,
					}}
					animation={{ fade: UI_DELAYS.ANIMATION_FADE_MS, swipe: UI_DELAYS.ANIMATION_SWIPE_MS }}
					carousel={{ finite: false, preload: LIGHTBOX_CONFIG.CAROUSEL_PRELOAD }}
					controller={{ closeOnBackdropClick: true, aria: true }}
					styles={{
						container: {
							backgroundColor: `rgba(0, 0, 0, ${LIGHTBOX_CONFIG.BACKDROP_OPACITY})`,
							backdropFilter: `blur(${LIGHTBOX_CONFIG.BACKDROP_BLUR}px)`,
						},
						button: {
							filter: "none",
							color: "white",
						},
					}}
					className="synclune-lightbox"
				/>
			</div>
		</FocusScope.Root>
	);
}
