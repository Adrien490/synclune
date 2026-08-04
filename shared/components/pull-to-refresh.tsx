"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ssr";
import { useReducedMotion } from "motion/react";

import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useOverlayStackStore } from "@/shared/stores/use-overlay-stack-store";
import { cn } from "@/shared/utils/cn";

/** Pixels to pull before the refresh triggers */
const TRIGGER_DISTANCE = 70;
/** Maximum drag distance (px) — beyond this, resistance kicks in */
const MAX_DISTANCE = 120;
/** Vertical scroll position (px) below which the gesture arms */
const ARM_SCROLL_THRESHOLD = 4;
/** Max time (ms) PTR waits for page-level refresh handlers that registered via `waitFor` */
const PAGE_HANDLER_TIMEOUT = 1500;

/**
 * Event dispatched on `window` when the gesture fires.
 *
 * **Pourquoi cette API existe** : `router.refresh()` re-rend l'arbre RSC mais ne
 * purge PAS les entrées `use cache`. Sans handler de page, le geste rendait donc
 * les mêmes données — un placebo. Une page qui veut un vrai rafraîchissement
 * s'abonne et fait passer sa propre invalidation (`updateTag` côté Server Action)
 * via `detail.waitFor(promise)` ; PTR l'attend avant son `router.refresh()`.
 *
 * Préférer le hook `usePullToRefreshHandler` à un `addEventListener` manuel.
 */
export const PULL_TO_REFRESH_EVENT = "app:pull-to-refresh" as const;

export interface PullToRefreshEventDetail {
	waitFor: (promise: Promise<unknown>) => void;
}

/**
 * Native-feel pull-to-refresh indicator for touch devices.
 *
 * - Only activates when the page is at scrollY ≈ 0 (no conflict with content scroll)
 * - **Désarmé quand un overlay est ouvert** (Sheet/Drawer Vaul via le store
 *   `overlay-stack`) ou sous un sous-arbre marqué `data-no-ptr` : ces surfaces sont
 *   en `position: fixed`, donc `window.scrollY` y reste 0 et le geste s'armait
 *   *derrière* elles (drag vers le bas dans un panier ouvert → refresh de la page).
 * - Triggers page handlers (`PULL_TO_REFRESH_EVENT`) then `router.refresh()`
 * - **Une seule** vibration, au franchissement du seuil (le « relâche pour
 *   rafraîchir » iOS). Le spinner communique la suite visuellement.
 * - Disabled for reduced-motion users (keeps functional but skips rubber-band animation)
 * - Dormant on non-touch devices (desktop users have browser reload)
 *
 * Monté sur les layouts admin + espace client — pas sur le storefront, dont le
 * contenu est servi depuis des caches longs (`catalog` 15 min, `reference` 24 h)
 * qu'un refresh ne renouvelle pas.
 */
