"use client"

import { AnimatePresence } from "motion/react"
import { ChevronRight, Clock, Eye, Layers, Search, Sparkles, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { Fade } from "@/shared/components/animations/fade"
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
import ScrollFade from "@/shared/components/scroll-fade"
import { useAddRecentSearch } from "@/modules/products/hooks/use-add-recent-search"
import { useRecentSearches } from "@/modules/products/hooks/use-recent-searches"
import { useDialog } from "@/shared/providers/dialog-store-provider"
import { cn } from "@/shared/utils/cn"
import { formatEuro } from "@/shared/utils/format-euro"

import { FOCUSABLE_SELECTOR, QUICK_SEARCH_DIALOG_ID } from "./constants"
import { SearchResultsSkeleton } from "./search-results-skeleton"

interface RecentlyViewedProduct {
	slug: string
	title: string
	price: number
	image: { url: string; blurDataUrl: string | null } | null
}

interface QuickSearchDialogProps {
	recentSearches?: string[]
	collections: Array<{
		slug: string
		name: string
		productCount: number
		image: { url: string; blurDataUrl: string | null } | null
	}>
	productTypes: Array<{ slug: string; label: string }>
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

	// Keyboard navigation state
	const [activeIndex, setActiveIndex] = useState(-1)

	const isSearchMode = inputValue.trim().length > 0
	const hasIdleContent = searches.length > 0 || collections.length > 0 || productTypes.length > 0 || recentlyViewed.length > 0

	const contentRef = useRef<HTMLDivElement>(null)

	// Sync data-active attribute on focusable elements
	useEffect(() => {
		const container = contentRef.current
		if (!container) return

		const focusables = Array.from(
			container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
		)

		for (let i = 0; i < focusables.length; i++) {
			if (i === activeIndex) {
				focusables[i].setAttribute("data-active", "true")
			} else {
				focusables[i].removeAttribute("data-active")
			}
		}
	}, [activeIndex])

	const getFocusableElements = () => {
		const container = contentRef.current
		if (!container) return []
		return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
	}

	const handleArrowNavigation = (e: React.KeyboardEvent<HTMLDivElement>) => {
		const focusables = getFocusableElements()
		if (focusables.length === 0) return

		let nextIndex: number | null = null

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault()
				nextIndex = activeIndex < focusables.length - 1 ? activeIndex + 1 : 0
				break
			case "ArrowUp":
				e.preventDefault()
				nextIndex = activeIndex > 0 ? activeIndex - 1 : focusables.length - 1
				break
			case "Home":
				e.preventDefault()
				nextIndex = 0
				break
			case "End":
				e.preventDefault()
				nextIndex = focusables.length - 1
				break
			case "Enter":
				if (activeIndex >= 0 && focusables[activeIndex]) {
					e.preventDefault()
					focusables[activeIndex].click()
					return
				}
				break
		}

		if (nextIndex !== null) {
			setActiveIndex(nextIndex)
			focusables[nextIndex]?.scrollIntoView({ block: "nearest" })
		}
	}

	const handleMouseEnter = (element: HTMLElement) => {
		const focusables = getFocusableElements()
		const index = focusables.indexOf(element)
		if (index !== -1) {
			setActiveIndex(index)
		}
	}

	const handleInputValueChange = (value: string) => {
		setInputValue(value)
		setActiveIndex(-1)
	}

	const handleEnterKey = (term: string) => {
		const trimmed = term.trim()
		if (!trimmed) return

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
		setActiveIndex(-1)
	}

	const handleClose = () => {
		close()
		setInputValue("")
		setActiveIndex(-1)

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

				{/* Screen reader announcements */}
				<div role="status" aria-live="polite" className="sr-only">
					{isSearchMode
						? "Recherche en cours..."
						: <>
							{searches.length > 0 &&
								`${searches.length} recherche${searches.length > 1 ? "s" : ""} recente${searches.length > 1 ? "s" : ""}.`}
							{collections.length > 0 && ` ${collections.length} collection${collections.length > 1 ? "s" : ""}.`}
							{productTypes.length > 0 && ` ${productTypes.length} categorie${productTypes.length > 1 ? "s" : ""}.`}
						</>
					}
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
					onMouseLeave={() => setActiveIndex(-1)}
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
								<ScrollFade axis="vertical" hideScrollbar={false} className="h-full">
									<div className="px-4 py-4 space-y-6">
										{/* Recently Viewed Products */}
										{recentlyViewed.length > 0 && (
											<section aria-labelledby="recently-viewed-heading">
												<div className="flex items-center mb-3">
													<h2 id="recently-viewed-heading" className="font-display text-base font-medium text-muted-foreground tracking-wide flex items-center gap-2">
														<Eye className="size-5" aria-hidden="true" />
														Vus recemment
													</h2>
												</div>
												<ScrollFade axis="horizontal" className="-mx-4 px-4">
													<div className="flex gap-3">
														{recentlyViewed.map((product) => (
															<Tap key={product.slug} scale={0.97}>
																<Link
																	href={`/creations/${product.slug}`}
																	onClick={() => close()}
																	className={cn(
																		"flex flex-col items-center gap-2 w-24 shrink-0",
																		"rounded-xl p-2 transition-colors",
																		"hover:bg-muted",
																		"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
																	)}
																>
																	<div className="size-20 rounded-lg overflow-hidden bg-muted shrink-0">
																		{product.image ? (
																			<Image
																				src={product.image.url}
																				alt={product.title}
																				width={80}
																				height={80}
																				className="size-full object-cover"
																				{...(product.image.blurDataUrl ? { placeholder: "blur", blurDataURL: product.image.blurDataUrl } : {})}
																			/>
																		) : (
																			<div className="size-full bg-muted" />
																		)}
																	</div>
																	<div className="w-full text-center min-w-0">
																		<p className="text-xs font-medium truncate">{product.title}</p>
																		<p className="text-xs text-muted-foreground">{formatEuro(product.price)}</p>
																	</div>
																</Link>
															</Tap>
														))}
													</div>
												</ScrollFade>
											</section>
										)}

										{/* Recent Searches */}
										{searches.length > 0 && (
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
													{searches.map((term) => (
														<div key={term} role="listitem" className="flex items-center gap-1 group/item">
															<Tap className="flex-1 min-w-0" scale={0.97}>
																<button
																	type="button"
																	onClick={() => handleRecentSearch(term)}
																	disabled={isPending}
																	onMouseEnter={(e) => handleMouseEnter(e.currentTarget)}
																	data-active={undefined}
																	className={cn(
																		"w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left font-medium",
																		"hover:bg-muted",
																		"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
																		"disabled:opacity-50",
																		"data-[active=true]:bg-muted"
																	)}
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
												<div className="flex items-center mb-3">
													<h2 id="collections-heading" className="font-display text-base font-medium text-muted-foreground tracking-wide flex items-center gap-2">
														<Layers className="size-5" aria-hidden="true" />
														Collections
													</h2>
												</div>
												<Stagger role="list" className="grid grid-cols-2 gap-2" stagger={0.02} delay={0.03} y={8}>
													{collections.map((collection) => (
														<Tap key={collection.slug} role="listitem" scale={0.97}>
															<Link
																href={`/collections/${collection.slug}`}
																onClick={() => close()}
																onMouseEnter={(e) => handleMouseEnter(e.currentTarget)}
																data-active={undefined}
																className={cn(
																	"group/collection flex items-center gap-2 px-3 py-3 min-h-12 rounded-xl",
																	"bg-muted/40 hover:bg-muted border border-transparent hover:border-border",
																	"transition-all text-left",
																	"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
																	"data-[active=true]:bg-muted data-[active=true]:border-border"
																)}
															>
																{collection.image && (
																	<div className="size-8 shrink-0 rounded-lg overflow-hidden bg-muted">
																		<Image
																			src={collection.image.url}
																			alt=""
																			width={32}
																			height={32}
																			className="size-full object-cover"
																			{...(collection.image.blurDataUrl ? { placeholder: "blur", blurDataURL: collection.image.blurDataUrl } : {})}
																		/>
																	</div>
																)}
																<span className="font-medium truncate flex-1">{collection.name}</span>
																<span className="shrink-0 text-xs text-muted-foreground/60 group-hover/collection:text-muted-foreground transition-colors tabular-nums">
																	{collection.productCount}
																</span>
															</Link>
														</Tap>
													))}
												</Stagger>
												<div className="mt-3 text-center">
													<Link
														href="/collections"
														onClick={() => close()}
														className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none rounded-md px-2 py-1"
													>
														Voir toutes les collections
														<ChevronRight className="size-4" aria-hidden="true" />
													</Link>
												</div>
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
														<Tap key={type.slug} role="listitem" scale={0.97}>
															<Link
																href={`/produits/${type.slug}`}
																onClick={() => close()}
																onMouseEnter={(e) => handleMouseEnter(e.currentTarget)}
																data-active={undefined}
																className={cn(
																	"block px-4 py-3 min-h-12 rounded-xl",
																	"bg-muted/40 hover:bg-muted border border-transparent hover:border-border",
																	"transition-all text-left font-medium",
																	"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
																	"data-[active=true]:bg-muted data-[active=true]:border-border"
																)}
															>
																{type.label}
															</Link>
														</Tap>
													))}
												</Stagger>
											</section>
										)}

										{/* Empty State */}
										{!hasIdleContent && (
											<Stagger className="text-center py-8" role="status" stagger={0.03} delay={0.05} y={10}>
												<Search className="size-10 text-muted-foreground/20 mx-auto mb-4" aria-hidden="true" />
												<p className="text-sm text-muted-foreground">
													Trouvez votre prochain bijou
												</p>
											</Stagger>
										)}
									</div>
								</ScrollFade>
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
						<kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded border border-border bg-muted/50 text-[10px] font-mono">↑</kbd>
						<kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded border border-border bg-muted/50 text-[10px] font-mono">↓</kbd>
						<span className="ml-0.5">Naviguer</span>
					</span>
					<span className="flex items-center gap-1">
						<kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded border border-border bg-muted/50 text-[10px] font-mono">↵</kbd>
						<span className="ml-0.5">Selectionner</span>
					</span>
					<span className="flex items-center gap-1">
						<kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded border border-border bg-muted/50 text-[10px] font-mono">Esc</kbd>
						<span className="ml-0.5">Fermer</span>
					</span>
				</div>

				{/* Safe area bottom spacer */}
				<div className="h-[env(safe-area-inset-bottom,0)] shrink-0 bg-background md:hidden" />
			</DialogContent>
		</Dialog>
	)
}
