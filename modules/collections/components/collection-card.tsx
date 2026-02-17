import { ABOVE_FOLD_THRESHOLD } from "@/modules/collections/constants/image-sizes.constants";
import { Reveal } from "@/shared/components/animations/reveal";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import { Gem } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import type { CollectionImage } from "../types/collection.types";
import { CollectionImagesGrid } from "./collection-images-grid";

interface CollectionCardProps {
	slug: string;
	name: string;
	/** Images multiples pour Bento Grid (prioritaire) */
	images?: CollectionImage[];
	index?: number;
	/** Niveau de heading pour hierarchie a11y (defaut: h3) */
	headingLevel?: "h2" | "h3" | "h4";
	/** Nombre de produits dans la collection (UX e-commerce) */
	productCount?: number;
	/** Description courte de la collection */
	description?: string | null;
	/** Fourchette de prix de la collection */
	priceRange?: { min: number; max: number };
}

/**
 * Card de collection - Design coherent avec ProductCard
 *
 * Meme hover effect que ProductCard + personnalite distincte:
 * - Titre centre avec ligne decorative + sparkle
 * - Transform plus subtil (-translate-y-1.5 vs -translate-y-2)
 *
 * OPTIMISATIONS:
 * - can-hover + motion-safe (WCAG 2.3.3)
 * - Shadow oklch pastel + hover-only will-change-transform
 * - Blur placeholder + preload above-fold
 */
export function CollectionCard({
	slug,
	name,
	images,
	index,
	headingLevel: HeadingTag = "h3",
	productCount,
	description,
	priceRange,
}: CollectionCardProps) {
	const uniqueSuffix = `${slug}-${index ?? 0}`;
	const titleId = `collection-title-${uniqueSuffix}`;
	const isAboveFold = index !== undefined && index < ABOVE_FOLD_THRESHOLD;

	const displayImages = images ?? [];

	return (
		<article aria-labelledby={titleId}>
			<Link
				href={`/collections/${slug}`}
				className={cn(
					"group block min-w-0",
					"focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:rounded-lg",
				)}
			>
				<div
					className={cn(
						"relative overflow-hidden rounded-lg bg-card",
						// COHERENCE ProductCard: border-2 transparent
						"border-2 border-transparent shadow-sm",
						"transition-transform duration-300 ease-out",
						// Motion-reduce: desactiver transforms, garder transitions couleurs
						"motion-reduce:transition-colors",
						// COHERENCE ProductCard: border-primary/40
						"motion-safe:can-hover:hover:border-primary/40",
						// COHERENCE ProductCard: shadow oklch pastel
						"can-hover:hover:shadow-[0_8px_30px_-8px_oklch(0.85_0.12_350/0.35),0_4px_15px_-5px_oklch(0.82_0.10_300/0.25)]",
						// COHERENCE ProductCard: transform subtil (version plus douce)
						"motion-safe:can-hover:hover:-translate-y-1.5 motion-safe:can-hover:hover:scale-[1.01]",
						// COHERENCE ProductCard: focus state
						"focus-within:border-primary/40 focus-within:shadow-lg focus-within:shadow-primary/15",
						// Mobile tap feedback
						"active:scale-[0.98] active:transition-transform active:duration-75",
						// COHERENCE ProductCard: GPU optimization
						"can-hover:group-hover:will-change-transform",
					)}
				>
					{/* Images Bento Grid avec shared element transition */}
					{displayImages.length > 0 ? (
						<ViewTransition name={`collection-${slug}`} share="vt-collection-image">
							<Reveal y={8} once amount={0.2}>
								<CollectionImagesGrid
									images={displayImages}
									collectionName={name}
									isAboveFold={isAboveFold}
								/>
							</Reveal>
						</ViewTransition>
					) : (
						<div
							role="img"
							className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 rounded-t-lg flex flex-col items-center justify-center gap-3"
							aria-label={`Collection ${name} - Aucune image disponible`}
						>
							<Gem
								className="w-12 h-12 sm:w-16 sm:h-16 text-primary/30 animate-pulse"
								aria-hidden="true"
							/>
							<span className="text-xs text-muted-foreground" aria-hidden="true">
								Bientôt disponible
							</span>
						</div>
					)}

					{/* Titre avec elements decoratifs */}
					<div className="px-4 pb-4 sm:px-5 sm:pb-5 text-center">
						{/* Gradient divider — expands on hover */}
						<div
							className={cn(
								"w-16 h-0.5 mx-auto mb-3",
								"bg-linear-to-r from-transparent via-primary/50 to-transparent",
								"transition-[transform,opacity,background] duration-300 origin-center",
								"scale-x-75",
								// Motion-reduce: pas d'animation de scale
								"motion-reduce:scale-x-100",
								"motion-safe:can-hover:group-hover:scale-x-100 motion-safe:can-hover:group-hover:via-primary/60",
								"motion-safe:group-focus-within:scale-x-100 group-focus-within:via-primary/60",
							)}
							aria-hidden="true"
						/>

						<HeadingTag
							id={titleId}
							className={cn(
								"line-clamp-2 wrap-break-words",
								"text-base sm:text-lg tracking-wide",
								"text-foreground",
							)}
						>
							{name}
						</HeadingTag>

						{/* Description (hidden on mobile for space) */}
						{description && (
							<p className="hidden sm:block mt-1.5 text-xs text-muted-foreground line-clamp-2">
								{description}
							</p>
						)}

						{/* Price range */}
						{priceRange && (
							<p className="mt-1.5 text-xs font-medium text-foreground/80">
								<span className="sr-only">Prix : </span>
								{priceRange.min === priceRange.max
									? `${formatEuro(priceRange.min, { compact: true })}`
									: `${formatEuro(priceRange.min, { compact: true })} – ${formatEuro(priceRange.max, { compact: true })}`}
							</p>
						)}

						{productCount !== undefined && productCount > 0 && (
							<p className="mt-2 text-xs text-muted-foreground">
								{productCount} article{productCount > 1 ? "s" : ""}
							</p>
						)}
					</div>
				</div>
			</Link>
		</article>
	);
}
