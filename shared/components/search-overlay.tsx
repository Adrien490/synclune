"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Clock, Search, Sparkles, X } from "lucide-react"

import { useAppForm } from "@/shared/components/forms"
import {
	useAddRecentSearch,
	useRemoveRecentSearch,
	useClearRecentSearches,
} from "@/shared/features/recent-searches"
import { Button } from "@/shared/components/ui/button"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
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

	// Get current search value from URL
	const currentSearchValue = searchParams.get("search") || ""

	// TanStack Form
	const form = useAppForm({
		defaultValues: {
			search: currentSearchValue,
		},
	})

	// Update URL with search params
	const performSearch = (value: string) => {
		const trimmed = value.trim()
		const newSearchParams = new URLSearchParams(searchParams.toString())

		if (trimmed) {
			newSearchParams.set("search", trimmed)
			// Add to recent searches via hook
			add(trimmed)
		} else {
			newSearchParams.delete("search")
		}

		// Reset pagination when searching
		newSearchParams.delete("cursor")
		newSearchParams.delete("direction")

		startTransition(() => {
			router.replace(`?${newSearchParams.toString()}`, { scroll: false })
		})

		setOpen(false)
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

	// Navigate to category
	const navigateToCategory = (slug: string) => {
		setOpen(false)
		router.push(`/produits/${slug}`)
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
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className={cn("size-11", triggerClassName)}
					aria-label="Rechercher"
				>
					<Search className="size-5" />
				</Button>
			</DialogTrigger>

			<DialogContent
				showCloseButton={false}
				className="fixed inset-0 h-[100dvh] w-full max-w-none rounded-none border-none p-0 translate-x-0 translate-y-0 top-0 left-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 flex flex-col"
			>
				{/* Header fixe */}
				<header className="sticky top-0 z-10 bg-background border-b safe-area-top">
					<div className="flex items-center h-14 px-2">
						<DialogClose asChild>
							<Button
								variant="ghost"
								size="icon"
								className="size-11 shrink-0"
								aria-label="Fermer"
							>
								<ArrowLeft className="size-5" />
							</Button>
						</DialogClose>
						<DialogTitle className="flex-1 text-center font-semibold pr-11">
							Rechercher
						</DialogTitle>
					</div>
				</header>

				{/* Search Input */}
				<div className="px-4 py-3 border-b bg-background">
					<form role="search" onSubmit={handleSubmit}>
						<div
							className={cn(
								"relative flex w-full items-center h-12",
								"rounded-xl overflow-hidden",
								"bg-muted/50 border border-input",
								"focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/30",
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

						{/* Hidden submit button for keyboard */}
						<button type="submit" className="sr-only">
							Rechercher
						</button>
					</form>
				</div>

				{/* Scrollable content */}
				<div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 safe-area-bottom">
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
							<ul className="space-y-1">
								{searches.map((term) => (
									<li key={term} className="flex items-center gap-1 group">
										<button
											type="button"
											onClick={() => searchFromRecent(term)}
											className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
										>
											<Search className="size-4 text-muted-foreground shrink-0" />
											<span className="flex-1 truncate">{term}</span>
										</button>
										<button
											type="button"
											onClick={() => remove(term)}
											className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-muted rounded transition-all shrink-0"
											aria-label={`Supprimer "${term}"`}
										>
											<X className="size-4 text-muted-foreground" />
										</button>
									</li>
								))}
							</ul>
						</section>
					)}

					{/* Categories */}
					{productTypes.length > 0 && (
						<section>
							<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
								<Sparkles className="size-4" />
								Categories
							</h2>
							<ul className="grid grid-cols-2 gap-2">
								{productTypes.map((type) => (
									<li key={type.slug}>
										<button
											type="button"
											onClick={() => navigateToCategory(type.slug)}
											className="w-full px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-primary/20 transition-all text-left font-medium"
										>
											{type.label}
										</button>
									</li>
								))}
							</ul>
						</section>
					)}

					{/* Empty state hint */}
					{!hasRecentSearches && productTypes.length === 0 && (
						<div className="text-center py-8 text-muted-foreground">
							<Search className="size-12 mx-auto mb-3 opacity-30" />
							<p>Tapez votre recherche puis appuyez sur Entree</p>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
