"use client"

import { Clock, Layers, Search, Sparkles, X } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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
	collections: Array<{ slug: string; name: string; productCount: number }>
	productTypes: Array<{ slug: string; label: string }>
}

export function QuickSearchDialog({
	recentSearches: initialSearches = [],
	collections,
	productTypes,
}: QuickSearchDialogProps) {
	const { isOpen, close } = useDialog(QUICK_SEARCH_DIALOG_ID)
	const router = useRouter()
	const searchParams = useSearchParams()
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
			'button:not([disabled]), a:not([disabled]), [tabindex]:not([tabindex="-1"]):not([type="search"])'
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
		// Navigation is handled by SearchInput component
		close()
	}

	const handleRecentSearch = (term: string) => {
		startTransition(() => {
			const params = new URLSearchParams(searchParams.toString())
			params.set("search", term)
			// Reset cursor pagination
			params.delete("cursor")
			params.delete("direction")
			router.push(`/produits?${params.toString()}`)
			close()
		})
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
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
					"md:h-auto md:max-h-[70vh] md:w-full md:max-w-[640px] md:rounded-xl",
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
							onClick={close}
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
				<div
					className="px-4 py-3 bg-background shrink-0"
					data-pending={isPending ? "" : undefined}
				>
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
					className={cn(
						"flex-1 min-h-0 overflow-hidden",
						"group-has-[[data-pending]]/search:opacity-50",
						"group-has-[[data-pending]]/search:pointer-events-none",
						"transition-opacity duration-200"
					)}
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
											className="text-xs h-auto py-1.5 px-2.5 -mr-2 hover:text-destructive"
											aria-label="Effacer toutes les recherches recentes"
										>
											Effacer
										</Button>
									</div>
									<Stagger role="list" className="space-y-1" stagger={0.02} delay={0.02} y={8}>
										{displayedSearches.map((term) => (
											<div key={term} className="flex items-center gap-1 group/item">
												<Tap className="flex-1" scale={0.98}>
													<button
														type="button"
														onClick={() => handleRecentSearch(term)}
														disabled={isPending}
														className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-all text-left font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
													>
														<Search className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
														<span className="flex-1 truncate">{term}</span>
													</button>
												</Tap>
												<button
													type="button"
													onClick={() => remove(term)}
													disabled={isPending}
													className="size-11 flex items-center justify-center rounded-xl transition-all shrink-0 text-muted-foreground/40 md:opacity-0 md:group-hover/item:opacity-100 group-focus-within/item:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
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
									<div className="flex items-center justify-between mb-3">
										<h2 id="collections-heading" className="font-display text-base font-medium text-muted-foreground tracking-wide flex items-center gap-2">
											<Layers className="size-5" aria-hidden="true" />
											Collections
										</h2>
										<span className="text-xs text-muted-foreground/60">
											{collections.length} collection{collections.length > 1 ? "s" : ""}
										</span>
									</div>
									<Stagger role="list" className="grid grid-cols-2 gap-2" stagger={0.02} delay={0.03} y={8}>
										{collections.map((collection) => (
											<Tap key={collection.slug} scale={0.98}>
												<Link
													href={`/collections/${collection.slug}`}
													onClick={close}
													className="group/collection flex items-center justify-between gap-2 px-4 py-3 min-h-12 rounded-xl bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
												>
													<span className="font-medium truncate">{collection.name}</span>
													<span className="shrink-0 text-xs text-muted-foreground/60 group-hover/collection:text-muted-foreground transition-colors tabular-nums">
														{collection.productCount}
													</span>
												</Link>
											</Tap>
										))}
									</Stagger>
								</section>
							)}

							{/* Product Types */}
							{productTypes.length > 0 && (
								<section aria-labelledby="categories-heading">
									<div className="flex items-center justify-between mb-3">
										<h2 id="categories-heading" className="font-display text-base font-medium text-muted-foreground tracking-wide flex items-center gap-2">
											<Sparkles className="size-5" aria-hidden="true" />
											Categories
										</h2>
										<span className="text-xs text-muted-foreground/60">
											{productTypes.length} type{productTypes.length > 1 ? "s" : ""}
										</span>
									</div>
									<Stagger role="list" className="grid grid-cols-2 gap-2" stagger={0.02} delay={0.04} y={8}>
										{productTypes.map((type) => (
											<Tap key={type.slug} scale={0.98}>
												<Link
													href={`/produits/${type.slug}`}
													onClick={close}
													className="block px-4 py-3 min-h-12 rounded-xl bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all text-left font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
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
								<Stagger className="text-center py-8" role="status" stagger={0.03} delay={0.05} y={10}>
									<Search className="size-10 text-muted-foreground/20 mx-auto mb-4" aria-hidden="true" />
									<p className="text-sm text-muted-foreground mb-6">
										Trouvez votre prochain bijou
									</p>
									<div className="flex flex-wrap justify-center gap-2">
										<Tap scale={0.95}>
											<Link
												href="/produits/bagues"
												onClick={close}
												className="inline-flex items-center px-4 py-2 min-h-11 rounded-full bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
											>
												Bagues
											</Link>
										</Tap>
										<Tap scale={0.95}>
											<Link
												href="/produits/colliers"
												onClick={close}
												className="inline-flex items-center px-4 py-2 min-h-11 rounded-full bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
											>
												Colliers
											</Link>
										</Tap>
										<Tap scale={0.95}>
											<Link
												href="/collections"
												onClick={close}
												className="inline-flex items-center px-4 py-2 min-h-11 rounded-full bg-muted/40 hover:bg-muted border border-transparent hover:border-border transition-all text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
											>
												Collections
											</Link>
										</Tap>
									</div>
								</Stagger>
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
