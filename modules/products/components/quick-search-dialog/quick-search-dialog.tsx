"use client"

import { AnimatePresence } from "motion/react"
import { X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Fade } from "@/shared/components/animations/fade"
import { SearchInput } from "@/shared/components/search-input"
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

import { FOCUSABLE_SELECTOR, QUICK_SEARCH_DIALOG_ID } from "./constants"
import { IdleContent } from "./idle-content"
import { SearchResultsSkeleton } from "./search-results-skeleton"
import { useKeyboardNavigation } from "./use-keyboard-navigation"
import type { QuickSearchCollection, QuickSearchProductType, RecentlyViewedProduct } from "./types"

const KBD_STYLES = "inline-flex items-center justify-center min-w-5 h-5 px-1 rounded border border-border bg-muted/50 text-[10px] font-mono"

interface QuickSearchDialogProps {
	recentSearches?: string[]
	collections: QuickSearchCollection[]
	productTypes: QuickSearchProductType[]
	recentlyViewed?: RecentlyViewedProduct[]
	quickSearchSlot?: React.ReactNode
}

export function QuickSearchDialog({
	recentSearches: initialSearches = [],
	collections,
	productTypes,
	recentlyViewed = [],
	quickSearchSlot,
}: QuickSearchDialogProps) {
	const { isOpen, close } = useDialog(QUICK_SEARCH_DIALOG_ID)
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	const { add } = useAddRecentSearch({
		onError: () => toast.error("Erreur lors de l'enregistrement"),
	})
	const { searches, remove, clear } = useRecentSearches({
		initialSearches,
		onRemoveError: () => toast.error("Erreur lors de la suppression"),
		onClearError: () => toast.error("Erreur lors de la suppression"),
	})

	// Local input value for immediate idle/search switch (URL debounce has 300ms latency)
	const [inputValue, setInputValue] = useState("")

	const {
		activeIndex,
		setActiveIndex,
		contentRef,
		handleArrowNavigation,
		resetActiveIndex,
	} = useKeyboardNavigation()

	const isSearchMode = inputValue.trim().length > 0

	const handleInputValueChange = (value: string) => {
		setInputValue(value)
		resetActiveIndex()
	}

	const handleEnterKey = (term: string) => {
		const trimmed = term.trim()
		if (!trimmed || isPending) return

		add(trimmed)
		startTransition(() => {
			router.push(`/produits?search=${encodeURIComponent(trimmed)}`)
			close()
		})
	}

	const handleRecentSearch = (term: string) => {
		startTransition(() => {
			router.push(`/produits?search=${encodeURIComponent(term)}`)
			close()
		})
	}

	const handleQuickTagClick = (label: string) => {
		setInputValue(label)
		resetActiveIndex()
	}

	const handleClose = () => {
		close()
		setInputValue("")
		resetActiveIndex()

		// Clean up qs param from URL
		const params = new URLSearchParams(window.location.search)
		if (params.has("qs")) {
			params.delete("qs")
			const newSearch = params.toString()
			router.replace(newSearch ? `?${newSearch}` : window.location.pathname, { scroll: false })
		}
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
						// Enter on input: navigate to full search page
						if (e.key === "Enter" && e.target instanceof HTMLInputElement && activeIndex < 0) {
							e.preventDefault()
							handleEnterKey(inputValue)
							return
						}
						if (e.key === "ArrowDown" && e.target instanceof HTMLInputElement) {
							e.preventDefault()
							setActiveIndex(0)
							const firstFocusable = contentRef.current?.querySelector<HTMLElement>(
								FOCUSABLE_SELECTOR
							)
							firstFocusable?.scrollIntoView({ block: "nearest" })
						}
					}}
				>
					<SearchInput
						paramName="qs"
						mode="live"
						debounceMs={300}
						size="md"
						placeholder="Rechercher un bijou..."
						autoFocus
						preventMobileBlur
						onEscape={handleClose}
						onValueChange={handleInputValueChange}
					/>
				</div>

				{/* Quick suggestion tags (idle only) */}
				{!isSearchMode && productTypes.length > 0 && (
					<div className="px-4 pb-2 bg-background shrink-0">
						<div className="flex flex-wrap gap-1.5">
							{productTypes.map((type) => (
								<button
									key={type.slug}
									type="button"
									onClick={() => handleQuickTagClick(type.label)}
									className={cn(
										"rounded-full border bg-muted/30 hover:bg-muted",
										"text-sm px-3 py-1.5",
										"transition-colors",
										"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
									)}
								>
									{type.label}
								</button>
							))}
						</div>
					</div>
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
							/* ====== SEARCH MODE (server-rendered via parallel route) ====== */
							<Fade key="search-results" y={6} className="h-full">
								{quickSearchSlot ?? <SearchResultsSkeleton />}
							</Fade>
						) : (
							/* ====== IDLE MODE ====== */
							<Fade key="idle-content" y={6} className="h-full">
								<IdleContent
									recentlyViewed={recentlyViewed}
									searches={searches}
									collections={collections}
									productTypes={productTypes}
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

				{/* Keyboard shortcuts footer (desktop only) */}
				<div className={cn(
					"hidden md:flex items-center justify-center gap-4",
					"px-4 py-2 border-t border-border bg-background shrink-0",
					"text-xs text-muted-foreground/50"
				)}>
					<span className="flex items-center gap-1">
						<kbd className={KBD_STYLES}>↑</kbd>
						<kbd className={KBD_STYLES}>↓</kbd>
						<span className="ml-0.5">Naviguer</span>
					</span>
					<span className="flex items-center gap-1">
						<kbd className={KBD_STYLES}>↵</kbd>
						<span className="ml-0.5">Selectionner</span>
					</span>
					<span className="flex items-center gap-1">
						<kbd className={KBD_STYLES}>Esc</kbd>
						<span className="ml-0.5">Fermer</span>
					</span>
				</div>

				{/* Safe area bottom spacer */}
				<div className="h-[env(safe-area-inset-bottom,0)] shrink-0 bg-background md:hidden" />
			</DialogContent>
		</Dialog>
	)
}
