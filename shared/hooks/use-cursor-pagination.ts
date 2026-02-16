"use client"

import { DEFAULT_PER_PAGE } from "@/shared/lib/pagination"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
// Note: useEffectEvent is a React 19 feature for stable event handlers in effects
// See: https://react.dev/reference/react/useEffectEvent
import { useEffect, useRef, useTransition, useEffectEvent } from "react"

import type { UseCursorPaginationProps } from "@/shared/types/hook.types"

export type { UseCursorPaginationProps } from "@/shared/types/hook.types"

/**
 * Hook pour gérer la pagination avec cursor (Best Practices 2025)
 *
 * Stratégie simple et robuste :
 * - Next : cursor=nextCursor, direction=forward
 * - Previous : cursor=prevCursor, direction=backward
 * - Le serveur fait le reste
 */
export function useCursorPagination({
	nextCursor,
	prevCursor,
	onNavigate,
	focusTargetRef,
	enableKeyboardShortcuts = true,
}: UseCursorPaginationProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	// Sentinel to distinguish "not yet initialized" from "cursor is undefined"
	// Avoids spurious scroll-to-top on first render when cursor is also undefined
	const UNINITIALIZED = useRef(Symbol("uninitialized")).current
	const previousCursorRef = useRef<string | symbol | undefined>(UNINITIALIZED);

	const perPage = Number(searchParams.get("perPage")) || DEFAULT_PER_PAGE;
	const cursor = searchParams.get("cursor") || undefined;

	// Effect Event pour appeler onNavigate et gérer le focus sans re-runs inutiles
	const onCursorChange = useEffectEvent(() => {
		if (onNavigate) {
			onNavigate();
		} else {
			// Comportement par défaut : scroll to top
			// Respecte prefers-reduced-motion pour l'accessibilité
			const prefersReducedMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)"
			).matches;
			window.scrollTo({
				top: 0,
				behavior: prefersReducedMotion ? "instant" : "smooth",
			});
		}

		// Focus management pour accessibilité
		// Permet aux utilisateurs de clavier de reprendre depuis le bon endroit
		if (focusTargetRef?.current) {
			// Délai pour permettre au DOM de se mettre à jour
			requestAnimationFrame(() => {
				focusTargetRef.current?.focus({ preventScroll: true });
			});
		}
	});

	// Détecte le changement de page et gère le focus/scroll
	useEffect(() => {
		if (previousCursorRef.current !== cursor) {
			previousCursorRef.current = cursor;
			onCursorChange();
		}
	}, [cursor, onCursorChange]);

	const preserveParams = () => {
		return new URLSearchParams(searchParams.toString());
	};

	// Navigation functions need to be defined before the keyboard shortcut effect
	const navigateNext = (nc: string | null) => {
		if (!nc) return;

		const params = preserveParams();
		params.set("cursor", nc);
		params.set("direction", "forward");

		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	};

	const navigatePrevious = (pc: string | null) => {
		if (!pc) return;

		const params = preserveParams();
		params.set("cursor", pc);
		params.set("direction", "backward");

		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	};

	// Effect Event pour gérer les raccourcis clavier sans re-registration
	const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
		// Ne pas intercepter si on est dans un champ de saisie
		const target = e.target as HTMLElement;
		if (
			target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" ||
			target.isContentEditable
		) {
			return;
		}

		if (e.altKey && e.key === "ArrowLeft" && prevCursor) {
			e.preventDefault();
			navigatePrevious(prevCursor);
		}

		if (e.altKey && e.key === "ArrowRight" && nextCursor) {
			e.preventDefault();
			navigateNext(nextCursor);
		}
	});

	// Raccourcis clavier Alt+Left/Right pour navigation rapide
	useEffect(() => {
		if (!enableKeyboardShortcuts) return;

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [enableKeyboardShortcuts, onKeyDown]);

	// Effect Event: reads searchParams and router without re-triggering the prefetch effect
	const onPrefetch = useEffectEvent((pCursor: string | null, direction: string) => {
		if (!pCursor) return;
		const params = new URLSearchParams(searchParams.toString());
		params.set("cursor", pCursor);
		params.set("direction", direction);
		router.prefetch("?" + params.toString());
	});

	// Prefetch next/prev pages for faster perceived navigation
	// Only depends on cursor values — searchParams changes (filters, etc.) don't affect prefetch URLs
	useEffect(() => {
		onPrefetch(nextCursor, "forward");
		onPrefetch(prevCursor, "backward");
	}, [nextCursor, prevCursor]);

	const handleNext = () => navigateNext(nextCursor);
	const handlePrevious = () => navigatePrevious(prevCursor);

	const handleReset = () => {
		const params = preserveParams();
		params.delete("cursor");
		params.delete("direction");

		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	};

	const handlePerPageChange = (newPerPage: number) => {
		if (newPerPage === perPage) return;

		const params = preserveParams();
		params.set("perPage", String(newPerPage));
		params.delete("cursor");
		params.delete("direction");

		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	};

	return {
		perPage,
		cursor,
		pathname,
		searchParams,
		isPending,
		handleNext,
		handlePrevious,
		handleReset,
		handlePerPageChange,
	};
}
