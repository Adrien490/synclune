"use client";

import { CaretRightIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react/ssr";
import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { Stagger } from "@/shared/components/animations/stagger";
import { Tap } from "@/shared/components/animations/tap";
import ScrollFade from "@/shared/components/scroll-fade";
import { Button } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import { withViewTransition } from "@/shared/utils/view-transition";

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
	const router = useRouter();

	// Defer dialog close to next frame so <Link> navigation starts first
	const handleNavigateClose = () => {
		requestAnimationFrame(() => onClose());
	};

	const handleViewAllCollections = (event: React.MouseEvent<HTMLAnchorElement>) => {
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
		event.preventDefault();
		triggerHaptic("light");
		onClose();
		withViewTransition(() => router.push("/collections"));
	};

	const handleViewAllProducts = (event: React.MouseEvent<HTMLAnchorElement>) => {
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
		event.preventDefault();
		triggerHaptic("light");
		onClose();
		withViewTransition(() => router.push("/produits"));
	};

	return (
		<ScrollFade axis="vertical" hideScrollbar={false} className="h-full overscroll-contain">
			<div className="space-y-6 p-4">
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
						<ScrollFade axis="horizontal" rootClassName="-mx-4" className="px-4">
							<div className="flex snap-x snap-mandatory gap-3">
								{recentlyViewed.map((product) => (
									<Tap key={product.slug} scale={0.97} className="snap-start">
										<Link
											href={`/creations/${product.slug}`}
											// `replace` : consomme l'entrée d'historique du dialog
											// (CLAUDE.md § Overlays).
											replace
											onClick={handleNavigateClose}
											// Pas de `role="option"` : en idle le conteneur n'est PAS un listbox
											// (F3) — une option y serait orpheline. `data-qs-option` suffit à la
											// navigation, qui déplace ici le focus DOM réel, annoncé nativement.
											data-qs-option=""
											// Reached via arrow keys, not Tab (combobox pattern).
											tabIndex={-1}
											className={cn(
												"flex w-24 shrink-0 flex-col items-center gap-2",
												"rounded-xl p-2 transition-colors",
												"hover:bg-muted",
												"focus-ring",
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
								onClick={() => {
									triggerHaptic("medium");
									onClearSearches();
								}}
								disabled={isPending}
								className="hover:text-destructive -mr-2 h-11 touch-manipulation px-3 text-sm sm:h-9"
								aria-label="Effacer toutes les recherches récentes"
							>
								Effacer
							</Button>
						</div>
						<ul className="space-y-1">
							<AnimatePresence mode="popLayout">
								{searches.map((term) => (
									/* Pas de `height`/`marginBottom` animés (relayout par frame) : `layout` +
									   `mode="popLayout"` retirent l'item du flux et font remonter ses voisins
									   via transform. */
									<m.li
										key={term}
										layout
										initial={{ opacity: 1 }}
										exit={{ opacity: 0, scale: 0.97 }}
										transition={{ duration: MOTION_CONFIG.duration.normal }}
										className="group/item flex items-center gap-1"
									>
										<Tap className="min-w-0 flex-1" scale={0.97}>
											<button
												type="button"
												onClick={() => onRecentSearch(term)}
												disabled={isPending}
												data-active={undefined}
												// Pas de `role="option"` : en idle le conteneur n'est PAS un listbox
												// (F3) — une option y serait orpheline. `data-qs-option` suffit à la
												// navigation, qui déplace ici le focus DOM réel, annoncé nativement.
												data-qs-option=""
												// Reached via arrow keys, not Tab (combobox pattern).
												tabIndex={-1}
												className={cn(
													"flex w-full items-center gap-3 rounded-xl p-3 text-left font-medium transition-colors",
													"hover:bg-muted touch-manipulation",
													"focus-ring",
													"disabled:opacity-50",
													"data-[active=true]:bg-muted",
												)}
											>
												<MagnifyingGlassIcon
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
											className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-ring flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-xl transition-[color,background-color,opacity] group-focus-within/item:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 md:opacity-0 md:group-hover/item:opacity-100"
											aria-label={`Supprimer "${term}"`}
										>
											<XIcon className="size-5 sm:size-4" />
										</button>
									</m.li>
								))}
							</AnimatePresence>
						</ul>
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
							as="ul"
							itemAs="li"
							className="grid grid-cols-2 gap-2"
							stagger={0.02}
							delay={0.03}
							y={8}
						>
							{collections.map((collection) => (
								<CollectionCard
									key={collection.slug}
									collection={collection}
									onSelect={handleNavigateClose}
								/>
							))}
						</Stagger>
						<div className="mt-3 text-center">
							<Link
								href="/collections"
								// `replace` : consomme l'entrée d'historique du dialog (CLAUDE.md § Overlays).
								replace
								onClick={handleViewAllCollections}
								className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:min-h-9"
							>
								Voir toutes les collections
								<CaretRightIcon className="size-4" aria-hidden="true" />
							</Link>
						</div>
					</section>
				)}

				{/* Empty State */}
				{!hasContent && (
					<Stagger className="py-8 text-center" role="status" stagger={0.03} delay={0.05} y={10}>
						<MagnifyingGlassIcon
							className="text-muted-foreground/20 mx-auto mb-4 size-10"
							aria-hidden="true"
						/>
						<p className="text-muted-foreground text-sm">Trouve ton prochain bijou</p>
					</Stagger>
				)}

				{/* Accès catalogue — rendu en PERMANENCE, pas seulement dans la branche
					`!hasContent` (quasi morte en production : les collections sont
					toujours chargées). Depuis que l'onglet 2 de la bottom-nav ouvre ce
					dialog au lieu de pointer vers /produits, c'est le seul chemin mobile
					vers le catalogue complet. Audit recherche 2026-07-26. */}
				<div className="text-center">
					{/* `replace` : consomme l'entrée d'historique du dialog (CLAUDE.md § Overlays). */}
					<Button
						render={<Link href="/produits" replace onClick={handleViewAllProducts} />}
						variant="outline"
						className="min-h-11 touch-manipulation sm:min-h-10"
					>
						Voir tous les produits
					</Button>
				</div>
			</div>
		</ScrollFade>
	);
}
