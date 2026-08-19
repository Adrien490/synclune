"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";
import { useHaptic } from "@/shared/hooks/use-haptic";
import {
	MAIN_IMAGE_QUALITY,
	GALLERY_MAIN_SIZES,
} from "@/modules/media/constants/image-config.constants";
import { PINCH_ZOOM_CONFIG } from "@/modules/media/constants/gallery.constants";
import {
	getDistance,
	getCenter,
	clampPosition,
	getZoomToPointPosition,
	type Point,
} from "@/shared/utils/touch-geometry";

const DEFAULT_PINCH_ZOOM_CONFIG = {
	minScale: 1,
	maxScale: 3,
	doubleTapScale: 2,
	doubleTapDelay: 300,
	keyboardZoomStep: 0.5,
	keyboardPanStep: 50,
	moveThreshold: 10,
};

const config = { ...DEFAULT_PINCH_ZOOM_CONFIG, ...PINCH_ZOOM_CONFIG };

interface GalleryPinchZoomProps {
	src: string;
	alt: string;
	blurDataUrl?: string;
	isActive: boolean;
	onTap?: () => void;
	preload?: boolean;
	/** View Transition name for cross-page morphing */
	viewTransitionName?: string;
}

/**
 * Mobile component with native pinch-to-zoom support
 *
 * Features:
 * - Pinch to zoom (1x → 3x)
 * - Double-tap to toggle 2x zoom / reset
 * - Pan when zoomed
 * - Single tap opens lightbox
 *
 * Accessibility:
 * - Full keyboard support (+/-/arrows/Escape)
 * - Dynamic ARIA labels
 * - Focus visible
 * - Screen reader announcements
 * - Respects prefers-reduced-motion
 */
