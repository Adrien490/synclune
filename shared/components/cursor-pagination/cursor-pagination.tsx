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
import {
	useEffect,
	useEffectEvent,
	useId,
	useRef,
	useState,
	useTransition,
	Suspense,
	type ComponentProps,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "../ui/button";
import { NAV_BUTTON_SIZE, PAGE_INDICATOR_SIZE, RESET_BUTTON_SIZE } from "./constants";
import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS } from "@/shared/lib/pagination";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import type { CursorPaginationProps } from "@/shared/types/component.types";

// `focus-ring` SSOT (`app/globals.css`) hérité du `<Button>` parent — pas de
// surcharge `focus-visible:ring-*` ici (drift convention repo).
// `can-hover:` préfixe anti sticky-hover iOS (hover figé après tap).
const PAGINATION_BUTTON_CLASSES = [
	"backdrop-blur-sm",
	"border-primary/20",
	"can-hover:hover:bg-primary/10 can-hover:hover:text-primary can-hover:hover:border-primary/40",
	"motion-safe:can-hover:hover:scale-[1.02]",
	"motion-safe:active:scale-[0.98]",
	"motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none",
] as const;

function CursorPaginationInner({
	perPage: _perPageProp,
	hasNextPage,
	hasPreviousPage,
	currentPageSize,
	nextCursor,
	prevCursor,
	perPageOptions = PER_PAGE_OPTIONS,
	focusTargetRef,
	totalCount,
}: CursorPaginationProps) {
	const perPageId = useId();
	const haptic = useHaptic();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	// P1-3 : annonce SR des raccourcis clavier (Alt+Flèche) uniquement quand le
	// device a un pointer fine (souris/trackpad). Sur tactile, les raccourcis
	// n'existent pas → bruit cognitif pour VoiceOver iOS.
	const hasFinePointer = useMediaQuery("(pointer: fine)");
	// Sentinel to distinguish "not yet initialized" from "cursor is undefined"
	// Avoids spurious scroll-to-top on first render when cursor is also undefined
	// eslint-disable-next-line react-hooks/refs
	const UNINITIALIZED = useRef(Symbol("uninitialized")).current;
	const previousCursorRef = useRef<string | symbol | undefined>(UNINITIALIZED);
	// Tracker du dernier bouton cliqué pour afficher un spinner ciblé pendant
	// `isPending`. Lu pendant le render (la condition `isPending && ...` redevient
	// false naturellement à la fin de la transition donc le spinner disparaît).
	const [lastAction, setLastAction] = useState<"prev" | "next" | "reset" | "perPage" | null>(null);

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
		setLastAction("next");
		const params = preserveParams();
		params.set("cursor", nc);
		params.set("direction", "forward");
		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	}

	function navigatePrevious(pc: string | null) {
		if (!pc) return;
		setLastAction("prev");
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
		setLastAction("reset");
		const params = preserveParams();
		params.delete("cursor");
		params.delete("direction");
		startTransition(() => {
			router.push("?" + params.toString(), { scroll: false });
		});
	}
	function handlePerPageChange(newPerPage: number) {
		if (newPerPage === perPage) return;
		setLastAction("perPage");
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

	// Affiche le total uniquement s'il dépasse la page courante (sinon redondant
	// avec le compteur "X résultats" déjà rendu — la liste tient sur une page).
	const showTotal = typeof totalCount === "number" && totalCount > currentPageSize;
	const pluralRef = totalCount ?? currentPageSize;

	// Message pour les screen readers — une phrase concise. La position
	// (première/dernière) est déjà annoncée par le `<div role="status">`
	// ci-dessous, on évite le doublon.
	const ariaLiveMessage = isPending
		? "Chargement des résultats…"
		: currentPageSize === 0
			? "Aucun résultat."
			: showTotal
				? `Page chargée, ${currentPageSize} sur ${totalCount} résultat${totalCount > 1 ? "s" : ""}.`
				: `Page chargée, ${currentPageSize} résultat${currentPageSize > 1 ? "s" : ""}.`;

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
							{showTotal && (
								<>
									<span> sur </span>
									<span className="text-foreground font-medium">{totalCount}</span>
								</>
							)}
							<span className="hidden sm:inline"> résultat{pluralRef > 1 ? "s" : ""}</span>
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
					aria-describedby={hasFinePointer ? "pagination-shortcuts" : undefined}
					className="flex items-center gap-2"
				>
					{hasFinePointer && (
						<span id="pagination-shortcuts" className="sr-only">
							Raccourcis : Alt+Flèche gauche pour page précédente, Alt+Flèche droite pour page
							suivante
						</span>
					)}
					{/* Bouton retour au début - toujours affiché pour éviter layout shift */}
					<Button
						variant="outline"
						size="sm"
						disabled={isFirstPage || isPending}
						onClick={onReset}
						className={cn(RESET_BUTTON_SIZE, "cursor-pointer gap-1", ...PAGINATION_BUTTON_CLASSES)}
						aria-label="Retour au début"
					>
						{isPending && lastAction === "reset" ? (
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
							{isPending && lastAction === "prev" ? (
								<LoaderCircle className="size-5 motion-safe:animate-spin md:size-4" />
							) : (
								<ChevronLeft className="size-5 md:size-4" />
							)}
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
							{isPending && lastAction === "next" ? (
								<LoaderCircle className="size-5 motion-safe:animate-spin md:size-4" />
							) : (
								<ChevronRight className="size-5 md:size-4" />
							)}
						</Button>
					</ButtonGroup>
				</nav>
			)}
		</div>
	);
}

export function CursorPagination(props: ComponentProps<typeof CursorPaginationInner>) {
	return (
		<Suspense fallback={null}>
			<CursorPaginationInner {...props} />
		</Suspense>
	);
}

// Re-export pagination utilities for convenience
