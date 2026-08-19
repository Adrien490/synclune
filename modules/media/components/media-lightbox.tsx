"use client";

import { useEffect, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

import type { Slide } from "yet-another-react-lightbox";
import { useReducedMotion } from "motion/react";
import { KeyboardIcon } from "@phosphor-icons/react/ssr";
import { LIGHTBOX_CONFIG, UI_DELAYS } from "@/modules/media/constants/ui-interactions.constants";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useRegisterOverlay } from "@/shared/hooks/use-register-overlay";

interface MediaLightboxProps {
	open: boolean;
	close: () => void;
	slides: Slide[];
	index: number;
	/** Callback called when the user navigates in the lightbox */
	onIndexChange?: (index: number) => void;
	/**
	 * Élément à re-focus à la fermeture, capturé par l'APPELANT au moment de
	 * l'ouverture. La capture interne (effet au mount) arrive trop tard : les
	 * effets ENFANTS tournent d'abord, YARL a déjà focus son conteneur, et on
	 * capturait un nœud du portail — détaché à la fermeture, `focus()` no-op.
	 */
	returnFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Generic lightbox for media (images/videos)
 * - Zoom plugin (pinch, double-tap, scroll)
 * - Counter plugin to show position
 * - Custom premium styling
 * - Keyboard navigation (arrows, Esc)
 * - Index synchronization with parent via onIndexChange
 * - Haptic feedback on swipe / close (iOS/Android)
 * - aria-live region announcing index changes (WCAG 4.1.3)
 * - Safe-area insets on counter + close button (iOS notch / home indicator)
 */
export default function MediaLightbox({
	open,
	close,
	slides,
	index,
	onIndexChange,
	returnFocusRef,
}: MediaLightboxProps) {
	const prefersReducedMotion = useReducedMotion();
	const haptic = useHaptic();
	// La lightbox est un overlay modal en `position: fixed` : `window.scrollY` reste
	// donc à 0 pendant qu'on la manipule, et le pull-to-refresh s'armait DESSOUS
	// (un pan d'image zoomée vers le bas déclenchait un refresh de la page).
	// L'enregistrer dans la pile d'overlays le désarme — et libère aussi le bord bas
	// pour la barre admin, ce que ce hook fait déjà pour les Sheet/Drawer.
	// `data-no-ptr` ne suffirait pas : YARL rend dans un portail hors de cet arbre.
	useRegisterOverlay(open);
	// Internal index tracks the slide effectively shown by the lightbox.
	// Syncs with the `index` prop when it changes externally (controlled navigation).
	const [currentIndex, setCurrentIndex] = useState(index);
	const [prevIndex, setPrevIndex] = useState(index);
	if (prevIndex !== index) {
		setPrevIndex(index);
		setCurrentIndex(index);
	}

	const handleClose = () => {
		const target = returnFocusRef?.current ?? null;
		haptic("selection");
		close();
		requestAnimationFrame(() => {
			target?.focus({ preventScroll: true });
		});
	};

	// Keyboard shortcut help popover — desktop only, toggled via "?" key or button
	const [helpOpen, setHelpOpen] = useState(false);

	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
				e.preventDefault();
				setHelpOpen((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open]);

	if (!open) return null;

	const currentSlide = slides[currentIndex];
	const isVideo = currentSlide && "type" in currentSlide && currentSlide.type === "video";
	const total = slides.length;
	const announcement = isVideo
		? `Vidéo ${currentIndex + 1} sur ${total}`
		: `Image ${currentIndex + 1} sur ${total}`;

	// Tout le chrome custom (annonce SR, aide clavier) est rendu DANS le portail
	// YARL via `render.controls` : YARL rend vers `document.body`, donc un
	// wrapper externe ne contient PAS la lightbox. L'ancien montage empilait un
	// FocusScope Radix + un `role="dialog"` autour d'un portail qui leur
	// échappait : le « piège » n'enfermait que le bouton d'aide (nasse clavier),
	// et la région live vivait hors du dialog actif (jamais vocalisée). YARL
	// gère lui-même piège de focus, `aria-modal` et navigation clavier.
	const customControls = (
		<>
			{/* Screen reader announcement of current index (WCAG 4.1.3) */}
			<div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
				{announcement}
			</div>

			{/* Keyboard shortcut help — desktop only (P2.6) */}
			<button
				type="button"
				onClick={() => setHelpOpen((prev) => !prev)}
				aria-label="Afficher les raccourcis clavier"
				aria-expanded={helpOpen}
				aria-controls="lightbox-kbd-help"
				className="absolute top-4 left-4 z-(--z-max) hidden size-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none sm:flex"
				style={{
					top: "calc(env(safe-area-inset-top, 0px) + 16px)",
					left: "calc(env(safe-area-inset-left, 0px) + 16px)",
				}}
			>
				<KeyboardIcon className="size-4" aria-hidden="true" />
			</button>

			{helpOpen && (
				<div
					id="lightbox-kbd-help"
					role="region"
					aria-label="Raccourcis clavier"
					className="absolute top-16 left-4 z-(--z-max) hidden max-w-xs rounded-lg bg-black/85 p-4 text-sm text-white shadow-xl backdrop-blur-md sm:block"
					style={{
						top: "calc(env(safe-area-inset-top, 0px) + 64px)",
						left: "calc(env(safe-area-inset-left, 0px) + 16px)",
					}}
				>
					<p className="mb-2 font-medium">Raccourcis clavier</p>
					<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
						<dt>
							<kbd className="rounded bg-white/20 px-1.5 py-0.5 font-mono">Échap</kbd>
						</dt>
						<dd>Fermer</dd>
						<dt>
							<kbd className="rounded bg-white/20 px-1.5 py-0.5 font-mono">← →</kbd>
						</dt>
						<dd>Naviguer</dd>
						<dt>
							<kbd className="rounded bg-white/20 px-1.5 py-0.5 font-mono">+ / -</kbd>
						</dt>
						<dd>Zoomer</dd>
						<dt>
							<kbd className="rounded bg-white/20 px-1.5 py-0.5 font-mono">Double-clic</kbd>
						</dt>
						<dd>Réinitialiser</dd>
						<dt>
							<kbd className="rounded bg-white/20 px-1.5 py-0.5 font-mono">?</kbd>
						</dt>
						<dd>Afficher / masquer cette aide</dd>
					</dl>
				</div>
			)}
		</>
	);

	return (
		<Lightbox
			open={open}
			close={handleClose}
			slides={slides}
			index={index}
			render={{ controls: () => customControls }}
			on={{
				view: ({ index: newIndex }) => {
					if (newIndex !== currentIndex) {
						haptic("light");
					}
					setCurrentIndex(newIndex);
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
			counter={{
				container: {
					style: {
						top: "unset",
						bottom: `max(${LIGHTBOX_CONFIG.COUNTER_BOTTOM_OFFSET}px, env(safe-area-inset-bottom, 0px) + 16px)`,
					},
				},
			}}
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
				toolbar: {
					paddingTop: "env(safe-area-inset-top, 0px)",
					paddingRight: "env(safe-area-inset-right, 0px)",
				},
			}}
			className="synclune-lightbox"
		/>
	);
}
