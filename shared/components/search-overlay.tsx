"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Clock, Search, Sparkles, X } from "lucide-react"

import { Stagger } from "@/shared/components/animations/stagger"
import { Tap } from "@/shared/components/animations/tap"
import { useAppForm } from "@/shared/components/forms"
import { useAddRecentSearch } from "@/shared/hooks/use-add-recent-search"
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close"
import { useClearRecentSearches } from "@/shared/hooks/use-clear-recent-searches"
import { useRemoveRecentSearch } from "@/shared/hooks/use-remove-recent-search"
import { Button } from "@/shared/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Spinner } from "@/shared/components/ui/spinner"
import { cn } from "@/shared/utils/cn"

interface ProductTypeOption {
	slug: string
	label: string
}

interface SearchOverlayProps {
	/** Placeholder text for input */
	placeholder?: string
	/** Product types for quick category navigation */
	productTypes: ProductTypeOption[]
	/** Recent searches from server (cookies) */
	recentSearches?: string[]
	/** Additional classes for the trigger button */
	triggerClassName?: string
	/** Callback when navigation pending state changes */
	onPendingChange?: (isPending: boolean) => void
}

/**
 * Fullscreen search overlay for mobile devices.
 * Features:
 * - Fixed input at top (keyboard doesn't push content)
 * - Recent searches from server cookies
 * - Quick category links
 * - Submit required to search (no live debounce)
 */