export function PullToRefresh() {
	const router = useRouter();
	const isTouch = useIsTouchDevice();
	const prefersReducedMotion = useReducedMotion();

	const [pullDistance, setPullDistance] = useState(0);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [hasReachedThreshold, setHasReachedThreshold] = useState(false);

	const startYRef = useRef<number | null>(null);
	const isTrackingRef = useRef(false);
	// `pullDistance` / `isRefreshing` sont lus dans `handleTouchEnd` via des refs et
	// NON via la closure : les avoir en dépendances de l'effet réenregistrait les 4
	// listeners `window` à chaque frame de `touchmove` (un re-render par pixel).
	const pullDistanceRef = useRef(0);
	const isRefreshingRef = useRef(false);

	useEffect(() => {
		if (!isTouch) return;
		if (typeof window === "undefined") return;

		function handleTouchStart(e: TouchEvent) {
			// Un Sheet/Drawer ouvert verrouille le scroll du body : `window.scrollY`
			// vaut 0 alors que l'utilisateur manipule l'overlay, pas la page.
			if (useOverlayStackStore.getState().count > 0) return;
			if (e.target instanceof Element && e.target.closest("[data-no-ptr]")) return;
			// Only arm when user starts pulling from the very top
			if (window.scrollY > ARM_SCROLL_THRESHOLD) return;
			const touch = e.touches[0];
			if (!touch) return;
			startYRef.current = touch.clientY;
			isTrackingRef.current = true;
		}

		function setPull(next: number) {
			pullDistanceRef.current = next;
			setPullDistance(next);
		}

		function handleTouchMove(e: TouchEvent) {
			if (!isTrackingRef.current || startYRef.current == null) return;
			if (window.scrollY > ARM_SCROLL_THRESHOLD) {
				isTrackingRef.current = false;
				setPull(0);
				return;
			}
			const touch = e.touches[0];
			if (!touch) return;
			const delta = touch.clientY - startYRef.current;
			if (delta <= 0) {
				setPull(0);
				return;
			}
			// Resistance curve: delta up to MAX_DISTANCE, sqrt easing beyond
			const eased =
				delta < MAX_DISTANCE ? delta : MAX_DISTANCE + Math.sqrt(delta - MAX_DISTANCE) * 4;
			setPull(eased);

			const reached = eased >= TRIGGER_DISTANCE;
			setHasReachedThreshold((prev) => {
				// Tick unique au franchissement du seuil — l'instant où le geste devient
				// « validé si tu relâches ». Ni au relâchement, ni à la fin du refresh :
				// c'étaient 3 vibrations pour un seul tirage.
				if (reached && !prev) triggerHaptic("medium");
				return reached;
			});
		}

		function handleTouchEnd() {
			if (!isTrackingRef.current) return;
			isTrackingRef.current = false;
			startYRef.current = null;
			const wasOverThreshold = pullDistanceRef.current >= TRIGGER_DISTANCE;
			setPull(0);
			setHasReachedThreshold(false);
			if (!wasOverThreshold || isRefreshingRef.current) return;

			isRefreshingRef.current = true;
			setIsRefreshing(true);
			// Give the spinner a minimum 400ms visual presence — feels intentional
			const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 400));

			// `dispatchEvent` est synchrone : tous les listeners ont donc déjà appelé
			// `waitFor` quand on inspecte `pending`. Sans aucun handler, on n'attend
			// rien — l'ancienne implémentation brûlait les 1500ms du timeout à CHAQUE
			// tirage, y compris quand personne n'écoutait.
			const pending: Promise<unknown>[] = [];
			window.dispatchEvent(
				new CustomEvent<PullToRefreshEventDetail>(PULL_TO_REFRESH_EVENT, {
					detail: { waitFor: (promise) => pending.push(promise) },
				}),
			);
			const pageHandlers = pending.length
				? Promise.race([
						Promise.allSettled(pending).then(() => undefined),
						new Promise<void>((resolve) => setTimeout(resolve, PAGE_HANDLER_TIMEOUT)),
					])
				: Promise.resolve();

			void Promise.all([minDelay, pageHandlers])
				.then(() => router.refresh())
				.finally(() => {
					setTimeout(() => {
						isRefreshingRef.current = false;
						setIsRefreshing(false);
					}, 200);
				});
		}

		window.addEventListener("touchstart", handleTouchStart, { passive: true });
		window.addEventListener("touchmove", handleTouchMove, { passive: true });
		window.addEventListener("touchend", handleTouchEnd, { passive: true });
		window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

		return () => {
			window.removeEventListener("touchstart", handleTouchStart);
			window.removeEventListener("touchmove", handleTouchMove);
			window.removeEventListener("touchend", handleTouchEnd);
			window.removeEventListener("touchcancel", handleTouchEnd);
		};
	}, [isTouch, router]);

	if (!isTouch) return null;

	const isVisible = pullDistance > 0 || isRefreshing;
	const translateY = isRefreshing ? 40 : Math.min(pullDistance * 0.55, 60);
	const progress = Math.min(pullDistance / TRIGGER_DISTANCE, 1);

	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(
				"pointer-events-none fixed top-[env(safe-area-inset-top,0)] left-1/2 z-50 -translate-x-1/2",
				"flex items-center justify-center",
				isVisible ? "opacity-100" : "opacity-0",
			)}
			style={{
				transform: `translate3d(-50%, ${translateY}px, 0)`,
				transition: prefersReducedMotion
					? "opacity var(--duration-fast) ease"
					: "transform var(--duration-normal) var(--ease-smooth-out), opacity var(--duration-fast) ease",
			}}
		>
			<div
				className={cn(
					"bg-background/95 border-border/60 flex size-10 items-center justify-center rounded-full border shadow-lg backdrop-blur-md",
					hasReachedThreshold && !isRefreshing && "border-primary/60",
				)}
			>
				<ArrowsClockwiseIcon
					className={cn(
						"size-4 transition-colors",
						hasReachedThreshold ? "text-primary" : "text-muted-foreground",
						isRefreshing && !prefersReducedMotion && "motion-safe:animate-spin",
					)}
					style={
						!isRefreshing && !prefersReducedMotion
							? { transform: `rotate(${progress * 270}deg)`, transition: "transform 80ms linear" }
							: undefined
					}
					aria-hidden="true"
				/>
			</div>
			{isRefreshing && <span className="sr-only">Actualisation de la page en cours</span>}
		</div>
	);
}
