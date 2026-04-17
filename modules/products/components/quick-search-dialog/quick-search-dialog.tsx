"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";

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

import { QUICK_SEARCH_DIALOG_ID, RESULTS_CONTAINER_ID, SEARCH_DEBOUNCE_MS } from "./constants";
import type {
	QuickSearchCollection,
	QuickSearchProductType,
	RecentlyViewedProduct,
} from "./constants";
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
	const { isOpen, open, close } = useDialog(QUICK_SEARCH_DIALOG_ID);
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const searchInputRef = useRef<SearchInputHandle>(null);
	// Capture the trigger element before Radix steals focus (useLayoutEffect fires before useEffect)
	const triggerRef = useRef<HTMLElement | null>(null);
	useLayoutEffect(() => {
		if (isOpen) {
			triggerRef.current = document.activeElement as HTMLElement | null;
		}
	}, [isOpen]);

	// Global Cmd+K / Ctrl+K shortcut to open quick search
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				if (isOpen) {
					close();
				} else {
					open();
				}
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, open, close]);

	const { add } = useAddRecentSearch({
		onError: () => toast.error("Erreur lors de l'enregistrement"),
	});
	const { searches, remove, clear } = useRecentSearches({
		initialSearches,
		onRemoveError: () => toast.error("Erreur lors de la suppression"),
		onClearError: () => toast.error("Erreur lors de la suppression"),
	});

	const handleRemoveRecent = (term: string) => {
		remove(term);
		toast.success("Recherche supprimée", {
			action: {
				label: "Annuler",
				onClick: () => add(term),
			},
			duration: 5000,
		});
	};

	const handleClearRecent = () => {
		const snapshot = [...searches];
		clear();
		if (snapshot.length === 0) return;
		toast.success(
			snapshot.length === 1 ? "Recherche effacée" : `${snapshot.length} recherches effacées`,
			{
				action: {
					label: "Annuler",
					onClick: () => {
						snapshot.forEach((term) => add(term));
					},
				},
				duration: 6000,
			},
		);
	};

	const { contentRef, handleArrowNavigation, focusFirst, resetActiveIndex, activeDescendantId } =
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

	const hasPartialInput = inputValue.trim().length > 0 && !isSearchMode;

	// Cycling placeholder through product types
	const [placeholderIndex, setPlaceholderIndex] = useState(0);
	useEffect(() => {
		if (inputValue.length > 0 || productTypes.length === 0) return;
		const id = setInterval(() => {
			setPlaceholderIndex((i) => (i + 1) % productTypes.length);
		}, 3000);
		return () => clearInterval(id);
	}, [inputValue.length, productTypes.length]);

	const shouldReduceMotion = useReducedMotion();

	const currentType = productTypes[placeholderIndex];
	const placeholder = currentType
		? `Rechercher : ${currentType.label}...`
		: "Rechercher un bijou...";
	const showAnimatedPlaceholder = inputValue.length === 0 && productTypes.length > 0;

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
	};

	// Swipe-down-to-dismiss on mobile (triggered from header drag handle area)
	const touchStartYRef = useRef<number | null>(null);
	const touchDeltaYRef = useRef(0);
	const handleHeaderTouchStart = (e: React.TouchEvent<HTMLElement>) => {
		const y = e.touches[0]?.clientY;
		if (typeof y === "number") {
			touchStartYRef.current = y;
			touchDeltaYRef.current = 0;
		}
	};
	const handleHeaderTouchMove = (e: React.TouchEvent<HTMLElement>) => {
		if (touchStartYRef.current === null) return;
		const y = e.touches[0]?.clientY;
		if (typeof y === "number") {
			touchDeltaYRef.current = y - touchStartYRef.current;
		}
	};
	const handleHeaderTouchEnd = () => {
		const delta = touchDeltaYRef.current;
		touchStartYRef.current = null;
		touchDeltaYRef.current = 0;
		// Threshold: 80px downward swipe from header triggers close
		if (delta > 80) {
			triggerHaptic("medium");
			handleClose();
		}
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
					e.preventDefault();
					triggerRef.current?.focus();
				}}
				aria-busy={isPending}
				className={cn(
					"group/search",
					// Mobile: bottom-sheet pleine hauteur (100dvh)
					"fixed inset-0 top-0 right-0 bottom-0 left-0 h-dvh w-full max-w-none translate-x-0 translate-y-0",
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
						<Button
							variant="ghost"
							size="icon"
							onClick={handleClose}
							disabled={isPending}
							className="size-11 shrink-0 md:hidden"
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

						<Button
							variant="ghost"
							size="icon"
							onClick={handleClose}
							disabled={isPending}
							className="hidden size-10 shrink-0 md:inline-flex"
							aria-label="Fermer"
						>
							<X className="size-4" />
						</Button>

						{/* Spacer to center title on mobile (mirrors the close button width) */}
						<div className="size-11 shrink-0 md:hidden" aria-hidden="true" />
					</div>
				</header>

				{/* Search Input */}
				<div
					className="bg-background shrink-0 px-4 py-3"
					role="search"
					data-pending={isPending ? "" : undefined}
				>
					<div className="relative overflow-hidden">
						<SearchInput
							ref={searchInputRef}
							paramName="qs"
							mode="live"
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
							activeDescendantId={activeDescendantId}
							ariaExpanded={isSearchMode}
							ariaControls={RESULTS_CONTAINER_ID}
							onKeyDown={(e) => {
								if (e.key === "ArrowDown") {
									e.preventDefault();
									focusFirst();
								}
							}}
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
												duration: shouldReduceMotion ? 0 : MOTION_CONFIG.duration.medium,
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
						Tapez au moins 3 caractères pour rechercher
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
					 container, the input owns focus and announces active option via
					 aria-activedescendant. tabIndex={-1} makes it programmatically focusable
					 to satisfy jsx-a11y while keeping it out of the Tab order. */}
				<div
					ref={contentRef}
					id={RESULTS_CONTAINER_ID}
					role="listbox"
					aria-label="Résultats de recherche"
					tabIndex={-1}
					className={cn(
						"min-h-0 flex-1 overflow-hidden",
						"group-has-[[data-pending]]/search:opacity-50",
						"group-has-[[data-pending]]/search:pointer-events-none",
						"transition-opacity duration-200",
					)}
					onKeyDown={handleArrowNavigation}
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
											Reessayer
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
