"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition, type RefObject } from "react";

import { useHaptic } from "@/shared/hooks/use-haptic";

/** Dernier geste déclenché — pilote le spinner ciblé pendant `isPending`. */
export type CursorPaginationAction = "prev" | "next" | "reset" | "perPage";

interface UseCursorPaginationNavOptions {
	nextCursor: string | null;
	prevCursor: string | null;
	/**
	 * Prefetch des pages voisines. À désactiver sur une instance secondaire
	 * (les listes admin montent deux vues en permanence — sans ce gate, chaque
	 * page voisine était prefetchée deux fois).
	 */
	prefetch?: boolean;
	/** Reçoit le focus après un changement de page (ex. début de liste). */
	focusTargetRef?: RefObject<HTMLElement | null>;
}

/**
 * Mécanique de navigation par curseur (URL-driven) — partagée entre la barre
 * admin (`CursorPagination`) et la bande boutique (`StorefrontPaginationBand`).
 *
 * Porte : les `router.push` cursor/direction (tous en `{ scroll: false }`,
 * le scroll est géré ici), le scroll-to-top sur VRAI changement de curseur,
 * le prefetch des pages voisines et l'haptique (light = navigation,
 * selection = retour au début).
 */
export function useCursorPaginationNav({
	nextCursor,
	prevCursor,
	prefetch = true,
	focusTargetRef,
}: UseCursorPaginationNavOptions) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const haptic = useHaptic();
	const [isPending, startTransition] = useTransition();
	const [lastAction, setLastAction] = useState<CursorPaginationAction | null>(null);

	const cursor = searchParams.get("cursor") ?? undefined;

	// Initialisée à la valeur COURANTE du curseur (doit donc être déclarée APRÈS
	// `cursor`, sinon TDZ) : le premier rendu est un no-op, seuls les changements
	// ultérieurs déclenchent le scroll-to-top. `useRef` ignore son argument après
	// le premier rendu — c'est exactement le comportement voulu.
	//
	// @regression cursor-pagination-mount-scroll-2026-07-26 — une sentinelle
	// (différente de toute valeur de curseur par construction) GARANTISSAIT un
	// scroll-to-top à chaque montage : au retour navigateur, Next.js restaurait
	// la position, le composant la renvoyait en haut, et `focusTargetRef` volait
	// le focus au passage.
	const previousCursorRef = useRef<string | undefined>(cursor);

	const onCursorChange = useEffectEvent(() => {
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		window.scrollTo({
			top: 0,
			behavior: prefersReducedMotion ? "instant" : "smooth",
		});

		if (focusTargetRef?.current) {
			requestAnimationFrame(() => {
				focusTargetRef.current?.focus({ preventScroll: true });
			});
		}
	});

	useEffect(() => {
		if (previousCursorRef.current !== cursor) {
			previousCursorRef.current = cursor;
			onCursorChange();
		}
	}, [cursor]);

	/**
	 * Pousse l'URL courante avec `mutate` appliqué aux search params — préserve
	 * tout le reste (filtres, tri, recherche). Exposé pour les gestes propres à
	 * un appelant (ex. changement de « par page » côté admin).
	 */
	function startNavigation(
		action: CursorPaginationAction,
		mutate: (params: URLSearchParams) => void,
	) {
		setLastAction(action);
		const params = new URLSearchParams(searchParams.toString());
		mutate(params);
		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	}

	function goNext() {
		if (!nextCursor) return;
		haptic("light");
		startNavigation("next", (params) => {
			params.set("cursor", nextCursor);
			params.set("direction", "forward");
		});
	}

	function goPrevious() {
		if (!prevCursor) return;
		haptic("light");
		startNavigation("prev", (params) => {
			params.set("cursor", prevCursor);
			params.set("direction", "backward");
		});
	}

	function reset() {
		haptic("selection");
		startNavigation("reset", (params) => {
			params.delete("cursor");
			params.delete("direction");
		});
	}

	const onPrefetch = useEffectEvent((prefetchCursor: string | null, direction: string) => {
		if (!prefetchCursor) return;
		const params = new URLSearchParams(searchParams.toString());
		params.set("cursor", prefetchCursor);
		params.set("direction", direction);
		router.prefetch("?" + params.toString());
	});

	useEffect(() => {
		if (!prefetch) return;
		onPrefetch(nextCursor, "forward");
		onPrefetch(prevCursor, "backward");
	}, [nextCursor, prevCursor, prefetch]);

	return { cursor, isPending, lastAction, goNext, goPrevious, reset, startNavigation };
}
