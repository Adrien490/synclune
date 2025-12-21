"use client"

import { ArrowLeft, Clock, Layers, Loader2, Search, Sparkles, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useTransition } from "react"
import { toast } from "sonner"

import { Stagger } from "@/shared/components/animations/stagger"
import { Tap } from "@/shared/components/animations/tap"
import { SearchInput } from "@/shared/components/search-input"
import { Button } from "@/shared/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/shared/components/ui/dialog"
import ScrollFade from "@/shared/components/ui/scroll-fade"
import { useAddRecentSearch } from "@/shared/hooks/use-add-recent-search"
import { useClearRecentSearches } from "@/shared/hooks/use-clear-recent-searches"
import { useRemoveRecentSearch } from "@/shared/hooks/use-remove-recent-search"
import { useDialog } from "@/shared/providers/dialog-store-provider"
import { cn } from "@/shared/utils/cn"

import { RECENT_SEARCHES_MAX_ITEMS } from "@/shared/constants/recent-searches"

import { QUICK_SEARCH_DIALOG_ID } from "./constants"

interface QuickSearchDialogProps {
	recentSearches?: string[]
	collections: Array<{ slug: string; name: string }>
	productTypes: Array<{ slug: string; label: string }>
}

export function QuickSearchDialog({
	recentSearches: initialSearches = [],
	collections,
	productTypes,
}: QuickSearchDialogProps) {
	const { isOpen, close } = useDialog(QUICK_SEARCH_DIALOG_ID)
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	const { add } = useAddRecentSearch({
		onError: () => toast.error("Erreur lors de l'enregistrement"),
	})
	const { searches, remove } = useRemoveRecentSearch({
		initialSearches,
		onError: () => toast.error("Erreur lors de la suppression"),
	})
	const { clear } = useClearRecentSearches({
		initialSearches,
		onError: () => toast.error("Erreur lors de la suppression"),
	})

	const displayedSearches = searches.slice(0, RECENT_SEARCHES_MAX_ITEMS)
	const hasContent =
		searches.length > 0 || collections.length > 0 || productTypes.length > 0

	const contentRef = useRef<HTMLDivElement>(null)

	const handleArrowNavigation = (e: React.KeyboardEvent<HTMLDivElement>) => {
		const container = contentRef.current
		if (!container) return

		const focusableSelector =
			'button:not([disabled]), a:not([disabled]), [tabindex]:not([tabindex="-1"])'
		const focusables = Array.from(
			container.querySelectorAll<HTMLElement>(focusableSelector)
		)

		if (focusables.length === 0) return

		const currentIndex = focusables.findIndex(
			(el) => el === document.activeElement
		)

		let nextIndex: number | null = null

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault()
				nextIndex =
					currentIndex === -1 ? 0 : (currentIndex + 1) % focusables.length
				break
			case "ArrowUp":
				e.preventDefault()
				nextIndex =
					currentIndex === -1
						? focusables.length - 1
						: (currentIndex - 1 + focusables.length) % focusables.length
				break
			case "Home":
				e.preventDefault()
				nextIndex = 0
				break
			case "End":
				e.preventDefault()
				nextIndex = focusables.length - 1
				break
		}

		if (nextIndex !== null && focusables[nextIndex]) {
			focusables[nextIndex].focus()
			focusables[nextIndex].scrollIntoView({ block: "nearest" })
		}
	}

	const handleSubmit = (term: string) => {
		add(term)
		startTransition(() => {
			router.push(`/produits?search=${encodeURIComponent(term)}`)
			close()
		})
	}

	const handleRecentSearch = (term: string) => {
		startTransition(() => {
			router.push(`/produits?search=${encodeURIComponent(term)}`)
			close()
		})
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<DialogContent
				showCloseButton={false}
				onCloseAutoFocus={(e) => e.preventDefault()}
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
					"md:h-auto md:max-h-[70vh] md:w-full md:max-w-[640px] md:rounded-xl",
					"motion-safe:md:data-[state=open]:slide-in-from-top-4 motion-safe:md:data-[state=open]:zoom-in-95"
				)}
			>
				{/* Loading overlay */}
				{isPending && (
					<div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] z-20 flex items-center justify-center">
						<Loader2 className="size-6 animate-spin text-muted-foreground" />
					</div>
				)}

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
							onClick={close}
							disabled={isPending}
							className="size-11 md:hidden shrink-0"
							aria-label="Fermer"
						>
							<ArrowLeft className="size-5" />
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
							onClick={close}
							disabled={isPending}
							className="hidden md:inline-flex size-10 shrink-0"
							aria-label="Fermer"
						>
							<X className="size-4" />
						</Button>

						<div className="size-11 md:hidden shrink-0" aria-hidden="true" />
					</div>
				</header>

				{/* Search Input */}
				<div className="px-4 py-3 bg-background shrink-0">
					<SearchInput
						paramName="search"
						mode="submit"
						size="md"
						placeholder="Rechercher un bijou..."
						autoFocus
						onSubmit={handleSubmit}
					/>
				</div>

				{/* Screen reader announcements */}
				<div role="status" aria-live="polite" className="sr-only">
					{displayedSearches.length > 0 &&
						`${displayedSearches.length} recherche${displayedSearches.length > 1 ? "s" : ""} recente${displayedSearches.length > 1 ? "s" : ""}.`}
					{collections.length > 0 && ` ${collections.length} collection${collections.length > 1 ? "s" : ""}.`}
					{productTypes.length > 0 && ` ${productTypes.length} categorie${productTypes.length > 1 ? "s" : ""}.`}
				</div>

				{/* Content */}
				<div
					ref={contentRef}
					className="flex-1 min-h-0 overflow-hidden"
					onKeyDown={handleArrowNavigation}
				>
					<ScrollFade axis="vertical" hideScrollbar={false} className="h-full">
						<div className="px-4 py-4 space-y-6">
							{/* Recent Searches */}
							{displayedSearches.length > 0 && (
								<section aria-labelledby="recent-searches-heading">
									<div className="flex items-center justify-between mb-3">
										<h2 id="recent-searches-heading" className="font-display text-base font-medium text-muted-foreground tracking-wide flex items-center gap-2">
											<Clock className="size-5" aria-hidden="true" />
											Recherches recentes
										</h2>
										<Button
											variant="ghost"
											size="sm"
											onClick={clear}
											disabled={isPending}
											className="text-xs h-auto py-1.5 px-2.5 -mr-2"
											aria-label="Effacer toutes les recherches recentes"
										>
											Effacer
										</Button>
									</div>
									<Stagger className="space-y-1" stagger={0.015} delay={0.02} y={6}>
										{displayedSearches.map((term) => (
											<div key={term} className="flex items-center gap-1 group/item">
												<Tap className="flex-1">
													<button
														type="button"
														onClick={() => handleRecentSearch(term)}
														disabled={isPending}
														className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors text-left font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
													>
														<Search className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
														<span className="flex-1 truncate">{term}</span>
													</button>
												</Tap>
												<button
													type="button"
													onClick={() => remove(term)}
													disabled={isPending}
													className="size-11 flex items-center justify-center rounded-lg transition-all shrink-0 text-muted-foreground/40 md:opacity-0 md:group-hover/item:opacity-100 group-focus-within/item:opacity-100 hover:bg-muted hover:text-muted-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
													aria-label={`Supprimer "${term}"`}
												>
													<X className="size-4" />
												</button>
											</div>
										))}
									</Stagger>
								</section>
							)}

							{/* Collections */}
							{collections.length > 0 && (
								<section aria-labelledby="collections-heading">
									<h2 id="collections-heading" className="font-display text-base font-medium text-muted-foreground tracking-wide flex items-center gap-2 mb-3">
										<Layers className="size-5" aria-hidden="true" />
										Collections
									</h2>
									<Stagger className="grid grid-cols-2 gap-2" stagger={0.015} delay={0.02} y={6}>
										{collections.map((collection) => (
											<Tap key={collection.slug}>
												<Link
													href={`/collections/${collection.slug}`}
													onClick={close}
													className="block px-4 py-3 min-h-11 rounded-xl bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all text-left font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
												>
													{collection.name}
												</Link>
											</Tap>
										))}
									</Stagger>
								</section>
							)}

							{/* Product Types */}
							{productTypes.length > 0 && (
								<section aria-labelledby="categories-heading">
									<h2 id="categories-heading" className="font-display text-base font-medium text-muted-foreground tracking-wide flex items-center gap-2 mb-3">
										<Sparkles className="size-5" aria-hidden="true" />
										Categories
									</h2>
									<Stagger className="grid grid-cols-2 gap-2" stagger={0.015} delay={0.02} y={6}>
										{productTypes.map((type) => (
											<Tap key={type.slug}>
												<Link
													href={`/produits/${type.slug}`}
													onClick={close}
													className="block px-4 py-3 min-h-11 rounded-xl bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all text-left font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
												>
													{type.label}
												</Link>
											</Tap>
										))}
									</Stagger>
								</section>
							)}

							{/* Empty State */}
							{!hasContent && (
								<div className="text-center py-8" role="status">
									<Search className="size-10 text-muted-foreground/20 mx-auto mb-4" aria-hidden="true" />
									<p className="text-sm text-muted-foreground mb-6">
										Trouvez votre prochain bijou
									</p>
									<div className="flex flex-wrap justify-center gap-2">
										<Link
											href="/produits/bagues"
											onClick={close}
											className="inline-flex items-center px-4 py-2 rounded-full bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
										>
											Bagues
										</Link>
										<Link
											href="/produits/colliers"
											onClick={close}
											className="inline-flex items-center px-4 py-2 rounded-full bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
										>
											Colliers
										</Link>
										<Link
											href="/collections"
											onClick={close}
											className="inline-flex items-center px-4 py-2 rounded-full bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
										>
											Collections
										</Link>
									</div>
								</div>
							)}
						</div>
					</ScrollFade>
				</div>

				{/* Safe area bottom spacer - outside ScrollFade */}
				<div className="h-[env(safe-area-inset-bottom,0)] shrink-0 bg-background md:hidden" />
			</DialogContent>
		</Dialog>
	)
}
