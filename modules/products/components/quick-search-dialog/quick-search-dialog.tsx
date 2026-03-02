"use client";

import { AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Fade } from "@/shared/components/animations/fade";
import { ErrorBoundary } from "@/shared/components/error-boundary";
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
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";

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

interface QuickSearchDialogProps {
	recentSearches?: string[];
	collections: QuickSearchCollection[];
	productTypes: QuickSearchProductType[];
	recentlyViewed?: RecentlyViewedProduct[];
}

export function QuickSearchDialog({
	recentSearches: initialSearches = [],
	collections,
	productTypes,
	recentlyViewed = [],
}: QuickSearchDialogProps) {
	const { isOpen, close } = useDialog(QUICK_SEARCH_DIALOG_ID);
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const searchInputRef = useRef<SearchInputHandle>(null);

	const { add } = useAddRecentSearch({
		onError: () => toast.error("Erreur lors de l'enregistrement"),
	});
	const { searches, remove, clear } = useRecentSearches({
		initialSearches,
		onRemoveError: () => toast.error("Erreur lors de la suppression"),
		onClearError: () => toast.error("Erreur lors de la suppression"),
	});

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

	const currentType = productTypes[placeholderIndex % (productTypes.length || 1)];
	const placeholder = currentType
		? `Rechercher : ${currentType.label}...`
		: "Rechercher un bijou...";

	const navigateToSearch = (term: string, { saveToRecent = true } = {}) => {
		if (isPending) return;
		if (saveToRecent) add(term);
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

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
		>
			<DialogContent
				showCloseButton={false}
				onCloseAutoFocus={(e) => e.preventDefault()}
				aria-busy={isPending}
				className={cn(
					"group/search",
					// Mobile: fullscreen
					"fixed inset-0 h-[100dvh] w-full max-w-none rounded-none",
					"top-0 left-0 translate-x-0 translate-y-0",
					"motion-safe:data-[state=open]:slide-in-from-top-2 motion-safe:data-[state=closed]:slide-out-to-top-2",
					"motion-safe:data-[state=open]:zoom-in-100 motion-safe:data-[state=closed]:zoom-out-100",
					"flex flex-col",
					// Desktop: centered dialog
					"md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
					"md:max-h-[70vh] md:w-full md:max-w-160 md:overflow-hidden md:rounded-xl",
					"motion-safe:md:data-[state=open]:slide-in-from-top-4 motion-safe:md:data-[state=open]:zoom-in-95",
				)}
			>
				{/* Header */}
				<header
					className={cn(
						"bg-background sticky top-0 z-10 shrink-0",
						"border-border border-b md:border-b-0",
						"pt-[env(safe-area-inset-top,0)] md:pt-0",
					)}
				>
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
					<SearchInput
						ref={searchInputRef}
						paramName="qs"
						mode="live"
						debounceMs={SEARCH_DEBOUNCE_MS}
						size="md"
						placeholder={placeholder}
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

				{/* Content */}
				{/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- role="group" container with keyboard arrow navigation for search results */}
				<div
					ref={contentRef}
					id={RESULTS_CONTAINER_ID}
					role="group"
					aria-label="Résultats de recherche"
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
									<ErrorBoundary
										errorMessage="La recherche est temporairement indisponible."
										className="flex flex-1 items-center justify-center"
									>
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
									</ErrorBoundary>
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
									onRemoveSearch={remove}
									onClearSearches={clear}
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
