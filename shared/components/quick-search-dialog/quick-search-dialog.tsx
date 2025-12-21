"use client"

import { ArrowLeft, Clock, Layers, Search, Sparkles, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { Stagger } from "@/shared/components/animations/stagger"
import { Tap } from "@/shared/components/animations/tap"
import { SearchInput } from "@/shared/components/search-input"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/shared/components/ui/dialog"
import ScrollFade from "@/shared/components/ui/scroll-fade"
import { useAddRecentSearch } from "@/shared/hooks/use-add-recent-search"
import { useBackButtonClose } from "@/shared/hooks/use-back-button-close"
import { useClearRecentSearches } from "@/shared/hooks/use-clear-recent-searches"
import { useRemoveRecentSearch } from "@/shared/hooks/use-remove-recent-search"
import { useDialog } from "@/shared/providers/dialog-store-provider"
import { cn } from "@/shared/utils/cn"

import { QUICK_SEARCH_DIALOG_ID } from "./constants"

const MAX_RECENT_SEARCHES = 8

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
	const [, startTransition] = useTransition()

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

	const displayedSearches = searches.slice(0, MAX_RECENT_SEARCHES)
	const hasContent =
		searches.length > 0 || collections.length > 0 || productTypes.length > 0

	useBackButtonClose({
		isOpen,
		onClose: close,
		id: QUICK_SEARCH_DIALOG_ID,
	})

	const handleSubmit = (term: string) => {
		add(term)
		close()
	}

	const handleRecentSearch = (term: string) => {
		add(term)
		close()
		startTransition(() => {
			router.push(`/produits?search=${encodeURIComponent(term)}`)
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
					"data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2",
					"data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100",
					"flex flex-col",
					// Desktop: centered dialog
					"md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
					"md:h-[70vh] md:w-full md:max-w-[640px] md:rounded-xl",
					"md:data-[state=open]:slide-in-from-top-4 md:data-[state=open]:zoom-in-95"
				)}
			>
				{/* Header */}
				<header
					className={cn(
						"sticky top-0 z-10 bg-background shrink-0",
						"pt-[env(safe-area-inset-top,0)] md:pt-0"
					)}
				>
					<div className="flex items-center h-14 px-2 md:px-4">
						<Button
							variant="ghost"
							size="icon"
							onClick={close}
							className="size-11 md:hidden shrink-0"
							aria-label="Fermer"
						>
							<ArrowLeft className="size-5" />
						</Button>

						<DialogTitle className="font-display font-medium text-lg flex-1 text-center md:text-left">
							Rechercher
						</DialogTitle>

						<Button
							variant="ghost"
							size="icon"
							onClick={close}
							className="hidden md:inline-flex size-9 shrink-0"
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

				{/* Content */}
				<div className="flex-1 min-h-0 overflow-hidden">
					<ScrollFade axis="vertical" hideScrollbar={false} className="h-full">
						<div className="px-4 py-4 space-y-6">
							{/* Recent Searches */}
							{displayedSearches.length > 0 && (
								<section>
									<div className="flex items-center justify-between mb-3">
										<h2 className="font-display text-sm font-medium text-muted-foreground tracking-wide flex items-center gap-2">
											<Clock className="size-4" />
											Recherches recentes
										</h2>
										<button
											type="button"
											onClick={clear}
											className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-11 px-3 -mr-3"
										>
											Effacer
										</button>
									</div>
									<Stagger className="space-y-1" stagger={0.025} delay={0.05} y={8}>
										{displayedSearches.map((term) => (
											<div key={term} className="flex items-center gap-1 group">
												<Tap className="flex-1">
													<button
														type="button"
														onClick={() => handleRecentSearch(term)}
														className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
													>
														<Search className="size-4 text-muted-foreground shrink-0" />
														<span className="flex-1 truncate">{term}</span>
													</button>
												</Tap>
												<button
													type="button"
													onClick={() => remove(term)}
													className="size-10 flex items-center justify-center hover:bg-muted rounded-lg transition-all shrink-0 text-muted-foreground/60 hover:text-muted-foreground"
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
								<section>
									<h2 className="font-display text-sm font-medium text-muted-foreground tracking-wide flex items-center gap-2 mb-3">
										<Layers className="size-4" />
										Collections
									</h2>
									<Stagger className="grid grid-cols-2 gap-2" stagger={0.025} delay={0.1} y={8}>
										{collections.map((collection) => (
											<Tap key={collection.slug}>
												<Link
													href={`/collections/${collection.slug}`}
													onClick={close}
													className="block px-4 py-3 min-h-11 rounded-xl bg-muted/30 hover:bg-muted border border-transparent hover:border-border transition-all text-left font-medium"
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
								<section>
									<h2 className="font-display text-sm font-medium text-muted-foreground tracking-wide flex items-center gap-2 mb-3">
										<Sparkles className="size-4" />
										Categories
									</h2>
									<Stagger className="grid grid-cols-2 gap-2" stagger={0.025} delay={0.15} y={8}>
										{productTypes.map((type) => (
											<Tap key={type.slug}>
												<Link
													href={`/produits/${type.slug}`}
													onClick={close}
													className="block px-4 py-3 min-h-11 rounded-xl bg-muted/30 hover:bg-muted border border-transparent hover:border-border transition-all text-left font-medium"
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
								<div className="text-center py-8">
									<div className="relative mx-auto mb-4 w-16 h-16 flex items-center justify-center">
										<Search className="size-10 text-muted-foreground/20" />
									</div>
									<p className="text-sm text-muted-foreground">
										Trouvez votre prochain bijou
									</p>
								</div>
							)}

							{/* Safe area bottom spacer */}
							<div className="h-[env(safe-area-inset-bottom,0)] shrink-0 md:hidden" />
						</div>
					</ScrollFade>
				</div>
			</DialogContent>
		</Dialog>
	)
}