export function GalleryPinchZoom({
	src,
	alt,
	blurDataUrl,
	isActive,
	onTap,
	preload = false,
	viewTransitionName,
}: GalleryPinchZoomProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const prefersReduced = useReducedMotion();
	const haptic = useHaptic();

	// États réactifs (déclenchent re-render)
	const [scale, setScale] = useState<number>(config.minScale);
	const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
	// Pas d'état `isInteracting` : `will-change` est un INDICE au navigateur, et il
	// se pose en CSS (`group-active:will-change-transform`). Le tenir en state
	// coûtait un rendu React complet au début ET à la fin de chaque geste, pour une
	// propriété que personne ne lit. Le conteneur porte déjà `active:scale-[0.99]`,
	// donc `:active` couvre exactement la même fenêtre que touchstart → touchend.

	// Refs pour tracking touch (pas de re-render)
	const initialDistance = useRef(0);
	const initialScale = useRef<number>(config.minScale);
	const initialPosition = useRef<Point>({ x: 0, y: 0 });
	const lastTouchCenter = useRef<Point>({ x: 0, y: 0 });
	const startTouchCenter = useRef<Point>({ x: 0, y: 0 });
	const lastTapTime = useRef(0);
	const isPinching = useRef(false);
	const isPanning = useRef(false);
	const hasMoved = useRef(false);
	const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Dernières valeurs APPLIQUÉES par un handler de geste : plusieurs touchmove
	// peuvent être coalescés avant re-render, `scale`/`position` lus depuis
	// l'état sont alors ceux du rendu précédent. Écrite uniquement dans les
	// handlers (jamais pendant le rendu — règle compilateur).
	const lastApplied = useRef<{ scale: number; position: Point } | null>(null);

	const isZoomed = scale > config.minScale;

	// Reset au changement de slide/désactivation — pattern officiel "storing
	// information from previous renders" (react.dev/reference/react/useState)
	// pour éviter le re-render supplémentaire d'un useEffect.
	const [prevIsActive, setPrevIsActive] = useState(isActive);
	if (prevIsActive !== isActive) {
		setPrevIsActive(isActive);
		if (!isActive) {
			setScale(config.minScale);
			setPosition({ x: 0, y: 0 });
		}
	}

	// Cleanup timeout
	useEffect(() => {
		return () => {
			if (tapTimeout.current) {
				clearTimeout(tapTimeout.current);
			}
		};
	}, []);

	function reset() {
		setScale(config.minScale);
		setPosition({ x: 0, y: 0 });
		lastApplied.current = { scale: config.minScale, position: { x: 0, y: 0 } };
	}

	function zoomIn() {
		const newScale = Math.min(config.maxScale, scale + config.keyboardZoomStep);
		const newPosition = clampPosition(
			position,
			newScale,
			containerRef.current?.getBoundingClientRect() ?? null,
		);
		setScale(newScale);
		setPosition(newPosition);
		lastApplied.current = { scale: newScale, position: newPosition };
	}

	function zoomOut() {
		const newScale = Math.max(config.minScale, scale - config.keyboardZoomStep);
		const newPosition =
			newScale === config.minScale
				? { x: 0, y: 0 }
				: clampPosition(position, newScale, containerRef.current?.getBoundingClientRect() ?? null);
		setScale(newScale);
		setPosition(newPosition);
		lastApplied.current = { scale: newScale, position: newPosition };
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		const rect = containerRef.current?.getBoundingClientRect() ?? null;

		switch (e.key) {
			case "+":
			case "=":
			case "*":
				e.preventDefault();
				zoomIn();
				break;

			case "-":
				e.preventDefault();
				zoomOut();
				break;

			case "0":
			case "Escape":
				e.preventDefault();
				reset();
				break;

			case "ArrowLeft":
				if (isZoomed) {
					e.preventDefault();
					setPosition(
						clampPosition({ x: position.x + config.keyboardPanStep, y: position.y }, scale, rect),
					);
				}
				break;

			case "ArrowRight":
				if (isZoomed) {
					e.preventDefault();
					setPosition(
						clampPosition({ x: position.x - config.keyboardPanStep, y: position.y }, scale, rect),
					);
				}
				break;

			case "ArrowUp":
				if (isZoomed) {
					e.preventDefault();
					setPosition(
						clampPosition({ x: position.x, y: position.y + config.keyboardPanStep }, scale, rect),
					);
				}
				break;

			case "ArrowDown":
				if (isZoomed) {
					e.preventDefault();
					setPosition(
						clampPosition({ x: position.x, y: position.y - config.keyboardPanStep }, scale, rect),
					);
				}
				break;

			case "Enter":
			case " ":
				if (!isZoomed) {
					e.preventDefault();
					onTap?.();
				}
				break;
		}
	}

	const handleTouchStart = useEffectEvent((e: TouchEvent) => {
		hasMoved.current = false;

		if (e.touches.length === 2) {
			isPinching.current = true;
			isPanning.current = false;
			initialDistance.current = getDistance(e.touches);
			initialScale.current = scale;
			const center = getCenter(e.touches);
			lastTouchCenter.current = center;
			startTouchCenter.current = center;
			initialPosition.current = { ...position };
		} else if (e.touches.length === 1) {
			const touchPoint = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
			startTouchCenter.current = touchPoint;
			if (isZoomed) {
				isPanning.current = true;
				lastTouchCenter.current = touchPoint;
				initialPosition.current = { ...position };
			}
		}
	});

	const handleTouchMove = useEffectEvent((e: TouchEvent) => {
		const rect = containerRef.current?.getBoundingClientRect() ?? null;

		if (e.touches.length === 2 && isPinching.current) {
			e.preventDefault();

			const center = getCenter(e.touches);
			if (!rect) return;

			const totalDistance = Math.hypot(
				center.x - startTouchCenter.current.x,
				center.y - startTouchCenter.current.y,
			);

			if (totalDistance > config.moveThreshold) {
				hasMoved.current = true;
			}

			const newDistance = getDistance(e.touches);
			const ratio = newDistance / initialDistance.current;
			const newScale = Math.min(
				config.maxScale,
				Math.max(config.minScale, initialScale.current * ratio),
			);

			// Géométrie ancrée sur l'état de DÉBUT de geste (refs), jamais sur
			// `scale`/`position` : plusieurs touchmove coalescés avant re-render
			// liraient l'état du rendu précédent → dérive/jitter de la focale.
			// Focale = centre du pinch au départ ; le drift du centre pendant le
			// geste devient un pan additionnel.
			const focalX = startTouchCenter.current.x - rect.left - rect.width / 2;
			const focalY = startTouchCenter.current.y - rect.top - rect.height / 2;
			const scaleRatio = newScale / initialScale.current;
			const newPosition = clampPosition(
				{
					x:
						focalX -
						(focalX - initialPosition.current.x) * scaleRatio +
						(center.x - startTouchCenter.current.x),
					y:
						focalY -
						(focalY - initialPosition.current.y) * scaleRatio +
						(center.y - startTouchCenter.current.y),
				},
				newScale,
				rect,
			);

			setScale(newScale);
			setPosition(newPosition);
			lastApplied.current = { scale: newScale, position: newPosition };
		} else if (
			e.touches.length === 1 &&
			isPanning.current &&
			(lastApplied.current?.scale ?? scale) > config.minScale
		) {
			e.preventDefault();

			const touch = e.touches[0]!;
			const totalDistance = Math.hypot(
				touch.clientX - startTouchCenter.current.x,
				touch.clientY - startTouchCenter.current.y,
			);

			if (totalDistance > config.moveThreshold) {
				hasMoved.current = true;
			}

			const deltaX = touch.clientX - lastTouchCenter.current.x;
			const deltaY = touch.clientY - lastTouchCenter.current.y;

			const newPosition = clampPosition(
				{
					x: initialPosition.current.x + deltaX,
					y: initialPosition.current.y + deltaY,
				},
				lastApplied.current?.scale ?? scale,
				rect,
			);

			setPosition(newPosition);
			lastApplied.current = {
				scale: lastApplied.current?.scale ?? scale,
				position: newPosition,
			};
		} else if (e.touches.length === 1 && !isZoomed) {
			const touch = e.touches[0]!;
			const totalDistance = Math.hypot(
				touch.clientX - startTouchCenter.current.x,
				touch.clientY - startTouchCenter.current.y,
			);

			if (totalDistance > config.moveThreshold) {
				hasMoved.current = true;
			}
		}
	});

	const handleTouchEnd = useEffectEvent((e: TouchEvent) => {
		const wasPinching = isPinching.current;
		const wasPanning = isPanning.current;

		isPinching.current = false;
		isPanning.current = false;

		// Un doigt levé après un pinch : le doigt RESTANT reprend le pan sans
		// devoir se reposer (avant, `isPanning` retombait à false et le doigt
		// restant était inerte). Ancrage sur les dernières valeurs appliquées —
		// l'état peut avoir un rendu de retard en fin de geste.
		if (e.touches.length === 1) {
			const remaining = e.touches[0]!;
			const appliedScale = lastApplied.current?.scale ?? scale;
			if (appliedScale > config.minScale) {
				isPanning.current = true;
				const point = { x: remaining.clientX, y: remaining.clientY };
				lastTouchCenter.current = point;
				startTouchCenter.current = point;
				initialPosition.current = { ...(lastApplied.current?.position ?? position) };
			}
			return;
		}

		if (containerRef.current && e.touches.length === 0) {
			containerRef.current.focus();
		}

		if (scale < config.minScale) {
			setScale(config.minScale);
			setPosition({ x: 0, y: 0 });
			return;
		}

		if (scale === config.minScale) {
			setPosition({ x: 0, y: 0 });
		}

		if (e.touches.length === 0 && !wasPinching && !hasMoved.current) {
			const now = Date.now();
			const timeSinceLastTap = now - lastTapTime.current;

			if (timeSinceLastTap < config.doubleTapDelay && timeSinceLastTap > 0) {
				e.preventDefault();
				lastTapTime.current = 0;

				if (tapTimeout.current) {
					clearTimeout(tapTimeout.current);
					tapTimeout.current = null;
				}

				if (isZoomed) {
					reset();
				} else {
					const touch = e.changedTouches[0];
					const rect = containerRef.current?.getBoundingClientRect();

					if (touch && rect) {
						const newPosition = getZoomToPointPosition(
							{ x: touch.clientX, y: touch.clientY },
							rect,
							config.doubleTapScale,
						);
						setScale(config.doubleTapScale);
						setPosition(newPosition);
					} else {
						setScale(config.doubleTapScale);
					}
				}
			} else {
				lastTapTime.current = now;

				if (!isZoomed && !wasPanning) {
					tapTimeout.current = setTimeout(() => {
						if (Date.now() - lastTapTime.current >= config.doubleTapDelay) {
							onTap?.();
						}
					}, config.doubleTapDelay);
				}
			}
		}
	});

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		container.addEventListener("touchstart", handleTouchStart, { passive: true });
		container.addEventListener("touchmove", handleTouchMove, { passive: false });
		container.addEventListener("touchend", handleTouchEnd, { passive: false });

		return () => {
			container.removeEventListener("touchstart", handleTouchStart);
			container.removeEventListener("touchmove", handleTouchMove);
			container.removeEventListener("touchend", handleTouchEnd);
		};
	}, []);

	const onResize = useEffectEvent(() => {
		const rect = containerRef.current?.getBoundingClientRect() ?? null;
		setPosition((prev) => clampPosition(prev, scale, rect));
	});

	const isZoomedForResize = scale > config.minScale;
	useEffect(() => {
		if (!isZoomedForResize) return;

		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [isZoomedForResize]);

	// Haptic on zoom toggle (enter / exit zoom state) — not on every pinch frame
	const previousZoomedRef = useRef(isZoomed);
	// Assertive SR announcement fired once on zoom entry (cleared after 2s)
	const [zoomEntryHint, setZoomEntryHint] = useState(false);
	useEffect(() => {
		if (previousZoomedRef.current === isZoomed) return;
		haptic("selection");
		previousZoomedRef.current = isZoomed;
		if (!isZoomed) return;
		// eslint-disable-next-line react-hooks/set-state-in-effect -- transient SR hint tied to zoom state transition
		setZoomEntryHint(true);
		const timer = setTimeout(() => setZoomEntryHint(false), 2000);
		return () => clearTimeout(timer);
	}, [isZoomed, haptic]);

	const transitionClass = prefersReduced ? "" : "transition-transform duration-200 ease-out";

	// Dynamic ARIA label based on state
	const ariaLabel = isZoomed
		? `${alt}. Zoom ${Math.round(scale * 100)}%. Utilise les flèches pour déplacer, Échap pour réinitialiser.`
		: `${alt}. Double-tape ou appuie sur + pour zoomer. Entrée pour ouvrir en plein écran.`;

	// `data-no-ptr` : le pull-to-refresh écoute sur `window` en mode passif, donc le
	// `preventDefault()` de ce conteneur ne l'empêche PAS d'accumuler sa distance de
	// tirage. Un pan vers le bas sur une image zoomée, page en haut de scroll, le
	// déclenchait par-dessus le geste de déplacement.
	// tabIndex 0 : le libellé annonce des raccourcis (+/−/flèches/Échap) — à -1,
	// ils étaient inatteignables au clavier pur (le conteneur n'était focusé que
	// programmatiquement au touchend), et sous `md` la loupe `GalleryZoomButton`
	// n'existe pas comme chemin de secours.
	/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- false positive : role="application" est interactif per WAI-ARIA, la règle ne le reconnaît pas (disable de BLOC : la règle pointe l'attribut, hors de portée d'un disable-next-line) */
	return (
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- false positive: role="application" is interactive per WAI-ARIA spec
		<div
			tabIndex={0}
			ref={containerRef}
			role="application"
			aria-label={ariaLabel}
			aria-roledescription="Image zoomable"
			onKeyDown={handleKeyDown}
			className={cn(
				"group relative h-full w-full overflow-hidden",
				"outline-none",
				"focus-visible:ring-primary focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2",
				"transition-transform active:scale-[0.99]", // Touch feedback
				isZoomed ? "cursor-grab" : "cursor-zoom-in",
			)}
			// touch-action UNIQUE (le doublon classe + style inline divergeait déjà)
			// et `pan-y` au repos plutôt que `manipulation` : `manipulation` AUTORISE
			// le pinch-zoom natif de la page, qui raçait notre geste maison — `pan-y`
			// laisse le scroll vertical au navigateur et nous garantit le pinch (le
			// touchmove reste annulable).
			style={{ touchAction: isZoomed ? "none" : "pan-y" }}
			data-no-ptr
		>
			{/* Transformable image container */}
			<div
				className={cn(
					"relative h-full w-full",
					"group-active:will-change-transform",
					transitionClass, // Always applied for smooth double-tap
				)}
				style={{
					transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
					transformOrigin: "center center",
				}}
			>
				<Image
					src={src}
					alt="" // Empty alt since managed by the parent container
					fill
					className="pointer-events-none object-cover select-none"
					style={viewTransitionName ? { viewTransitionName } : undefined}
					preload={preload}
					fetchPriority={preload ? "high" : undefined}
					quality={MAIN_IMAGE_QUALITY}
					sizes={GALLERY_MAIN_SIZES}
					placeholder={blurDataUrl ? "blur" : "empty"}
					blurDataURL={blurDataUrl}
					draggable={false}
				/>
			</div>

			{/* Visual zoom indicator */}
			{isZoomed && (
				<div
					className={cn(
						"absolute top-3 right-3 z-10",
						"bg-black/60 text-white backdrop-blur-sm",
						"rounded-full px-2.5 py-1 text-xs font-medium tabular-nums",
						"pointer-events-none select-none",
						!prefersReduced && "animate-in fade-in duration-200",
					)}
					aria-hidden="true"
				>
					{Math.round(scale * 100)}%
				</div>
			)}

			{/* Screen reader announcement (WCAG 4.1.3) */}
			{isZoomed && (
				<div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
					Zoom {Math.round(scale * 100)} pourcent
				</div>
			)}

			{/* Zoom entry hint — assertive, fired once on enter */}
			{zoomEntryHint && (
				<div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
					Zoom activé. Appuie sur Échap pour revenir.
				</div>
			)}

			{/* Focus instructions (mobile/desktop) */}
			<div
				className={cn(
					"absolute bottom-3 left-1/2 z-10 -translate-x-1/2",
					"bg-black/60 text-white backdrop-blur-sm",
					"rounded-full px-3 py-1.5 text-xs font-medium",
					"pointer-events-none select-none",
					"opacity-0 focus-within:opacity-100",
					"hidden sm:block", // Only visible on keyboard focus (desktop)
					!prefersReduced && "transition-opacity duration-200",
				)}
				aria-hidden="true"
			>
				+/- zoomer • Flèches déplacer • Échap réinitialiser
			</div>
		</div>
	);
}
/* eslint-enable jsx-a11y/no-noninteractive-tabindex */
