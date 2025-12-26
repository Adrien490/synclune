"use client";

import { useState, useRef, useEffect, useEffectEvent, type RefObject } from "react";
import { getDistance, getCenter, clampPosition, getZoomToPointPosition, type Point } from "@/modules/media/utils/touch-geometry";
import { PINCH_ZOOM_CONFIG } from "@/modules/media/constants/gallery.constants";

export interface UsePinchZoomOptions {
	containerRef: RefObject<HTMLDivElement | null>;
	isActive: boolean;
	onTap?: () => void;
	config?: Partial<typeof PINCH_ZOOM_CONFIG>;
}

export interface UsePinchZoomReturn {
	scale: number;
	position: Point;
	isZoomed: boolean;
	isInteracting: boolean;
	reset: () => void;
	zoomIn: () => void;
	zoomOut: () => void;
	handleKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * Hook pour gérer le pinch-to-zoom sur mobile
 * - Pinch pour zoomer (1x → 3x)
 * - Double-tap pour toggle zoom
 * - Pan quand zoomé
 * - Support clavier complet
 */
export function usePinchZoom({
	containerRef,
	isActive,
	onTap,
	config: configOverride,
}: UsePinchZoomOptions): UsePinchZoomReturn {
	const config = { ...PINCH_ZOOM_CONFIG, ...configOverride };

	// États réactifs (déclenchent re-render)
	const [scale, setScale] = useState(config.MIN_SCALE);
	const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
	const [isInteracting, setIsInteracting] = useState(false);

	// Refs pour tracking touch (pas de re-render)
	const initialDistance = useRef(0);
	const initialScale = useRef(config.MIN_SCALE);
	const initialPosition = useRef<Point>({ x: 0, y: 0 });
	const lastTouchCenter = useRef<Point>({ x: 0, y: 0 });
	const lastTapTime = useRef(0);
	const isPinching = useRef(false);
	const isPanning = useRef(false);
	const hasMoved = useRef(false);
	const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	const isZoomed = scale > config.MIN_SCALE;

	// Reset au changement de slide
	useEffect(() => {
		if (!isActive) {
			setScale(config.MIN_SCALE);
			setPosition({ x: 0, y: 0 });
			setIsInteracting(false);
		}
	}, [isActive, config.MIN_SCALE]);

	// Cleanup timeout
	useEffect(() => {
		return () => {
			if (tapTimeout.current) {
				clearTimeout(tapTimeout.current);
			}
		};
	}, []);

	const reset = () => {
		setScale(config.MIN_SCALE);
		setPosition({ x: 0, y: 0 });
	};

	const zoomIn = () => {
		const newScale = Math.min(config.MAX_SCALE, scale + config.KEYBOARD_ZOOM_STEP);
		setScale(newScale);
		setPosition(clampPosition(position, newScale, containerRef.current?.getBoundingClientRect() ?? null));
	};

	const zoomOut = () => {
		const newScale = Math.max(config.MIN_SCALE, scale - config.KEYBOARD_ZOOM_STEP);
		setScale(newScale);
		if (newScale === config.MIN_SCALE) {
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
						{ x: position.x + config.KEYBOARD_PAN_STEP, y: position.y },
						scale,
						rect
					));
				}
				break;

			case "ArrowRight":
				if (isZoomed) {
					e.preventDefault();
					setPosition(clampPosition(
						{ x: position.x - config.KEYBOARD_PAN_STEP, y: position.y },
						scale,
						rect
					));
				}
				break;

			case "ArrowUp":
				if (isZoomed) {
					e.preventDefault();
					setPosition(clampPosition(
						{ x: position.x, y: position.y + config.KEYBOARD_PAN_STEP },
						scale,
						rect
					));
				}
				break;

			case "ArrowDown":
				if (isZoomed) {
					e.preventDefault();
					setPosition(clampPosition(
						{ x: position.x, y: position.y - config.KEYBOARD_PAN_STEP },
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

	// Touch Start
	const handleTouchStart = useEffectEvent((e: TouchEvent) => {
		hasMoved.current = false;
		setIsInteracting(true);

		if (e.touches.length === 2) {
			// Pinch start
			isPinching.current = true;
			isPanning.current = false;
			initialDistance.current = getDistance(e.touches);
			initialScale.current = scale;
			lastTouchCenter.current = getCenter(e.touches);
			initialPosition.current = { ...position };
		} else if (e.touches.length === 1) {
			if (isZoomed) {
				// Pan start
				isPanning.current = true;
				lastTouchCenter.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
				initialPosition.current = { ...position };
			}
		}
	});

	// Touch Move
	const handleTouchMove = useEffectEvent((e: TouchEvent) => {
		const rect = containerRef.current?.getBoundingClientRect() ?? null;

		if (e.touches.length === 2 && isPinching.current) {
			// Pinch zoom
			e.preventDefault();
			hasMoved.current = true;

			const newDistance = getDistance(e.touches);
			const ratio = newDistance / initialDistance.current;
			const newScale = Math.min(config.MAX_SCALE, Math.max(config.MIN_SCALE, initialScale.current * ratio));

			const center = getCenter(e.touches);
			const deltaX = center.x - lastTouchCenter.current.x;
			const deltaY = center.y - lastTouchCenter.current.y;

			const newPosition = clampPosition(
				{
					x: initialPosition.current.x + deltaX,
					y: initialPosition.current.y + deltaY,
				},
				newScale,
				rect
			);

			setScale(newScale);
			setPosition(newPosition);
		} else if (e.touches.length === 1 && isPanning.current && isZoomed) {
			// Pan
			e.preventDefault();
			hasMoved.current = true;

			const touch = e.touches[0];
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
		}
	});

	// Touch End
	const handleTouchEnd = useEffectEvent((e: TouchEvent) => {
		const wasPinching = isPinching.current;
		const wasPanning = isPanning.current;

		isPinching.current = false;
		isPanning.current = false;
		setIsInteracting(false);

		// Reset si scale < min
		if (scale < config.MIN_SCALE) {
			setScale(config.MIN_SCALE);
			setPosition({ x: 0, y: 0 });
			return;
		}

		// Reset position si scale = min
		if (scale === config.MIN_SCALE) {
			setPosition({ x: 0, y: 0 });
		}

		// Détection double-tap
		if (e.touches.length === 0 && !wasPinching && !hasMoved.current) {
			const now = Date.now();
			const timeSinceLastTap = now - lastTapTime.current;

			if (timeSinceLastTap < config.DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
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
							config.DOUBLE_TAP_SCALE
						);
						setScale(config.DOUBLE_TAP_SCALE);
						setPosition(newPosition);
					} else {
						setScale(config.DOUBLE_TAP_SCALE);
					}
				}
			} else {
				lastTapTime.current = now;

				// Single tap après délai → ouvre lightbox
				if (!isZoomed && !wasPanning) {
					tapTimeout.current = setTimeout(() => {
						if (Date.now() - lastTapTime.current >= config.DOUBLE_TAP_DELAY) {
							onTap?.();
						}
					}, config.DOUBLE_TAP_DELAY);
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
