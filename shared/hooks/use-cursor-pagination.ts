"use client";

import { DEFAULT_PER_PAGE } from "@/shared/components/cursor-pagination/pagination";
import { useRouter, useSearchParams } from "next/navigation";
import {
	useCallback,
	useEffect,
	useRef,
	useTransition,
	type RefObject,
} from "react";

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
}: UseCursorPaginationProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const previousCursorRef = useRef<string | undefined>(undefined);

	const perPage = Number(searchParams.get("perPage")) || DEFAULT_PER_PAGE;
	const cursor = searchParams.get("cursor") || undefined;

	// Détecte le changement de page et gère le focus/scroll
	useEffect(() => {
		if (previousCursorRef.current !== cursor) {
			previousCursorRef.current = cursor;

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
		}
	}, [cursor, onNavigate, focusTargetRef]);

	const preserveParams = useCallback(() => {
		return new URLSearchParams(searchParams.toString());
	}, [searchParams]);

	const handleNext = useCallback(() => {
		if (!nextCursor) return;

		const params = preserveParams();
		params.set("cursor", nextCursor);
		params.set("direction", "forward");

		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	}, [nextCursor, preserveParams, router]);

	const handlePrevious = useCallback(() => {
		if (!prevCursor) return;

		const params = preserveParams();
		params.set("cursor", prevCursor);
		params.set("direction", "backward");

		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	}, [prevCursor, preserveParams, router]);

	const handleReset = useCallback(() => {
		const params = preserveParams();
		params.delete("cursor");
		params.delete("direction");

		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	}, [preserveParams, router]);

	const handlePerPageChange = useCallback(
		(newPerPage: number) => {
			if (newPerPage === perPage) return;

			const params = preserveParams();
			params.set("perPage", String(newPerPage));
			params.delete("cursor");
			params.delete("direction");

			startTransition(() => {
				router.push("?" + params.toString(), { scroll: false });
			});
		},
		[perPage, preserveParams, router]
	);

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
