"use client";

import { useEffect, useEffectEvent } from "react";

import { type Breakpoint, mediaAtLeast } from "@/shared/constants/breakpoints";

/** Horizontal distance (px) that fully arms the swipe; also the trigger threshold. */
const SWIPE_THRESHOLD_PX = 30;

/**
 * Largeur (px) de la bande de bord dans laquelle un `touchstart` arme le geste.
 * Volontairement en px et non en rem : c'est une cible de pouce physique, pas un
 * seuil de mise en page — elle ne doit pas suivre la police racine (contraster
 * avec `disabledFrom`, qui est bien un breakpoint).
 */
const EDGE_ZONE_PX = 20;

interface UseEdgeSwipeOptions {
	/** Bord déclencheur (mobile-native). @default "left" */
	side?: "left" | "right";
	/**
	 * Breakpoint à partir duquel le geste est **désactivé** (nav desktop
	 * disponible). Nom de breakpoint et non largeur en px : un seuil px se
	 * désynchronise des variants Tailwind dès que la police racine change — le
	 * geste resterait armé sur une largeur où le menu desktop est déjà là, ou
	 * l'inverse. Cf. `shared/constants/breakpoints.ts`.
	 *
	 * @default "lg"
	 */
	disabledFrom?: Breakpoint;
	/**
	 * Callback fired during the drag with a 0–1 value (|dx| / threshold).
	 * Called with 0 when the gesture is cancelled or completed. Lets callers
	 * render a rubber-band preview (cf. EdgeSwipeIndicator).
	 */
	onProgress?: (progress: number) => void;
}

/**
 * Detect swipe-from-edge to trigger an action (mobile native UX pattern).
 *
 * - `side: "left"` (default) : swipe from left edge → trigger (drawer/menu open).
 * - `side: "right"` : swipe from right edge vers la gauche → trigger
 *   (utile pour exit gestures, ex: sortir du mode sélection).
 *
 * @param onTrigger - Callback when a valid edge swipe is detected
 * @param isActive - When `true`, the hook is **disabled** (gesture skipped) —
 *                   typique pour "skip when target already open" ou "skip hors mode".
 *                   Note : sémantique invariante des deux côtés (active = disabled).
 * @param options   - side / disabledFrom / onProgress
 */
export function useEdgeSwipe(
	onTrigger: () => void,
	active: boolean,
	options: UseEdgeSwipeOptions = {},
) {
	const { side = "left", disabledFrom = "lg", onProgress } = options;

	const onTriggerStable = useEffectEvent(onTrigger);
	const onProgressStable = useEffectEvent((progress: number) => {
		onProgress?.(progress);
	});

	useEffect(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
		// WCAG 2.3.3 — users who prefer reduced motion skip gesture-triggered animations
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const mql = window.matchMedia(mediaAtLeast(disabledFrom));

		let startX = 0;
		let startY = 0;
		let tracking = false;
		let lastProgress = 0;

		function emitProgress(progress: number) {
			if (progress === lastProgress) return;
			lastProgress = progress;
			onProgressStable(progress);
		}

		function onTouchStart(e: TouchEvent) {
			if (active || mql.matches) return;
			// Le hook écoute au niveau `document` et ignorait la cible : un drag amorcé
			// dans les 20px du bord gauche faisait défiler le carousel/la table qui
			// touche ce bord ET ouvrait le menu. Les conteneurs à défilement horizontal
			// se retirent du geste via `data-no-edge-swipe`.
			if (e.target instanceof Element && e.target.closest("[data-no-edge-swipe]")) return;
			const touch = e.touches[0];
			if (!touch) return;
			const winWidth = window.innerWidth;
			const startsAtEdge =
				side === "left" ? touch.clientX <= EDGE_ZONE_PX : touch.clientX >= winWidth - EDGE_ZONE_PX;
			if (startsAtEdge) {
				startX = touch.clientX;
				startY = touch.clientY;
				tracking = true;
			}
		}

		function onTouchMove(e: TouchEvent) {
			if (!tracking) return;
			const touch = e.touches[0];
			if (!touch) return;
			// Progress direction : left → dx positif ; right → dx négatif (vers la gauche)
			const rawDx = touch.clientX - startX;
			const dx = side === "left" ? rawDx : -rawDx;
			const dy = Math.abs(touch.clientY - startY);

			// Cancel if vertical movement dominates (user is scrolling)
			if (dy > dx) {
				tracking = false;
				emitProgress(0);
				return;
			}

			emitProgress(Math.min(1, Math.max(0, dx / SWIPE_THRESHOLD_PX)));

			// Trigger when horizontal swipe exceeds threshold (snappy native feel).
			if (dx > SWIPE_THRESHOLD_PX) {
				tracking = false;
				emitProgress(0);
				onTriggerStable();
			}
		}

		function onTouchEnd() {
			if (tracking) emitProgress(0);
			tracking = false;
		}

		document.addEventListener("touchstart", onTouchStart, { passive: true });
		document.addEventListener("touchmove", onTouchMove, { passive: true });
		document.addEventListener("touchend", onTouchEnd, { passive: true });
		document.addEventListener("touchcancel", onTouchEnd, { passive: true });

		return () => {
			document.removeEventListener("touchstart", onTouchStart);
			document.removeEventListener("touchmove", onTouchMove);
			document.removeEventListener("touchend", onTouchEnd);
			document.removeEventListener("touchcancel", onTouchEnd);
		};
	}, [active, disabledFrom, side]);
}
