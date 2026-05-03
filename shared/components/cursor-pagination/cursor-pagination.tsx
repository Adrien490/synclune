"use client";

import { ButtonGroup } from "@/shared/components/ui/button-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, ChevronRight, ChevronsLeft, LoaderCircle } from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "../ui/button";
import { NAV_BUTTON_SIZE, PAGE_INDICATOR_SIZE, RESET_BUTTON_SIZE } from "./constants";
import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS } from "@/shared/lib/pagination";
import { useHaptic } from "@/shared/hooks/use-haptic";
import type { CursorPaginationProps } from "@/shared/types/component.types";

const PAGINATION_BUTTON_CLASSES = [
	"backdrop-blur-sm",
	"border-primary/20",
	"hover:bg-primary/10 hover:text-primary hover:border-primary/40",
	"motion-safe:hover:scale-[1.02]",
	"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
	"motion-safe:active:scale-[0.98]",
	"motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none",
] as const;

export function CursorPagination({
	perPage: _perPageProp,
	hasNextPage,
	hasPreviousPage,
	currentPageSize,
	nextCursor,
	prevCursor,
	perPageOptions = PER_PAGE_OPTIONS,
	focusTargetRef,
}: CursorPaginationProps) {
	const perPageId = useId();
	const haptic = useHaptic();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	// Sentinel to distinguish "not yet initialized" from "cursor is undefined"
	// Avoids spurious scroll-to-top on first render when cursor is also undefined
	// eslint-disable-next-line react-hooks/refs
	const UNINITIALIZED = useRef(Symbol("uninitialized")).current;
	const previousCursorRef = useRef<string | symbol | undefined>(UNINITIALIZED);

	const perPage = Number(searchParams.get("perPage")) || DEFAULT_PER_PAGE;
	const cursor = searchParams.get("cursor") ?? undefined;

	const onCursorChange = useEffectEvent(() => {
		// Default behavior: scroll to top, respecting prefers-reduced-motion
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

	function preserveParams() {
		return new URLSearchParams(searchParams.toString());
	}

	function navigateNext(nc: string | null) {
		if (!nc) return;
		const params = preserveParams();
		params.set("cursor", nc);
		params.set("direction", "forward");
		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	}

	function navigatePrevious(pc: string | null) {
		if (!pc) return;
		const params = preserveParams();
		params.set("cursor", pc);
		params.set("direction", "backward");
		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	}

	const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
		const target = e.target as HTMLElement;
		if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
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

	useEffect(() => {
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const onPrefetch = useEffectEvent((pCursor: string | null, direction: string) => {
		if (!pCursor) return;
		const params = new URLSearchParams(searchParams.toString());
		params.set("cursor", pCursor);
		params.set("direction", direction);
		router.prefetch("?" + params.toString());
	});

	useEffect(() => {
		onPrefetch(nextCursor, "forward");
		onPrefetch(prevCursor, "backward");
	}, [nextCursor, prevCursor]);

	function handleNext() {
		navigateNext(nextCursor);
	}
	function handlePrevious() {
		navigatePrevious(prevCursor);
	}
	function handleReset() {
		const params = preserveParams();
		params.delete("cursor");
		params.delete("direction");
		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	}
	function handlePerPageChange(newPerPage: number) {
		if (newPerPage === perPage) return;
		const params = preserveParams();
		params.set("perPage", String(newPerPage));
		params.delete("cursor");
		params.delete("direction");
		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	}

	const onPrevious = () => {
		haptic("light");
		handlePrevious();
	};
	const onNext = () => {
		haptic("light");
		handleNext();
	};
	const onReset = () => {
		haptic("selection");
		handleReset();
	};
	const onPerPageChange = (value: string) => {
		haptic("selection");
		handlePerPageChange(Number(value));
	};

	const isFirstPage = !cursor;
	const canNavigate = hasNextPage || hasPreviousPage;

	// Build rel="prev"/"next" URLs for SEO crawl hints
	const buildPaginationUrl = (paginationCursor: string | null, direction: string) => {
		if (!paginationCursor) return null;
		const params = new URLSearchParams(searchParams.toString());
		params.set("cursor", paginationCursor);
		params.set("direction", direction);
		return `${pathname}?${params.toString()}`;
	};

	const prevUrl = hasPreviousPage ? buildPaginationUrl(prevCursor, "backward") : null;
	const nextUrl = hasNextPage ? buildPaginationUrl(nextCursor, "forward") : null;

	// Message pour les screen readers
	const ariaLiveMessage = (() => {
		if (isPending) return "Chargement des résultats...";
		if (currentPageSize === 0) return "Aucun résultat.";

		const parts = [
			`Affichage de ${currentPageSize} résultat${currentPageSize > 1 ? "s" : ""} sur cette page.`,
		];

		if (!canNavigate) {
			parts.push("Page unique, navigation non disponible.");
		} else if (!hasPreviousPage) {
			parts.push("Première page.");
		} else {
			parts.push("Page précédente disponible.");
		}

		if (canNavigate && hasNextPage) {
			parts.push("Pages suivantes disponibles.");
		} else if (canNavigate) {
			parts.push("Dernière page.");
		}

		return parts.join(" ");
	})();

	return (
		<div
			className={cn(
				"flex flex-row items-center justify-between gap-2 sm:gap-3",
				// Opacity réduite pendant le chargement avec transition smooth pour UX fluide
				// opacity-80 (au lieu de 70) pour meilleur contraste WCAG AA (4.5:1)
				isPending && "pointer-events-none opacity-80 transition-opacity duration-200",
			)}
		>
			{/* SEO crawl hints — React 19 hoists these to <head> */}
			{prevUrl && <link rel="prev" href={prevUrl} />}
			{nextUrl && <link rel="next" href={nextUrl} />}
			{/* Live region pour screen readers */}
			<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
				{ariaLiveMessage}
			</div>
			{/* Informations sur la pagination */}
			<div className="flex items-center gap-2 text-sm sm:gap-3">
				<div className="flex items-center gap-1.5 sm:gap-2">
					<label htmlFor={perPageId} className="text-muted-foreground hidden text-xs sm:block">
						Par page
					</label>
					<Select value={String(perPage)} onValueChange={onPerPageChange} disabled={isPending}>
						<SelectTrigger
							id={perPageId}
							className="h-11 w-20 sm:h-9"
							aria-label="Nombre de résultats par page"
						>
							<SelectValue>{perPage}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{perPageOptions.map((size) => (
								<SelectItem key={size} value={String(size)}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<span className="text-muted-foreground text-sm">
					{currentPageSize > 0 ? (
						<>
							<span className="text-foreground font-medium">{currentPageSize}</span>
							<span className="hidden sm:inline"> résultat{currentPageSize > 1 ? "s" : ""}</span>
						</>
					) : (
						<span className="hidden sm:inline">Aucun résultat</span>
					)}
				</span>
			</div>

			{/* Contrôles de pagination */}
			{canNavigate && (
				<nav
					aria-label="Pagination"
					aria-describedby="pagination-shortcuts"
					className="flex items-center gap-2"
				>
					<span id="pagination-shortcuts" className="sr-only">
						Raccourcis : Alt+Flèche gauche pour page précédente, Alt+Flèche droite pour page
						suivante
					</span>
					{/* Bouton retour au début - toujours affiché pour éviter layout shift */}
					<Button
						variant="outline"
						size="sm"
						disabled={isFirstPage || isPending}
						onClick={onReset}
						className={cn(RESET_BUTTON_SIZE, "cursor-pointer gap-1", ...PAGINATION_BUTTON_CLASSES)}
						aria-label="Retour au début"
					>
						{isPending && !isFirstPage ? (
							<LoaderCircle className="size-5 motion-safe:animate-spin md:size-4" />
						) : (
							<ChevronsLeft className="size-5 md:size-4" />
						)}
						<span className="hidden sm:inline">Début</span>
					</Button>

					<ButtonGroup>
						{/* Bouton précédent */}
						<Button
							variant="outline"
							size="icon"
							disabled={!hasPreviousPage || isPending}
							onClick={onPrevious}
							className={cn(NAV_BUTTON_SIZE, "cursor-pointer", ...PAGINATION_BUTTON_CLASSES)}
							aria-label="Page précédente"
						>
							<ChevronLeft className="size-5 md:size-4" />
						</Button>

						<div
							className={cn(
								"bg-muted/50 flex items-center justify-center px-3 text-center text-xs sm:text-sm",
								PAGE_INDICATOR_SIZE,
							)}
							role="status"
							aria-label="Position actuelle dans la pagination"
						>
							<span className="text-foreground font-medium">
								{!hasPreviousPage && !hasNextPage
									? "Page unique"
									: !hasPreviousPage
										? "Première page"
										: !hasNextPage
											? "Dernière page"
											: "Suite"}
							</span>
						</div>

						{/* Bouton suivant */}
						<Button
							variant="outline"
							size="icon"
							disabled={!hasNextPage || isPending}
							onClick={onNext}
							className={cn(NAV_BUTTON_SIZE, "cursor-pointer", ...PAGINATION_BUTTON_CLASSES)}
							aria-label="Page suivante"
						>
							<ChevronRight className="size-5 md:size-4" />
						</Button>
					</ButtonGroup>
				</nav>
			)}
		</div>
	);
}

// Re-export pagination utilities for convenience
