"use client";

import { useState, useRef, useEffect, useEffectEvent, type RefObject } from "react";
import { getDistance, getCenter, clampPosition, getZoomToPointPosition, type Point } from "@/shared/utils/touch-geometry";

// ============================================
// TYPES
// ============================================

export interface PinchZoomConfig {
	/** Échelle minimum (défaut: 1) */
	minScale: number;
	/** Échelle maximum (défaut: 3) */
	maxScale: number;
	/** Échelle appliquée au double-tap (défaut: 2) */
	doubleTapScale: number;
	/** Délai pour détecter un double-tap en ms (défaut: 300) */
	doubleTapDelay: number;
	/** Incrément de zoom au clavier (défaut: 0.5) */
	keyboardZoomStep: number;
	/** Incrément de pan au clavier en px (défaut: 50) */
	keyboardPanStep: number;
	/** Distance minimale en px avant d'invalider un double-tap (défaut: 10) */
	moveThreshold: number;
}

export interface UsePinchZoomOptions {
	/** Ref du container DOM */
	containerRef: RefObject<HTMLDivElement | null>;
	/** Si true, le zoom est actif (reset automatique si false) */
	isActive?: boolean;
	/** Callback appelé sur tap simple (ex: ouvrir lightbox) */
	onTap?: () => void;
	/** Configuration personnalisée */
	config?: Partial<PinchZoomConfig>;
}

export interface UsePinchZoomReturn {
	/** Niveau de zoom actuel */
	scale: number;
	/** Position de pan actuelle */
	position: Point;
	/** true si zoomé (scale > minScale) */
	isZoomed: boolean;
	/** true si l'utilisateur interagit (pinch/pan en cours) */
	isInteracting: boolean;
	/** Réinitialiser zoom et position */
	reset: () => void;
	/** Zoomer d'un pas */
	zoomIn: () => void;
	/** Dézoomer d'un pas */
	zoomOut: () => void;
	/** Handler clavier à attacher au container */
	handleKeyDown: (e: React.KeyboardEvent) => void;
}

// ============================================
// DEFAULTS
// ============================================

const DEFAULT_CONFIG: PinchZoomConfig = {
	minScale: 1,
	maxScale: 3,
	doubleTapScale: 2,
	doubleTapDelay: 300,
	keyboardZoomStep: 0.5,
	keyboardPanStep: 50,
	moveThreshold: 10,
};

// ============================================
// HOOK
// ============================================

/**
 * Hook réutilisable pour pinch-to-zoom sur mobile et desktop
 *
 * Fonctionnalités:
 * - Pinch pour zoomer
 * - Double-tap pour toggle zoom
 * - Pan quand zoomé
 * - Support clavier complet (+/-/flèches/Escape)
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { scale, position, isZoomed, handleKeyDown } = usePinchZoom({
 *   containerRef,
 *   onTap: () => openLightbox(),
 * });
 * ```
 */
