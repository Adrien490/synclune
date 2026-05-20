"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Fade } from "@/shared/components/animations/fade";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";

import { SearchInput, type SearchInputHandle } from "@/shared/components/search-input";
import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { useAddRecentSearch } from "@/modules/products/hooks/use-add-recent-search";
import { useRecentSearches } from "@/modules/products/hooks/use-recent-searches";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { toast } from "@/shared/utils/toast";

import {
	MIN_SEARCH_LENGTH,
	PLACEHOLDER_CYCLE_MS,
	QUICK_SEARCH_DIALOG_ID,
	RESULTS_CONTAINER_ID,
	SEARCH_DEBOUNCE_MS,
	SWIPE_CLOSE_THRESHOLD_PX,
	SWIPE_RUBBER_BAND_FACTOR,
} from "./constants";
import type {
	QuickSearchCollection,
	QuickSearchProductType,
	RecentlyViewedProduct,
} from "./constants";
import { lastTrigger } from "./last-trigger";
import { IdleContent } from "./idle-content";
import { QuickSearchContent } from "./quick-search-content";
import { QuickTagPills } from "./quick-tag-pills";
import { SearchResultsSkeleton } from "./search-result-item";
import { useKeyboardNavigation } from "./use-keyboard-navigation";
import { isSearchError, useQuickSearch } from "./use-quick-search";

const EMPTY_RECENT_SEARCHES: string[] = [];
const EMPTY_RECENTLY_VIEWED: RecentlyViewedProduct[] = [];

interface QuickSearchDialogProps {
	recentSearches?: string[];
	collections: QuickSearchCollection[];
	productTypes: QuickSearchProductType[];
	recentlyViewed?: RecentlyViewedProduct[];
}

