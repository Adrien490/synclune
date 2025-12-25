"use client";

import { DEFAULT_PER_PAGE } from "@/shared/components/cursor-pagination/pagination";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition, useEffectEvent, type RefObject } from "react";

export interface UseCursorPaginationProps {
	nextCursor: string | null;
	prevCursor: string | null;
	/**
	 * Callback appelé après chaque navigation pour gérer le focus
	 * Par défaut, scroll vers le haut de la page
	 */
	onNavigate?: () => void;
	/**
	 * Ref vers l'élément qui doit recevoir le focus après navigation
	 * Améliore l'accessibilité en permettant aux utilisateurs de clavier/screen reader
	 * de reprendre la navigation depuis le bon endroit
	 */
	focusTargetRef?: RefObject<HTMLElement | null>;
	/**
	 * Active les raccourcis clavier pour la pagination
	 * Alt+ArrowLeft = Page précédente
	 * Alt+ArrowRight = Page suivante
	 * @default true
	 */
	enableKeyboardShortcuts?: boolean;
}

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
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const previousCursorRef = useRef<string | undefined>(undefined);

	const perPage = Number(searchParams.get("perPage")) || DEFAULT_PER_PAGE;
	const cursor = searchParams.get("cursor") || undefined;

	// Effect Event pour appeler onNavigate et gérer le focus sans re-runs inutiles
	const onCursorChange = useEffectEvent(() => {
		if (onNavigate) {
			onNavigate();
		} else {
			// Comportement par défaut : scroll to top
			window.scrollTo({ top: 0, behavior: "smooth" });
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
		isPending,
		handleNext,
		handlePrevious,
		handleReset,
		handlePerPageChange,
	};
}
