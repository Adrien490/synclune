"use client"

import { AnimatePresence } from "motion/react"
import { X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useTransition } from "react"
import { toast } from "sonner"

import { Fade } from "@/shared/components/animations/fade"
import { ErrorBoundary } from "@/shared/components/error-boundary"
import { SearchInput, type SearchInputHandle } from "@/shared/components/search-input"
import { Button } from "@/shared/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/shared/components/ui/dialog"
import { useAddRecentSearch } from "@/modules/products/hooks/use-add-recent-search"
import { useRecentSearches } from "@/modules/products/hooks/use-recent-searches"
import { useDialog } from "@/shared/providers/dialog-store-provider"
import { cn } from "@/shared/utils/cn"

import { QUICK_SEARCH_DIALOG_ID, SEARCH_DEBOUNCE_MS } from "./constants"
import type { QuickSearchCollection, QuickSearchProductType, RecentlyViewedProduct } from "./constants"
import { IdleContent } from "./idle-content"
import { QuickSearchContent } from "./quick-search-content"
import { QuickTagPills } from "./quick-tag-pills"
import { SearchResultsSkeleton } from "./search-result-item"
import { useKeyboardNavigation } from "./use-keyboard-navigation"
import { useQuickSearch } from "./use-quick-search"

interface QuickSearchDialogProps {
	recentSearches?: string[]
	collections: QuickSearchCollection[]
	productTypes: QuickSearchProductType[]
	recentlyViewed?: RecentlyViewedProduct[]
}

