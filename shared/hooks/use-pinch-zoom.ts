"use client";

import { useRef, useState, useEffect, useCallback, type RefObject, type KeyboardEvent } from "react";

interface PinchZoomConfig {
	minScale: number;
	maxScale: number;
	doubleTapScale: number;
	doubleTapDelay: number;
	keyboardZoomStep: number;
	keyboardPanStep: number;
	moveThreshold: number;
}

interface UsePinchZoomOptions {
	containerRef: RefObject<HTMLDivElement | null>;
	isActive: boolean;
	onTap?: () => void;
	config: PinchZoomConfig;
}

interface Position {
	x: number;
	y: number;
}

interface UsePinchZoomReturn {
	scale: number;
	position: Position;
	isZoomed: boolean;
	isInteracting: boolean;
	handleKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * Hook pour gerer le pinch-to-zoom sur mobile
 *
 * Fonctionnalites:
 * - Pinch pour zoomer (1x -> max)
 * - Double-tap pour toggle zoom / reset
 * - Pan quand zoome
 * - Support clavier complet
 */
export function usePinchZoom({
	containerRef,
	isActive,
	onTap,
	config,
}: UsePinchZoomOptions): UsePinchZoomReturn {
	const [scale, setScale] = useState(1);
	const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
	const [isInteracting, setIsInteracting] = useState(false);

	// Refs pour le tracking du geste
	const initialDistance = useRef(0);
	const initialScale = useRef(1);
	const lastTapTime = useRef(0);
	const startPosition = useRef<Position>({ x: 0, y: 0 });
	const lastPosition = useRef<Position>({ x: 0, y: 0 });
	const hasMoved = useRef(false);

	const isZoomed = scale > 1;

	// Reset quand l'element devient inactif
	useEffect(() => {
		if (!isActive) {
			setScale(1);
			setPosition({ x: 0, y: 0 });
		}
	}, [isActive]);

	// Calcule la distance entre deux points touch
	const getDistance = (touch1: Touch, touch2: Touch): number => {
		const dx = touch1.clientX - touch2.clientX;
		const dy = touch1.clientY - touch2.clientY;
		return Math.sqrt(dx * dx + dy * dy);
	};

	// Limite la position pour garder l'image visible
	const clampPosition = useCallback(
		(pos: Position, currentScale: number): Position => {
			if (currentScale <= 1) return { x: 0, y: 0 };

			const container = containerRef.current;
			if (!container) return pos;

			const rect = container.getBoundingClientRect();
			const maxOffset = (rect.width * (currentScale - 1)) / 2;

			return {
				x: Math.max(-maxOffset, Math.min(maxOffset, pos.x)),
				y: Math.max(-maxOffset, Math.min(maxOffset, pos.y)),
			};
		},
		[containerRef]
	);

	// Gestion du double-tap
	const handleDoubleTap = useCallback(() => {
		if (isZoomed) {
			// Reset zoom
			setScale(1);
			setPosition({ x: 0, y: 0 });
		} else {
			// Zoom a doubleTapScale
			setScale(config.doubleTapScale);
		}
	}, [isZoomed, config.doubleTapScale]);

	// Gestion du clavier
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
			switch (e.key) {
				case "+":
				case "=":
					e.preventDefault();
					setScale((s) => Math.min(config.maxScale, s + config.keyboardZoomStep));
					break;
				case "-":
					e.preventDefault();
					setScale((s) => {
						const newScale = Math.max(config.minScale, s - config.keyboardZoomStep);
						if (newScale <= 1) setPosition({ x: 0, y: 0 });
						return newScale;
					});
					break;
				case "ArrowLeft":
					if (isZoomed) {
						e.preventDefault();
						setPosition((p) =>
							clampPosition({ x: p.x + config.keyboardPanStep, y: p.y }, scale)
						);
					}
					break;
				case "ArrowRight":
					if (isZoomed) {
						e.preventDefault();
						setPosition((p) =>
							clampPosition({ x: p.x - config.keyboardPanStep, y: p.y }, scale)
						);
					}
					break;
				case "ArrowUp":
					if (isZoomed) {
						e.preventDefault();
						setPosition((p) =>
							clampPosition({ x: p.x, y: p.y + config.keyboardPanStep }, scale)
						);
					}
					break;
				case "ArrowDown":
					if (isZoomed) {
						e.preventDefault();
						setPosition((p) =>
							clampPosition({ x: p.x, y: p.y - config.keyboardPanStep }, scale)
						);
					}
					break;
				case "Escape":
					e.preventDefault();
					setScale(1);
					setPosition({ x: 0, y: 0 });
					break;
				case "Enter":
					e.preventDefault();
					if (!isZoomed && onTap) {
						onTap();
					}
					break;
			}
		},
		[isZoomed, scale, config, clampPosition, onTap]
	);

	// Setup des event listeners touch
	useEffect(() => {
		const container = containerRef.current;
		if (!container || !isActive) return;

		const handleTouchStart = (e: TouchEvent) => {
			setIsInteracting(true);
			hasMoved.current = false;

			if (e.touches.length === 2) {
				// Pinch start
				initialDistance.current = getDistance(e.touches[0], e.touches[1]);
				initialScale.current = scale;
			} else if (e.touches.length === 1) {
				// Pan ou tap start
				startPosition.current = {
					x: e.touches[0].clientX,
					y: e.touches[0].clientY,
				};
				lastPosition.current = position;
			}
		};

		const handleTouchMove = (e: TouchEvent) => {
			if (e.touches.length === 2) {
				// Pinch
				e.preventDefault();
				const currentDistance = getDistance(e.touches[0], e.touches[1]);
				const scaleFactor = currentDistance / initialDistance.current;
				const newScale = Math.min(
					config.maxScale,
					Math.max(config.minScale, initialScale.current * scaleFactor)
				);
				setScale(newScale);
				hasMoved.current = true;
			} else if (e.touches.length === 1 && isZoomed) {
				// Pan
				e.preventDefault();
				const deltaX = e.touches[0].clientX - startPosition.current.x;
				const deltaY = e.touches[0].clientY - startPosition.current.y;

				if (
					Math.abs(deltaX) > config.moveThreshold ||
					Math.abs(deltaY) > config.moveThreshold
				) {
					hasMoved.current = true;
				}

				const newPosition = clampPosition(
					{
						x: lastPosition.current.x + deltaX,
						y: lastPosition.current.y + deltaY,
					},
					scale
				);
				setPosition(newPosition);
			}
		};

		const handleTouchEnd = (e: TouchEvent) => {
			setIsInteracting(false);

			// Detection du tap/double-tap (seulement si pas de mouvement)
			if (e.touches.length === 0 && !hasMoved.current) {
				const now = Date.now();
				const timeSinceLastTap = now - lastTapTime.current;

				if (timeSinceLastTap < config.doubleTapDelay) {
					// Double tap
					handleDoubleTap();
					lastTapTime.current = 0;
				} else {
					// Single tap - attendre pour voir si double-tap
					lastTapTime.current = now;
					setTimeout(() => {
						if (lastTapTime.current === now && !isZoomed && onTap) {
							onTap();
						}
					}, config.doubleTapDelay);
				}
			}
		};

		container.addEventListener("touchstart", handleTouchStart, { passive: true });
		container.addEventListener("touchmove", handleTouchMove, { passive: false });
		container.addEventListener("touchend", handleTouchEnd, { passive: true });

		return () => {
			container.removeEventListener("touchstart", handleTouchStart);
			container.removeEventListener("touchmove", handleTouchMove);
			container.removeEventListener("touchend", handleTouchEnd);
		};
	}, [
		containerRef,
		isActive,
		isZoomed,
		scale,
		position,
		config,
		clampPosition,
		handleDoubleTap,
		onTap,
	]);

	return {
		scale,
		position,
		isZoomed,
		isInteracting,
		handleKeyDown,
	};
}
