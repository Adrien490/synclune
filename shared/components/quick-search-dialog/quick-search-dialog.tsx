"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, X } from "lucide-react"

import { useDialog } from "@/shared/providers/dialog-store-provider"
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close"
import { useAddRecentSearch } from "@/shared/hooks/use-add-recent-search"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/shared/components/ui/dialog"
import ScrollFade from "@/shared/components/ui/scroll-fade"
import { cn } from "@/shared/utils/cn"

import { QUICK_SEARCH_DIALOG_ID } from "./constants"
import { SearchInput } from "@/shared/components/search-input"
import { RecentSearchesSection } from "./recent-searches-section"
import { CollectionsSection } from "./collections-section"
import { ProductTypesSection } from "./product-types-section"

// =============================================================================
// Types
// =============================================================================

interface QuickSearchDialogProps {
	recentSearches?: string[]
	collections: Array<{ slug: string; name: string }>
	productTypes: Array<{ slug: string; label: string }>
}

// =============================================================================
// Sub-components
// =============================================================================

function EmptyState() {
	return (
		<div className="text-center py-8 text-muted-foreground">
			<Search className="size-12 mx-auto mb-3 opacity-30" />
			<p className="text-sm">Saisissez votre recherche</p>
		</div>
	)
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Quick search dialog orchestrator.
 * Uses Zustand dialog-store for state management.
 * Composes self-sufficient sections that manage their own logic.
 */
export function QuickSearchDialog({
	recentSearches = [],
	collections,
	productTypes,
}: QuickSearchDialogProps) {
	const { isOpen, close } = useDialog(QUICK_SEARCH_DIALOG_ID)
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const { add: addRecentSearch } = useAddRecentSearch()

	// Back button support (Android)
	useBackButtonClose({
		isOpen,
		onClose: close,
		id: QUICK_SEARCH_DIALOG_ID,
	})

	// Search handler - navigates to products page
	const handleSearch = (value: string) => {
		if (!value) return

		addRecentSearch(value)
		close()

		startTransition(() => {
			router.push(`/produits?search=${encodeURIComponent(value)}`)
		})
	}

	const hasContent =
		recentSearches.length > 0 || collections.length > 0 || productTypes.length > 0

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<DialogContent
				showCloseButton={false}
				onCloseAutoFocus={(e) => e.preventDefault()}
				className={cn(
					"group/search",
					// Mobile: fullscreen
					"fixed inset-0 h-[100dvh] w-full max-w-none rounded-none border-none p-0",
					"translate-x-0 translate-y-0 top-0 left-0",
					"data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2",
					"data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100",
					"flex flex-col",
					// Desktop: centered dialog
					"md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
					"md:h-auto md:max-h-[70vh] md:w-full md:max-w-[640px]",
					"md:rounded-xl md:border md:shadow-lg",
					"md:data-[state=open]:slide-in-from-top-4 md:data-[state=open]:zoom-in-95"
				)}
				data-pending={isPending ? "" : undefined}
			>
				{/* Header */}
				<header
					className={cn(
						"sticky top-0 z-10 bg-background shrink-0",
						"pt-[env(safe-area-inset-top,0)] md:pt-0"
					)}
				>
					<div className="flex items-center h-14 px-2 md:px-4">
						{/* Mobile: Back button */}
						<Button
							variant="ghost"
							size="icon"
							onClick={close}
							className="size-11 md:hidden shrink-0"
							aria-label="Fermer"
						>
							<ArrowLeft className="size-5" />
						</Button>

						{/* Title */}
						<DialogTitle className="font-semibold flex-1 text-center md:text-left">
							Rechercher
						</DialogTitle>

						{/* Desktop: Close button */}
						<Button
							variant="ghost"
							size="icon"
							onClick={close}
							className="hidden md:inline-flex size-9 shrink-0"
							aria-label="Fermer"
						>
							<X className="size-4" />
						</Button>

						{/* Mobile: spacer for centering */}
						<div className="size-11 md:hidden shrink-0" aria-hidden="true" />
					</div>
				</header>

				{/* Search Input */}
				<div className="px-4 py-3 bg-background shrink-0">
					<SearchInput
						onSearch={handleSearch}
						placeholder="Rechercher un produit..."
						mode="submit"
						autoFocus
						isPending={isPending}
					/>
				</div>

				{/* Content - with ScrollFade */}
				<div
					className={cn(
						"flex-1 min-h-0",
						"group-has-[[data-pending]]/search:blur-[1px] group-has-[[data-pending]]/search:pointer-events-none",
						"transition-[filter] duration-200"
					)}
				>
					<ScrollFade axis="vertical" className="h-full" hideScrollbar={false}>
						<div className="px-4 py-4 space-y-6">
							<RecentSearchesSection
								initialSearches={recentSearches}
								onSearch={handleSearch}
							/>

							<CollectionsSection collections={collections} />

							<ProductTypesSection productTypes={productTypes} />

							{!hasContent && <EmptyState />}

							{/* Safe area bottom spacer */}
							<div className="h-[env(safe-area-inset-bottom,0)] shrink-0 md:hidden" />
						</div>
					</ScrollFade>
				</div>
			</DialogContent>
		</Dialog>
	)
}