export function QuickSearchDialog({
	recentSearches: initialSearches = [],
	collections,
	productTypes,
	recentlyViewed = [],
}: QuickSearchDialogProps) {
	const { isOpen, close } = useDialog(QUICK_SEARCH_DIALOG_ID)
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const searchInputRef = useRef<SearchInputHandle>(null)

	const { add } = useAddRecentSearch({
		onError: () => toast.error("Erreur lors de l'enregistrement"),
	})
	const { searches, remove, clear } = useRecentSearches({
		initialSearches,
		onRemoveError: () => toast.error("Erreur lors de la suppression"),
		onClearError: () => toast.error("Erreur lors de la suppression"),
	})

	const {
		contentRef,
		handleArrowNavigation,
		focusFirst,
		resetActiveIndex,
		activeDescendantId,
	} = useKeyboardNavigation()

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
	} = useQuickSearch({ searchInputRef, resetActiveIndex })

	const hasPartialInput = inputValue.trim().length > 0 && !isSearchMode

	const navigateToSearch = (term: string, { saveToRecent = true } = {}) => {
		if (isPending) return
		if (saveToRecent) add(term)
		startTransition(() => {
			router.push(`/produits?search=${encodeURIComponent(term)}`)
			close()
		})
	}

	const handleEnterKey = (term: string) => {
		const trimmed = term.trim()
		if (!trimmed) return
		navigateToSearch(trimmed)
	}

	const handleRecentSearch = (term: string) => {
		navigateToSearch(term, { saveToRecent: false })
	}

	const handleQuickTagClick = (label: string) => {
		resetActiveIndex()
		handleSearchFromSuggestion(label)
	}

	const handleSelectResult = () => {
		add(searchQuery)
		close()
	}

	const handleViewAllResults = () => {
		navigateToSearch(searchQuery)
	}

	const handleClose = () => {
		close()
		reset()
	}

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose()
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
					"translate-x-0 translate-y-0 top-0 left-0",
					"motion-safe:data-[state=open]:slide-in-from-top-2 motion-safe:data-[state=closed]:slide-out-to-top-2",
					"motion-safe:data-[state=open]:zoom-in-100 motion-safe:data-[state=closed]:zoom-out-100",
					"flex flex-col",
					// Desktop: centered dialog
					"md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
					"md:max-h-[70vh] md:w-full md:max-w-160 md:rounded-xl md:overflow-hidden",
					"motion-safe:md:data-[state=open]:slide-in-from-top-4 motion-safe:md:data-[state=open]:zoom-in-95"
				)}
			>
				{/* Header */}
				<header
					className={cn(
						"sticky top-0 z-10 bg-background shrink-0",
						"border-b border-border md:border-b-0",
						"pt-[env(safe-area-inset-top,0)] md:pt-0"
					)}
				>
					<div className="flex items-center h-14 px-4">
						<Button
							variant="ghost"
							size="icon"
							onClick={handleClose}
							disabled={isPending}
							className="size-11 md:hidden shrink-0"
							aria-label="Fermer"
						>
							<X className="size-5" />
						</Button>

						<DialogTitle className="font-display font-medium text-lg flex-1 text-center md:text-left">
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
							className="hidden md:inline-flex size-10 shrink-0"
							aria-label="Fermer"
						>
							<X className="size-4" />
						</Button>

						{/* Spacer to center title on mobile (mirrors the close button width) */}
						<div className="size-11 md:hidden shrink-0" aria-hidden="true" />
					</div>
				</header>

				{/* Search Input */}
				<div
					className="px-4 py-3 bg-background shrink-0"
					data-pending={isPending ? "" : undefined}
					onKeyDown={(e) => {
						if (e.key === "ArrowDown" && e.target instanceof HTMLInputElement) {
							e.preventDefault()
							focusFirst()
						}
					}}
				>
					<SearchInput
						ref={searchInputRef}
						paramName="qs"
						mode="live"
						debounceMs={SEARCH_DEBOUNCE_MS}
						size="md"
						placeholder="Rechercher un bijou..."
						autoFocus
						preventMobileBlur
						isPending={isSearching}
						onLiveSearch={handleLiveSearch}
						onEscape={handleClose}
						onValueChange={handleInputValueChange}
						onSubmit={handleEnterKey}
						activeDescendantId={activeDescendantId}
						ariaExpanded={isSearchMode}
					/>
				</div>

				{/* Quick suggestion tags (idle only) */}
				{!isSearchMode && productTypes.length > 0 && (
					<div className="px-4 pb-2 bg-background shrink-0">
						<QuickTagPills
							productTypes={productTypes}
							onSelect={handleQuickTagClick}
							size="sm"
						/>
					</div>
				)}

				{/* Hint when input is too short */}
				{hasPartialInput && (
					<p className="text-xs text-muted-foreground px-4 pb-2">
						Tapez au moins 2 caractères pour rechercher
					</p>
				)}

				{/* Screen reader announcements (search mode is announced by QuickSearchContent) */}
				<div role="status" aria-live="polite" className="sr-only">
					{!isSearchMode && (
						<>
							{searches.length > 0 &&
								`${searches.length} recherche${searches.length > 1 ? "s" : ""} recente${searches.length > 1 ? "s" : ""}.`}
							{collections.length > 0 && ` ${collections.length} collection${collections.length > 1 ? "s" : ""}.`}
							{productTypes.length > 0 && ` ${productTypes.length} categorie${productTypes.length > 1 ? "s" : ""}.`}
						</>
					)}
				</div>

				{/* Content */}
				<div
					ref={contentRef}
					className={cn(
						"flex-1 min-h-0 overflow-hidden",
						"group-has-[[data-pending]]/search:opacity-50",
						"group-has-[[data-pending]]/search:pointer-events-none",
						"transition-opacity duration-200"
					)}
					onKeyDown={handleArrowNavigation}
					onMouseLeave={resetActiveIndex}
				>
					<AnimatePresence mode="wait">
						{isSearchMode ? (
							<Fade key="search-results" y={6} className="h-full">
								{isSearching && (!searchResults || searchResults === "error") ? (
									<SearchResultsSkeleton />
								) : searchResults === "error" ? (
									<div className="flex flex-col items-center justify-center h-full gap-3 px-4 py-8">
										<p className="text-sm text-muted-foreground">
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
										className="flex-1 flex items-center justify-center"
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
				<div className="h-[env(safe-area-inset-bottom,0)] shrink-0 bg-background md:hidden" />
			</DialogContent>
		</Dialog>
	)
}
