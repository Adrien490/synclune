"use client";

import { ChevronRight, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Stagger } from "@/shared/components/animations/stagger";
import { Tap } from "@/shared/components/animations/tap";
import ScrollFade from "@/shared/components/scroll-fade";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";

import { CollectionCard } from "./collection-card";
import type { QuickSearchCollection, RecentlyViewedProduct } from "./constants";

interface IdleContentProps {
	recentlyViewed: RecentlyViewedProduct[];
	searches: string[];
	collections: QuickSearchCollection[];
	onClose: () => void;
	onRecentSearch: (term: string) => void;
	onRemoveSearch: (term: string) => void;
	onClearSearches: () => void;
	isPending: boolean;
}

export function IdleContent({
	recentlyViewed,
	searches,
	collections,
	onClose,
	onRecentSearch,
	onRemoveSearch,
	onClearSearches,
	isPending,
}: IdleContentProps) {
	const hasContent = searches.length > 0 || collections.length > 0 || recentlyViewed.length > 0;

	// Defer dialog close to next frame so <Link> navigation starts first
	const handleNavigateClose = () => {
		requestAnimationFrame(() => onClose());
	};

	return (
		<ScrollFade axis="vertical" hideScrollbar={false} className="h-full">
			<div className="space-y-6 px-4 py-4">
				{/* Recently Viewed Products */}
				{recentlyViewed.length > 0 && (
					<section aria-labelledby="recently-viewed-heading">
						<div className="mb-3 flex items-center">
							<h2
								id="recently-viewed-heading"
								className="font-display text-muted-foreground text-base font-medium tracking-wide"
							>
								Vus récemment
							</h2>
						</div>
						<ScrollFade axis="horizontal" className="-mx-4 px-4">
							<div className="flex snap-x snap-mandatory gap-3">
								{recentlyViewed.map((product) => (
									<Tap key={product.slug} scale={0.97} className="snap-start">
										<Link
											href={`/creations/${product.slug}`}
											onClick={handleNavigateClose}
											className={cn(
												"flex w-24 shrink-0 flex-col items-center gap-2",
												"rounded-xl p-2 transition-colors",
												"hover:bg-muted",
												"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
											)}
										>
											<div className="bg-muted size-20 shrink-0 overflow-hidden rounded-lg">
												{product.image ? (
													<Image
														src={product.image.url}
														alt={product.title}
														width={80}
														height={80}
														className="size-full object-cover"
														placeholder={product.image.blurDataUrl ? "blur" : "empty"}
														blurDataURL={product.image.blurDataUrl ?? undefined}
													/>
												) : (
													<div className="bg-muted size-full" />
												)}
											</div>
											<div className="w-full min-w-0 text-center">
												<p className="truncate text-xs font-medium">{product.title}</p>
												<p className="text-muted-foreground text-xs">{formatEuro(product.price)}</p>
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
						<div className="mb-3 flex items-center justify-between">
							<h2
								id="recent-searches-heading"
								className="font-display text-muted-foreground text-base font-medium tracking-wide"
							>
								Recherches récentes
							</h2>
							<Button
								variant="ghost"
								size="sm"
								onClick={onClearSearches}
								disabled={isPending}
								className="hover:text-destructive -mr-2 h-auto px-2.5 py-1.5 text-xs"
								aria-label="Effacer toutes les recherches récentes"
							>
								Effacer
							</Button>
						</div>
						<div role="list" className="space-y-1">
							<AnimatePresence mode="popLayout">
								{searches.map((term) => (
									<motion.div
										key={term}
										role="listitem"
										layout
										initial={{ opacity: 1, height: "auto" }}
										exit={{ opacity: 0, height: 0, marginBottom: 0 }}
										transition={{ duration: 0.2 }}
										className="group/item flex items-center gap-1"
									>
										<Tap className="min-w-0 flex-1" scale={0.97}>
											<button
												type="button"
												onClick={() => onRecentSearch(term)}
												disabled={isPending}
												data-active={undefined}
												className={cn(
													"flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-medium transition-all",
													"hover:bg-muted",
													"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
													"disabled:opacity-50",
													"data-[active=true]:bg-muted",
												)}
											>
												<Search
													className="text-muted-foreground size-4 shrink-0"
													aria-hidden="true"
												/>
												<span className="flex-1 truncate">{term}</span>
											</button>
										</Tap>
										<button
											type="button"
											onClick={() => onRemoveSearch(term)}
											disabled={isPending}
											className="text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-ring flex size-11 shrink-0 items-center justify-center rounded-xl transition-all group-focus-within/item:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 md:opacity-0 md:group-hover/item:opacity-100"
											aria-label={`Supprimer "${term}"`}
										>
											<X className="size-4" />
										</button>
									</motion.div>
								))}
							</AnimatePresence>
						</div>
					</section>
				)}

				{/* Collections */}
				{collections.length > 0 && (
					<section aria-labelledby="collections-heading">
						<div className="mb-3 flex items-center">
							<h2
								id="collections-heading"
								className="font-display text-muted-foreground text-base font-medium tracking-wide"
							>
								Collections
							</h2>
						</div>
						<Stagger
							role="list"
							className="grid grid-cols-2 gap-2"
							stagger={0.02}
							delay={0.03}
							y={8}
						>
							{collections.map((collection) => (
								<div key={collection.slug} role="listitem">
									<CollectionCard collection={collection} onSelect={handleNavigateClose} />
								</div>
							))}
						</Stagger>
						<div className="mt-3 text-center">
							<Link
								href="/collections"
								onClick={handleNavigateClose}
								className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							>
								Voir toutes les collections
								<ChevronRight className="size-4" aria-hidden="true" />
							</Link>
						</div>
					</section>
				)}

				{/* Empty State */}
				{!hasContent && (
					<Stagger className="py-8 text-center" role="status" stagger={0.03} delay={0.05} y={10}>
						<Search className="text-muted-foreground/20 mx-auto mb-4 size-10" aria-hidden="true" />
						<p className="text-muted-foreground text-sm">Trouvez votre prochain bijou</p>
						<div className="mt-4">
							<Button asChild variant="outline" size="sm">
								<Link href="/produits" onClick={handleNavigateClose}>
									Voir tous les produits
								</Link>
							</Button>
						</div>
					</Stagger>
				)}
			</div>
		</ScrollFade>
	);
}