export function usePinchZoom({
	containerRef,
	isActive = true,
	onTap,
	config: configOverride,
}: UsePinchZoomOptions): UsePinchZoomReturn {
	const config = { ...DEFAULT_CONFIG, ...configOverride };

	// États réactifs (déclenchent re-render)
	const [scale, setScale] = useState<number>(config.minScale);
	const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
	const [isInteracting, setIsInteracting] = useState(false);

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

	const isZoomed = scale > config.minScale;

	// Reset au changement de slide/désactivation
	useEffect(() => {
		if (!isActive) {
			setScale(config.minScale);
			setPosition({ x: 0, y: 0 });
			setIsInteracting(false);
		}
	}, [isActive, config.minScale]);

	// Cleanup timeout
	useEffect(() => {
		return () => {
			if (tapTimeout.current) {
				clearTimeout(tapTimeout.current);
			}
		};
	}, []);

	const reset = () => {
		setScale(config.minScale);
		setPosition({ x: 0, y: 0 });
	};

	const zoomIn = () => {
		const newScale = Math.min(config.maxScale, scale + config.keyboardZoomStep);
		setScale(newScale);
		setPosition(clampPosition(position, newScale, containerRef.current?.getBoundingClientRect() ?? null));
	};

	const zoomOut = () => {
		const newScale = Math.max(config.minScale, scale - config.keyboardZoomStep);
		setScale(newScale);
		if (newScale === config.minScale) {
			setPosition({ x: 0, y: 0 });
		} else {
			setPosition(clampPosition(position, newScale, containerRef.current?.getBoundingClientRect() ?? null));
		}
	};

	// Keyboard handler
	const handleKeyDown = (e: React.KeyboardEvent) => {
		const rect = containerRef.current?.getBoundingClientRect() ?? null;

		switch (e.key) {
			case "+":
			case "=":
			case "*": // Numpad
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
					setPosition(clampPosition(
						{ x: position.x + config.keyboardPanStep, y: position.y },
						scale,
						rect
					));
				}
				break;

			case "ArrowRight":
				if (isZoomed) {
					e.preventDefault();
					setPosition(clampPosition(
						{ x: position.x - config.keyboardPanStep, y: position.y },
						scale,
						rect
					));
				}
				break;

			case "ArrowUp":
				if (isZoomed) {
					e.preventDefault();
					setPosition(clampPosition(
						{ x: position.x, y: position.y + config.keyboardPanStep },
						scale,
						rect
					));
				}
				break;

			case "ArrowDown":
				if (isZoomed) {
					e.preventDefault();
					setPosition(clampPosition(
						{ x: position.x, y: position.y - config.keyboardPanStep },
						scale,
						rect
					));
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
	};

	// Début du toucher
	const handleTouchStart = useEffectEvent((e: TouchEvent) => {
		hasMoved.current = false;
		setIsInteracting(true);

		if (e.touches.length === 2) {
			// Début du pinch
			isPinching.current = true;
			isPanning.current = false;
			initialDistance.current = getDistance(e.touches);
			initialScale.current = scale;
			const center = getCenter(e.touches);
			lastTouchCenter.current = center;
			startTouchCenter.current = center;
			initialPosition.current = { ...position };
		} else if (e.touches.length === 1) {
			const touchPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
			startTouchCenter.current = touchPoint;
			if (isZoomed) {
				// Début du pan
				isPanning.current = true;
				lastTouchCenter.current = touchPoint;
				initialPosition.current = { ...position };
			}
		}
	});

	// Mouvement tactile
	const handleTouchMove = useEffectEvent((e: TouchEvent) => {
		const rect = containerRef.current?.getBoundingClientRect() ?? null;

		if (e.touches.length === 2 && isPinching.current) {
			// Zoom par pinch
			e.preventDefault();

			const center = getCenter(e.touches);
			if (!rect) return;

			// Calculer la distance totale depuis le début du geste
			const totalDistance = Math.hypot(
				center.x - startTouchCenter.current.x,
				center.y - startTouchCenter.current.y
			);

			// Ne marquer comme "moved" que si la distance dépasse le threshold
			if (totalDistance > config.moveThreshold) {
				hasMoved.current = true;
			}

			const newDistance = getDistance(e.touches);
			const ratio = newDistance / initialDistance.current;
			const newScale = Math.min(config.maxScale, Math.max(config.minScale, initialScale.current * ratio));

			// Point focal en coordonnées relatives au centre du container
			const focalX = center.x - rect.left - rect.width / 2;
			const focalY = center.y - rect.top - rect.height / 2;

			// Position qui maintient le point focal fixe pendant le zoom
			// Formule: newPos = focal - (focal - oldPos) * (newScale / oldScale)
			const scaleRatio = scale > 0 ? newScale / scale : 1;
			const newPosition = clampPosition(
				{
					x: focalX - (focalX - position.x) * scaleRatio,
					y: focalY - (focalY - position.y) * scaleRatio,
				},
				newScale,
				rect
			);

			setScale(newScale);
			setPosition(newPosition);
		} else if (e.touches.length === 1 && isPanning.current && isZoomed) {
			// Déplacement
			e.preventDefault();

			const touch = e.touches[0];
			// Calculer la distance totale depuis le début du geste
			const totalDistance = Math.hypot(
				touch.clientX - startTouchCenter.current.x,
				touch.clientY - startTouchCenter.current.y
			);

			// Ne marquer comme "moved" que si la distance dépasse le threshold
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
				scale,
				rect
			);

			setPosition(newPosition);
		} else if (e.touches.length === 1 && !isZoomed) {
			// Tracking du mouvement pour single tap (non zoomé)
			const touch = e.touches[0];
			const totalDistance = Math.hypot(
				touch.clientX - startTouchCenter.current.x,
				touch.clientY - startTouchCenter.current.y
			);

			if (totalDistance > config.moveThreshold) {
				hasMoved.current = true;
			}
		}
	});

	// Fin du toucher
	const handleTouchEnd = useEffectEvent((e: TouchEvent) => {
		const wasPinching = isPinching.current;
		const wasPanning = isPanning.current;

		isPinching.current = false;
		isPanning.current = false;
		setIsInteracting(false);

		// Restaurer le focus pour les utilisateurs clavier/voix (accessibilité)
		if (containerRef.current && e.touches.length === 0) {
			containerRef.current.focus();
		}

		// Reset si scale < min
		if (scale < config.minScale) {
			setScale(config.minScale);
			setPosition({ x: 0, y: 0 });
			return;
		}

		// Reset position si scale = min
		if (scale === config.minScale) {
			setPosition({ x: 0, y: 0 });
		}

		// Détection double-tap
		if (e.touches.length === 0 && !wasPinching && !hasMoved.current) {
			const now = Date.now();
			const timeSinceLastTap = now - lastTapTime.current;

			if (timeSinceLastTap < config.doubleTapDelay && timeSinceLastTap > 0) {
				// Double-tap détecté
				e.preventDefault();
				lastTapTime.current = 0;

				if (tapTimeout.current) {
					clearTimeout(tapTimeout.current);
					tapTimeout.current = null;
				}

				if (isZoomed) {
					reset();
				} else {
					// Zoom vers le point tapé
					const touch = e.changedTouches[0];
					const rect = containerRef.current?.getBoundingClientRect();

					if (touch && rect) {
						const newPosition = getZoomToPointPosition(
							{ x: touch.clientX, y: touch.clientY },
							rect,
							config.doubleTapScale
						);
						setScale(config.doubleTapScale);
						setPosition(newPosition);
					} else {
						setScale(config.doubleTapScale);
					}
				}
			} else {
				lastTapTime.current = now;

				// Single tap après délai → callback onTap
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

	// Attacher les event listeners
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const options: AddEventListenerOptions = { passive: false };

		container.addEventListener("touchstart", handleTouchStart, options);
		container.addEventListener("touchmove", handleTouchMove, options);
		container.addEventListener("touchend", handleTouchEnd, options);

		return () => {
			container.removeEventListener("touchstart", handleTouchStart);
			container.removeEventListener("touchmove", handleTouchMove);
			container.removeEventListener("touchend", handleTouchEnd);
		};
	}, [handleTouchStart, handleTouchMove, handleTouchEnd]);

	// Effect Event: reads scale without re-attaching the resize listener on every scale change
	const onResize = useEffectEvent(() => {
		const rect = containerRef.current?.getBoundingClientRect() ?? null;
		setPosition((prev) => clampPosition(prev, scale, rect));
	});

	// Reclamper la position lors d'un changement de taille (orientation, resize)
	const isZoomedForResize = scale > config.minScale;
	useEffect(() => {
		if (!isZoomedForResize) return;

		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [isZoomedForResize]);

	return {
		scale,
		position,
		isZoomed,
		isInteracting,
		reset,
		zoomIn,
		zoomOut,
		handleKeyDown,
	};
}