export function QuickSearchDialog({
	recentSearches: initialSearches = EMPTY_RECENT_SEARCHES,
	collections,
	productTypes,
	recentlyViewed = EMPTY_RECENTLY_VIEWED,
}: QuickSearchDialogProps) {
	const { isOpen, close } = useDialog(QUICK_SEARCH_DIALOG_ID);
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const searchInputRef = useRef<SearchInputHandle>(null);

	// Cmd+K / Ctrl+K shortcut lives in QuickSearchKeyboardShortcut so the
	// heavy dialog chunk stays unloaded until first open. See lazy wrapper.

	const { add } = useAddRecentSearch({
		onError: () => toast.error("Erreur lors de l'enregistrement"),
	});
	const { searches, remove } = useRecentSearches({
		initialSearches,
		onRemoveError: () => toast.error("Erreur lors de la suppression"),
		onClearError: () => toast.error("Erreur lors de la suppression"),
	});

	// Tombstone state : termes en attente de remove() effectif (5s).
	// Remplace le toast undo en bas d'écran. Cf `Tombstone` SSOT.
	// Cleanup : à la fermeture du dialog, on flush les pendings via `remove()`
	// pour éviter qu'un terme reste indéfiniment dans `useRecentSearches`.
	const [tombstonedTerms, setTombstonedTerms] = useState<ReadonlySet<string>>(() => new Set());
	const tombstonedRef = useRef<ReadonlySet<string>>(tombstonedTerms);
	useEffect(() => {
		tombstonedRef.current = tombstonedTerms;
	}, [tombstonedTerms]);

	const handleRemoveRecent = (term: string) => {
		setTombstonedTerms((prev) => {
			if (prev.has(term)) return prev;
			const next = new Set(prev);
			next.add(term);
			return next;
		});
	};

	const handleClearRecent = () => {
		if (searches.length === 0) return;
		setTombstonedTerms((prev) => {
			const next = new Set(prev);
			for (const term of searches) next.add(term);
			return next;
		});
	};

	const handleUndoTombstone = (term: string) => {
		setTombstonedTerms((prev) => {
			if (!prev.has(term)) return prev;
			const next = new Set(prev);
			next.delete(term);
			return next;
		});
	};

	const handleExpireTombstone = (term: string) => {
		setTombstonedTerms((prev) => {
			if (!prev.has(term)) return prev;
			const next = new Set(prev);
			next.delete(term);
			return next;
		});
		remove(term);
	};

	const { contentRef, handleArrowNavigation, resetActiveIndex, activeDescendantId } =
		useKeyboardNavigation();

	const {
		inputValue,
		searchResults,
		searchQuery,
		isSearching,
		isSearchMode,
		handleInputValueChange,
		handleLiveSearch,
		handleSearchFromSuggestion,
		reset,
	} = useQuickSearch({ searchInputRef, resetActiveIndex });

	// Cleanup à la fermeture du dialog : (1) flush les tombstones en attente via
	// `remove()` pour ne pas perdre l'intention utilisateur si le dialog se ferme
	// avant l'expiration des 5s ; (2) `reset()` l'état de recherche pour qu'une
	// réouverture reparte propre — couvre les fermetures qui contournent
	// `handleClose` (sélection d'un résultat, « Voir les résultats »…).
	useEffect(() => {
		if (isOpen) return;
		const pending = tombstonedRef.current;
		if (pending.size > 0) {
			for (const term of pending) remove(term);
			setTombstonedTerms(new Set());
		}
		reset();
		// On veut déclencher SEULEMENT à la fermeture du dialog. `remove` et
		// `reset` sont stables en pratique (call-sites stables).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	const hasPartialInput = inputValue.trim().length > 0 && !isSearchMode;

	const shouldReduceMotion = useReducedMotion();

	// Cycling placeholder through product types — disabled under reduced motion
	// (an indefinitely auto-updating placeholder is itself "motion" per WCAG 2.2.2).
	const [placeholderIndex, setPlaceholderIndex] = useState(0);
	useEffect(() => {
		if (inputValue.length > 0 || productTypes.length === 0 || shouldReduceMotion) return;
		const id = setInterval(() => {
			setPlaceholderIndex((i) => (i + 1) % productTypes.length);
		}, PLACEHOLDER_CYCLE_MS);
		return () => clearInterval(id);
	}, [inputValue.length, productTypes.length, shouldReduceMotion]);

	const currentType = productTypes[placeholderIndex];
	const placeholder = currentType ? `Rechercher : ${currentType.label}...` : "Rechercher un bijou…";
	// Under reduced motion the animated overlay is skipped: the plain (static)
	// placeholder above is shown instead.
	const showAnimatedPlaceholder =
		inputValue.length === 0 && productTypes.length > 0 && !shouldReduceMotion;

	const navigateToSearch = (term: string, { saveToRecent = true } = {}) => {
		if (isPending) return;
		if (saveToRecent) add(term);
		triggerHaptic("medium");
		startTransition(() => {
			router.push(`/produits?search=${encodeURIComponent(term)}`);
			close();
		});
	};

	const handleEnterKey = (term: string) => {
		const trimmed = term.trim();
		if (!trimmed) return;
		navigateToSearch(trimmed);
	};

	const handleRecentSearch = (term: string) => {
		navigateToSearch(term, { saveToRecent: false });
	};

	const handleQuickTagClick = (label: string) => {
		resetActiveIndex();
		handleSearchFromSuggestion(label);
	};

	const handleSelectResult = () => {
		triggerHaptic("light");
		add(searchQuery);
		close();
	};

	const handleViewAllResults = () => {
		navigateToSearch(searchQuery);
	};

	const handleClose = () => {
		close();
		reset();
		setDragOffset(0);
		setIsDragging(false);
	};

	// Swipe-down-to-dismiss on mobile (triggered from header drag handle area)
	const touchStartYRef = useRef<number | null>(null);
	const touchDeltaYRef = useRef(0);
	const [dragOffset, setDragOffset] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const handleHeaderTouchStart = (e: React.TouchEvent<HTMLElement>) => {
		const y = e.touches[0]?.clientY;
		if (typeof y === "number") {
			touchStartYRef.current = y;
			touchDeltaYRef.current = 0;
			setIsDragging(true);
		}
	};
	const handleHeaderTouchMove = (e: React.TouchEvent<HTMLElement>) => {
		if (touchStartYRef.current === null) return;
		const y = e.touches[0]?.clientY;
		if (typeof y === "number") {
			const raw = y - touchStartYRef.current;
			touchDeltaYRef.current = raw;
			// Rubber band upward (negative) drag; downward stays 1:1
			const offset = raw < 0 ? raw * SWIPE_RUBBER_BAND_FACTOR : raw;
			setDragOffset(offset);
		}
	};
	const handleHeaderTouchEnd = () => {
		const delta = touchDeltaYRef.current;
		touchStartYRef.current = null;
		touchDeltaYRef.current = 0;
		setIsDragging(false);
		// A downward swipe past the threshold dismisses the dialog
		if (delta > SWIPE_CLOSE_THRESHOLD_PX) {
			triggerHaptic("medium");
			handleClose();
		}
		// Snap back to 0 (transition handled by !isDragging)
		setDragOffset(0);
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
		>
			<DialogContent
				showCloseButton={false}
				onCloseAutoFocus={(e) => {
					// Restore focus to the element that opened the dialog (captured in
					// `lastTrigger` before it blurred itself / before Radix took over).
					e.preventDefault();
					lastTrigger.el?.focus();
				}}
				aria-busy={isPending}
				style={{
					transform: dragOffset !== 0 ? `translateY(${dragOffset}px)` : undefined,
					transition: isDragging ? "none" : "transform var(--duration-normal) var(--ease-spring)",
				}}
				className={cn(
					"group/search",
					// Mobile: bottom-sheet pleine hauteur (suit le clavier via --vvh, fallback 100dvh)
					"fixed inset-0 top-0 right-0 bottom-0 left-0 h-[var(--vvh,100dvh)] w-full max-w-none translate-x-0 translate-y-0",
					"overflow-hidden rounded-none border-0",
					"motion-safe:data-[state=open]:slide-in-from-bottom motion-safe:data-[state=closed]:slide-out-to-bottom",
					"motion-safe:data-[state=open]:zoom-in-100 motion-safe:data-[state=closed]:zoom-out-100",
					"flex flex-col",
					// Desktop: centered dialog, hauteur constante 640px (capée à 85vh pour petits écrans)
					"md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
					"md:h-[min(640px,85vh)] md:w-full md:max-w-160 md:overflow-hidden md:rounded-xl md:border",
					"motion-safe:md:data-[state=open]:slide-in-from-top-4 motion-safe:md:data-[state=open]:zoom-in-95",
				)}
			>
				{/* Header */}
				<header
					className={cn(
						"bg-background sticky top-0 z-10 shrink-0",
						"border-border border-b md:border-b-0",
					)}
					onTouchStart={handleHeaderTouchStart}
					onTouchMove={handleHeaderTouchMove}
					onTouchEnd={handleHeaderTouchEnd}
				>
					{/* Drag handle (mobile only) */}
					<div className="flex justify-center pt-2 pb-1 md:hidden" aria-hidden="true">
						<span className="bg-muted-foreground/30 h-1.5 w-10 rounded-full" />
					</div>
					<div className="flex h-14 items-center px-4">
						{/* Single close button: leftmost on mobile, rightmost on desktop (via order) */}
						<Button
							variant="ghost"
							size="icon"
							onClick={handleClose}
							disabled={isPending}
							className="order-first size-11 shrink-0 md:order-last"
							aria-label="Fermer"
						>
							<X className="size-5" />
						</Button>

						<DialogTitle className="font-display flex-1 text-center text-lg font-medium md:text-left">
							Rechercher
						</DialogTitle>
						<DialogDescription className="sr-only">
							Recherchez un bijou par nom ou parcourez les collections et categories.
						</DialogDescription>

						{/* Spacer mirrors the close button width to keep the title centered on mobile */}
						<div className="order-last size-11 shrink-0 md:hidden" aria-hidden="true" />
					</div>
				</header>

				{/* Search Input — le landmark `search` est fourni par le <form> de SearchInput */}
				<div className="bg-background shrink-0 px-4 py-3" data-pending={isPending ? "" : undefined}>
					<div className="relative overflow-hidden">
						<SearchInput
							ref={searchInputRef}
							// `paramName` is inert here: `onLiveSearch` bypasses URL syncing.
							paramName="qs"
							debounceMs={SEARCH_DEBOUNCE_MS}
							size="md"
							placeholder={showAnimatedPlaceholder ? " " : placeholder}
							aria-label="Rechercher un bijou"
							// eslint-disable-next-line jsx-a11y/no-autofocus
							autoFocus
							preventMobileBlur
							isPending={isSearching}
							onLiveSearch={handleLiveSearch}
							onEscape={handleClose}
							onValueChange={handleInputValueChange}
							onSubmit={handleEnterKey}
							aria-activedescendant={activeDescendantId}
							// The listbox popup is always rendered while the dialog is open
							// (idle suggestions or live results), so the combobox is expanded.
							aria-expanded
							aria-controls={RESULTS_CONTAINER_ID}
							// ARIA 1.2 combobox: the input keeps focus, so arrow/Home/End/Enter
							// navigation must be handled here — not on the listbox container.
							onKeyDown={handleArrowNavigation}
						/>
						{showAnimatedPlaceholder && (
							<div
								className="pointer-events-none absolute inset-y-0 left-12 flex items-center"
								aria-hidden="true"
							>
								<span className="text-muted-foreground text-sm">
									Rechercher :{" "}
									<AnimatePresence mode="wait" initial={false}>
										<m.span
											key={placeholderIndex}
											className="inline-block"
											initial={{ y: 6, opacity: 0 }}
											animate={{ y: 0, opacity: 1 }}
											exit={{ y: -6, opacity: 0 }}
											transition={{
												// `showAnimatedPlaceholder` is already false under reduced motion,
												// so this branch only runs when motion is allowed.
												duration: MOTION_CONFIG.duration.medium,
												ease: MOTION_CONFIG.easing.easeOut,
											}}
										>
											{currentType?.label}...
										</m.span>
									</AnimatePresence>
								</span>
							</div>
						)}
					</div>
				</div>

				{/* Quick suggestion tags (idle only) */}
				{!isSearchMode && productTypes.length > 0 && (
					<div className="bg-background shrink-0 px-4 pb-2">
						<QuickTagPills productTypes={productTypes} onSelect={handleQuickTagClick} size="sm" />
					</div>
				)}

				{/* Hint when input is too short */}
				{hasPartialInput && (
					<p className="text-muted-foreground px-4 pb-2 text-xs">
						Tapez au moins {MIN_SEARCH_LENGTH} caractères pour rechercher
					</p>
				)}

				{/* Screen reader announcements (search mode is announced by QuickSearchContent) */}
				<div role="status" aria-live="polite" className="sr-only">
					{!isSearchMode && (
						<>
							{searches.length > 0 &&
								`${searches.length} recherche${searches.length > 1 ? "s" : ""} recente${searches.length > 1 ? "s" : ""}.`}
							{collections.length > 0 &&
								` ${collections.length} collection${collections.length > 1 ? "s" : ""}.`}
							{productTypes.length > 0 &&
								` ${productTypes.length} categorie${productTypes.length > 1 ? "s" : ""}.`}
						</>
					)}
				</div>

				{/* Content — ARIA 1.2 combobox pattern: listbox is a presentational
					 container, the input owns focus and announces the active option via
					 aria-activedescendant (keyboard navigation is wired on the input).
					 tabIndex={-1} makes it programmatically focusable to satisfy jsx-a11y
					 while keeping it out of the Tab order. */}
				<div
					ref={contentRef}
					id={RESULTS_CONTAINER_ID}
					role="listbox"
					aria-label="Résultats de recherche"
					tabIndex={-1}
					className={cn(
						"min-h-0 flex-1 overflow-hidden overscroll-contain",
						"group-has-[[data-pending]]/search:opacity-50",
						"group-has-[[data-pending]]/search:pointer-events-none",
						"transition-opacity duration-200",
					)}
					onMouseLeave={resetActiveIndex}
				>
					<AnimatePresence mode="wait">
						{isSearchMode ? (
							<Fade key="search-results" y={6} className="h-full">
								{isSearching && (!searchResults || isSearchError(searchResults)) ? (
									<SearchResultsSkeleton />
								) : isSearchError(searchResults) ? (
									<div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-8">
										<p className="text-muted-foreground text-sm">
											La recherche est temporairement indisponible.
										</p>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleLiveSearch(searchQuery)}
										>
											Réessayer
										</Button>
									</div>
								) : searchResults ? (
									<QuickSearchContent
										results={searchResults}
										query={searchQuery}
										collections={collections}
										productTypes={productTypes}
										onSearch={handleSearchFromSuggestion}
										onClose={handleClose}
										onSelectResult={handleSelectResult}
										onViewAllResults={handleViewAllResults}
										onRetry={() => handleLiveSearch(searchQuery)}
									/>
								) : (
									<SearchResultsSkeleton />
								)}
							</Fade>
						) : (
							/* ====== IDLE MODE ====== */
							<Fade key="idle-content" y={6} className="h-full">
								<IdleContent
									recentlyViewed={recentlyViewed}
									searches={searches}
									collections={collections}
									onClose={handleClose}
									onRecentSearch={handleRecentSearch}
									onRemoveSearch={handleRemoveRecent}
									onClearSearches={handleClearRecent}
									isPending={isPending}
									tombstonedTerms={tombstonedTerms}
									onUndoTombstone={handleUndoTombstone}
									onExpireTombstone={handleExpireTombstone}
								/>
							</Fade>
						)}
					</AnimatePresence>
				</div>

				{/* Safe area bottom spacer */}
				<div className="bg-background h-[env(safe-area-inset-bottom,0)] shrink-0 md:hidden" />
			</DialogContent>
		</Dialog>
	);
}
