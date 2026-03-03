import { ABOVE_FOLD_THRESHOLD } from "@/modules/collections/constants/image-sizes.constants";
import { Reveal } from "@/shared/components/animations/reveal";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import { Gem } from "lucide-react";
import Link from "next/link";
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
 * - Blur placeholder + priority above-fold
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
					"focus-visible:ring-primary/50 focus-visible:rounded-lg focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:outline-none",
				)}
			>
				<div
					className={cn(
						"bg-card relative overflow-hidden rounded-lg",
						// COHERENCE ProductCard: border-2 transparent
						"border-2 border-transparent shadow-sm",
						"transition-[transform,border-color,box-shadow] duration-300 ease-out",
						// Motion-reduce: desactiver transforms, garder transitions couleurs
						"motion-reduce:transition-colors",
						// COHERENCE ProductCard: border-primary/40
						"can-hover:hover:border-primary/40",
						// COHERENCE ProductCard: shadow oklch pastel
						"can-hover:hover:shadow-[0_8px_30px_-8px_var(--color-glow-pink),0_4px_15px_-5px_var(--color-glow-lavender)]",
						// COHERENCE ProductCard: transform subtil (version plus douce)
						"motion-safe:can-hover:hover:-translate-y-1.5 motion-safe:can-hover:hover:scale-[1.01]",
						// COHERENCE ProductCard: focus state
						"focus-within:border-primary/40 focus-within:shadow-primary/15 focus-within:shadow-lg",
						// Mobile tap feedback
						"active:scale-[0.98] active:transition-transform active:duration-75",
						// COHERENCE ProductCard: GPU optimization
						"can-hover:group-hover:will-change-transform",
					)}
				>
					{/* Images Bento Grid */}
					{displayImages.length > 0 ? (
						isAboveFold ? (
							<CollectionImagesGrid
								images={displayImages}
								collectionName={name}
								isAboveFold={isAboveFold}
							/>
						) : (
							<Reveal y={8} once amount={0.2}>
								<CollectionImagesGrid
									images={displayImages}
									collectionName={name}
									isAboveFold={isAboveFold}
								/>
							</Reveal>
						)
					) : (
						<div
							role="img"
							className="from-primary/5 to-primary/10 relative flex aspect-square flex-col items-center justify-center gap-3 overflow-hidden rounded-t-lg bg-linear-to-br"
							aria-label={`Collection ${name} - Aucune image disponible`}
						>
							<Gem
								className="text-primary/30 h-12 w-12 motion-safe:animate-pulse sm:h-16 sm:w-16"
								aria-hidden="true"
							/>
							<span className="text-muted-foreground text-xs" aria-hidden="true">
								Bientôt disponible
							</span>
						</div>
					)}

					{/* Titre avec elements decoratifs */}
					<div className="px-4 pb-4 text-center sm:px-5 sm:pb-5">
						{/* Gradient divider — expands on hover */}
						<div
							className={cn(
								"mx-auto mb-3 h-0.5 w-16",
								"via-primary/50 bg-linear-to-r from-transparent to-transparent",
								"origin-center transition-[transform,opacity] duration-300",
								"scale-x-75",
								// Motion-reduce: pas d'animation de scale
								"motion-reduce:scale-x-100",
								"motion-safe:can-hover:group-hover:scale-x-100 motion-safe:can-hover:group-hover:via-primary/60",
								"group-focus-within:via-primary/60 motion-safe:group-focus-within:scale-x-100",
							)}
							aria-hidden="true"
						/>

						<HeadingTag
							id={titleId}
							className={cn(
								"wrap-break-words line-clamp-2",
								"text-base tracking-wide sm:text-lg",
								"text-foreground",
							)}
						>
							{name}
						</HeadingTag>

						{/* Description (hidden on mobile for space) */}
						{description && (
							<p className="text-muted-foreground sr-only mt-1.5 line-clamp-2 text-xs sm:not-sr-only sm:block">
								{description}
							</p>
						)}

						{/* Price range */}
						{priceRange && (
							<p className="text-foreground/80 mt-1.5 text-xs font-medium">
								<span className="sr-only">Prix : </span>
								{priceRange.min === priceRange.max
									? `${formatEuro(priceRange.min, { compact: true })}`
									: `${formatEuro(priceRange.min, { compact: true })} – ${formatEuro(priceRange.max, { compact: true })}`}
							</p>
						)}

						{productCount !== undefined && productCount > 0 && (
							<p className="text-muted-foreground mt-2 text-xs">
								{productCount} article{productCount > 1 ? "s" : ""}
							</p>
						)}
					</div>
				</div>
			</Link>
		</article>
	);
}