export function SearchOverlay({
	placeholder = "Rechercher...",
	productTypes,
	recentSearches = [],
	triggerClassName,
	onPendingChange,
}: SearchOverlayProps) {
	const [open, setOpen] = useState(false)
	const searchParams = useSearchParams()
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const inputRef = useRef<HTMLInputElement>(null)

	// Hooks pour les recherches recentes
	const { add } = useAddRecentSearch()
	const { searches, remove } = useRemoveRecentSearch({
		initialSearches: recentSearches,
	})
	const { clear } = useClearRecentSearches({
		initialSearches: recentSearches,
	})

	// Back button Android support
	useBackButtonClose({
		isOpen: open,
		onClose: () => setOpen(false),
		id: "search-overlay",
	})

	// Notify parent of pending state changes
	useEffect(() => {
		onPendingChange?.(isPending)
	}, [isPending, onPendingChange])

	// Get current search value from URL
	const currentSearchValue = searchParams.get("search") || ""
	const hasActiveSearch = !!currentSearchValue

	// TanStack Form
	const form = useAppForm({
		defaultValues: {
			search: currentSearchValue,
		},
	})

	// Update URL with search params (optimistic - closes immediately)
	const performSearch = (value: string) => {
		const trimmed = value.trim()
		const newSearchParams = new URLSearchParams(searchParams.toString())

		if (trimmed) {
			newSearchParams.set("search", trimmed)
		} else {
			newSearchParams.delete("search")
		}

		// Reset pagination when searching
		newSearchParams.delete("cursor")
		newSearchParams.delete("direction")

		const url = `?${newSearchParams.toString()}`

		// Close immediately (optimistic)
		setOpen(false)

		// Add to recent searches (fire-and-forget)
		if (trimmed) {
			add(trimmed)
		}

		// Navigate in parallel
		startTransition(() => {
			router.replace(url, { scroll: false })
		})
	}

	// Handle form submission
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const value = form.getFieldValue("search")
		performSearch(value)
	}

	// Search from recent
	const searchFromRecent = (term: string) => {
		form.setFieldValue("search", term)
		performSearch(term)
	}

	// Clear input
	const clearInput = () => {
		form.setFieldValue("search", "")
		inputRef.current?.focus()
	}

	// Blur input when scrolling (mobile UX)
	const handleContentScroll = () => {
		inputRef.current?.blur()
	}

	// Navigate to category
	const navigateToCategory = (slug: string) => {
		// Navigation FIRST, then close
		startTransition(() => {
			router.push(`/produits/${slug}`)
		})

		// Close after navigation starts
		setOpen(false)
	}

	// Reset search value when opening
	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			form.setFieldValue("search", currentSearchValue)
		}
		setOpen(isOpen)
	}

	const hasRecentSearches = searches.length > 0

	return (
		<>
			{/* Trigger button */}
			<Button
				variant="ghost"
				size="icon"
				onClick={() => setOpen(true)}
				className={cn("size-11 relative", triggerClassName)}
				aria-label={hasActiveSearch ? `Recherche active: ${currentSearchValue}` : "Rechercher"}
			>
				<Search className="size-5" />
				{hasActiveSearch && (
					<span
						className="absolute -top-0.5 -right-0.5 size-3 bg-primary rounded-full ring-2 ring-background"
						aria-hidden="true"
					/>
				)}
			</Button>

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent
					showCloseButton={false}
					onCloseAutoFocus={(e) => e.preventDefault()}
					className="fixed inset-0 h-[100dvh] w-full max-w-none rounded-none border-none p-0 translate-x-0 translate-y-0 top-0 left-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 flex flex-col"
				>
					{/* Header fixe */}
					<header className="sticky top-0 z-10 bg-background border-b pt-[env(safe-area-inset-top,0)]">
						<div className="flex items-center justify-between h-14 px-2">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setOpen(false)}
								className="size-11"
								aria-label="Fermer"
							>
								<ArrowLeft className="size-5" />
							</Button>
							<DialogTitle className="font-semibold">
								Rechercher
							</DialogTitle>
							{/* Spacer pour equilibrer le titre centre */}
							<div className="size-11" aria-hidden="true" />
						</div>
					</header>

					{/* Search Input */}
					<div className="px-4 py-3 border-b bg-background shrink-0">
						<form role="search" onSubmit={handleSubmit} className="flex gap-2">
							<div
								className={cn(
									"relative flex flex-1 items-center h-12",
									"rounded-xl overflow-hidden",
									"bg-muted/50 border border-input",
									"focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
									"transition-all duration-200",
									isPending && "opacity-70"
								)}
							>
								<div className="absolute left-4 flex items-center text-muted-foreground pointer-events-none">
									<Search className="h-4 w-4" />
								</div>

								<form.AppField name="search">
									{(field) => (
										<>
											<Input
												ref={inputRef}
												autoComplete="off"
												autoFocus
												type="search"
												inputMode="search"
												enterKeyHint="search"
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === "Escape") {
														e.preventDefault()
														if (field.state.value) {
															clearInput()
														} else {
															setOpen(false)
														}
													}
												}}
												className={cn(
													"pl-12 pr-12",
													"h-12",
													"text-base",
													"border-none shadow-none focus-visible:ring-0",
													"bg-transparent",
													"placeholder:text-muted-foreground/60",
													"[&::-webkit-search-cancel-button]:appearance-none"
												)}
												placeholder={placeholder}
												aria-label={placeholder}
											/>

											<AnimatePresence mode="wait">
												{field.state.value && (
													<motion.div
														initial={{ opacity: 0, scale: 0.8 }}
														animate={{ opacity: 1, scale: 1 }}
														exit={{ opacity: 0, scale: 0.8 }}
														transition={{ duration: 0.15 }}
														className="absolute right-1"
													>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															onClick={clearInput}
															className="size-10 text-muted-foreground hover:text-foreground"
															aria-label="Effacer"
														>
															<X className="size-5" />
														</Button>
													</motion.div>
												)}
											</AnimatePresence>
										</>
									)}
								</form.AppField>
							</div>

							{/* Submit button */}
							<form.Subscribe
								selector={(state) => state.values.search}
								children={(search) => (
									<Button
										type="submit"
										disabled={!search?.trim() || isPending}
										className="shrink-0 size-12 rounded-xl"
										aria-label="Rechercher"
									>
										{isPending ? <Spinner className="size-4" /> : <Search className="size-4" />}
									</Button>
								)}
							/>
						</form>
					</div>

					{/* Active search indicator - one-tap clear */}
					{hasActiveSearch && (
						<div className="px-4 py-3 bg-primary/5 border-b shrink-0">
							<div className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-2 min-w-0">
									<Search className="size-4 text-primary shrink-0" />
									<span className="text-sm truncate">
										Recherche : <strong>{currentSearchValue}</strong>
									</span>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										form.setFieldValue("search", "")
										performSearch("")
									}}
									className="shrink-0 h-8 px-3 text-xs"
								>
									Effacer
								</Button>
							</div>
						</div>
					)}

					{/* Scrollable content */}
					<div
						className={cn(
							"flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-[env(safe-area-inset-bottom,0)]",
							isPending && "pointer-events-none opacity-70"
						)}
						onScroll={handleContentScroll}
					>
						{/* Recent searches */}
						{hasRecentSearches && (
							<section>
								<div className="flex items-center justify-between mb-3">
									<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
										<Clock className="size-4" />
										Recherches recentes
									</h2>
									<button
										type="button"
										onClick={clear}
										className="text-xs text-muted-foreground hover:text-foreground transition-colors"
									>
										Effacer
									</button>
								</div>
								<Stagger className="space-y-1" stagger={0.025} delay={0.05} y={8}>
									{searches.map((term) => (
										<div key={term} className="flex items-center gap-1 group">
											<Tap className="flex-1">
												<button
													type="button"
													onClick={() => searchFromRecent(term)}
													className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
												>
													<Search className="size-4 text-muted-foreground shrink-0" />
													<span className="flex-1 truncate">{term}</span>
												</button>
											</Tap>
											<button
												type="button"
												onClick={() => remove(term)}
												className="p-1.5 hover:bg-muted rounded transition-all shrink-0 text-muted-foreground/60 hover:text-muted-foreground"
												aria-label={`Supprimer "${term}"`}
											>
												<X className="size-4" />
											</button>
										</div>
									))}
								</Stagger>
							</section>
						)}

						{/* Categories */}
						{productTypes.length > 0 && (
							<section>
								<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
									<Sparkles className="size-4" />
									Categories
								</h2>
								<Stagger className="grid grid-cols-2 gap-2" stagger={0.025} delay={0.1} y={8}>
									{productTypes.map((type) => (
										<Tap key={type.slug}>
											<button
												type="button"
												onClick={() => navigateToCategory(type.slug)}
												className="w-full px-4 py-3 min-h-11 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-ring/20 transition-all text-left font-medium"
											>
												{type.label}
											</button>
										</Tap>
									))}
								</Stagger>
							</section>
						)}

						{/* Empty state hint */}
						{!hasRecentSearches && productTypes.length === 0 && (
							<div className="text-center py-8 text-muted-foreground">
								<Search className="size-12 mx-auto mb-3 opacity-30" />
								<p className="text-sm">Saisissez votre recherche et appuyez sur le bouton</p>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
