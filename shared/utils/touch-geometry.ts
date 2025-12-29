/**
 * Utilitaires géométriques pour les gestes touch
 */

import type { Point } from "@/shared/types/utility.types"

export type { Point } from "@/shared/types/utility.types"

/**
 * Calcule la distance euclidienne entre 2 points touch
 */
export function getDistance(touches: TouchList): number {
	if (touches.length < 2) return 0;

	const t1 = touches[0];
	const t2 = touches[1];

	return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

/**
 * Calcule le point central entre 2 touches (ou retourne la position du touch unique)
 */
export function getCenter(touches: TouchList): Point {
	if (touches.length < 2) {
		return { x: touches[0].clientX, y: touches[0].clientY };
	}

	const t1 = touches[0];
	const t2 = touches[1];

	return {
		x: (t1.clientX + t2.clientX) / 2,
		y: (t1.clientY + t2.clientY) / 2,
	};
}

/**
 * Limite la position pour que l'image ne sorte pas de son container
 */
export function clampPosition(
	position: Point,
	scale: number,
	containerRect: DOMRect | null
): Point {
	if (!containerRect || scale <= 1) {
		return { x: 0, y: 0 };
	}

	const maxX = (containerRect.width * (scale - 1)) / 2;
	const maxY = (containerRect.height * (scale - 1)) / 2;

	return {
		x: Math.max(-maxX, Math.min(maxX, position.x)),
		y: Math.max(-maxY, Math.min(maxY, position.y)),
	};
}

/**
 * Calcule la position de zoom vers un point spécifique
 */
export function getZoomToPointPosition(
	tapPoint: Point,
	containerRect: DOMRect,
	targetScale: number
): Point {
	const tapX = tapPoint.x - containerRect.left - containerRect.width / 2;
	const tapY = tapPoint.y - containerRect.top - containerRect.height / 2;

	return clampPosition(
		{
			x: -tapX * (targetScale - 1),
			y: -tapY * (targetScale - 1),
		},
		targetScale,
		containerRect
	);
}
