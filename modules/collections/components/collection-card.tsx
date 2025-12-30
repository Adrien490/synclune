import { COLLECTION_IMAGE_SIZES } from "@/modules/collections/constants/image-sizes.constants";
import { cn } from "@/shared/utils/cn";
import { Gem } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CollectionImagesGrid } from "./collection-images-grid";

interface CollectionImage {
	url: string;
	blurDataUrl?: string | null;
	alt?: string | null;
}

interface CollectionCardProps {
	slug: string;
	name: string;
	description: string | null;
	/** Images multiples pour Bento Grid (prioritaire) */
	images?: CollectionImage[];
	/** @deprecated Utiliser images[] à la place */
	imageUrl?: string | null;
	/** @deprecated Utiliser images[] à la place */
	blurDataUrl?: string | null;
	showDescription?: boolean;
	index?: number;
	/** Custom sizes pour contextes differents (grid vs carousel) */
	sizes?: string;
	/** Niveau de heading pour hierarchie a11y (defaut: h3) */
	headingLevel?: "h2" | "h3" | "h4";
	/** Nombre de produits dans la collection (UX e-commerce) */
	productCount?: number;
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
 * - Shadow oklch pastel + will-change-transform
 * - Blur placeholder + preload above-fold
 * - Schema.org Collection
 */
export function CollectionCard({
	slug,
	name,
	description,
	images,
	imageUrl,
	blurDataUrl,
	showDescription = false,
	index,
	sizes = COLLECTION_IMAGE_SIZES.COLLECTION_CARD,
	headingLevel: HeadingTag = "h3",
	productCount,
}: CollectionCardProps) {
	const titleId = `collection-title-${slug}-${index ?? 0}`;
	const isAboveFold = index !== undefined && index < 4;

	// Support legacy props (imageUrl/blurDataUrl) en les convertissant en images[]
	const displayImages: CollectionImage[] =
		images && images.length > 0
			? images
			: imageUrl
				? [{ url: imageUrl, blurDataUrl, alt: null }]
				: [];

	return (
		<article itemScope itemType="https://schema.org/Collection">
			<Link
				href={`/collections/${slug}`}
				className={cn(
					"group block min-w-0",
					"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-xl",
				)}
				aria-labelledby={titleId}
			>
				<div
					className={cn(
						"relative overflow-hidden rounded-xl bg-card",
						// COHÉRENCE ProductCard: border-2 transparent
						"border-2 border-transparent shadow-sm",
						"transition-all duration-300 ease-out",
						// Motion-reduce: désactiver transforms, garder transitions couleurs
						"motion-reduce:transition-colors",
						// COHÉRENCE ProductCard: border-primary/40
						"motion-safe:can-hover:hover:border-primary/40",
						// COHÉRENCE ProductCard: shadow oklch pastel
						"motion-safe:can-hover:hover:shadow-[0_8px_30px_-8px_oklch(0.85_0.12_350/0.35),0_4px_15px_-5px_oklch(0.82_0.10_300/0.25)]",
						// COHÉRENCE ProductCard: transform subtil (version plus douce)
						"motion-safe:can-hover:hover:-translate-y-1.5 motion-safe:can-hover:hover:scale-[1.01]",
						// Active state pour feedback tactile immédiat sur mobile
						"active:scale-[0.98] active:shadow-sm",
						// COHÉRENCE ProductCard: focus state
						"focus-within:border-primary/40 focus-within:shadow-lg focus-within:shadow-primary/15",
						// COHÉRENCE ProductCard: GPU optimization
						"will-change-transform",
					)}
				>
					{/* SEO: URL de la collection */}
					<meta
						itemProp="url"
						content={`${process.env.NEXT_PUBLIC_BASE_URL ?? "https://synclune.fr"}/collections/${slug}`}
					/>

					{/* Images Bento Grid */}
					{displayImages.length > 0 ? (
						<CollectionImagesGrid
							images={displayImages}
							collectionName={name}
							isAboveFold={isAboveFold}
						/>
					) : (
						<div
							className="relative aspect-square overflow-hidden bg-muted rounded-t-xl flex items-center justify-center"
							aria-label={`Aucune image pour la collection ${name}`}
						>
							<Gem className="w-12 h-12 text-primary/40" aria-hidden="true" />
						</div>
					)}

					{/* Titre avec elements decoratifs */}
					<div className="px-4 pb-4 sm:px-5 sm:pb-5 text-center">
						{/* Ligne decorative - utilise scale au lieu de width pour animation composable */}
						<div
							className={cn(
								"w-12 h-px mx-auto mb-3",
								"bg-gradient-to-r from-transparent via-primary/40 to-transparent",
								"transition-[transform,opacity] duration-300 origin-center",
								"scale-x-[0.67]",
								"motion-safe:can-hover:group-hover:scale-x-100 motion-safe:can-hover:group-hover:via-primary/60",
							)}
							aria-hidden="true"
						/>

						<HeadingTag
							id={titleId}
							className={cn(
								"line-clamp-2 break-words",
								"text-base sm:text-lg tracking-wide",
								"text-foreground",
							)}
							itemProp="name"
						>
							{name}
						</HeadingTag>

						{/* Description optionnelle */}
						{showDescription && description && (
							<p
								className="mt-2 text-sm/6 line-clamp-2 break-words text-muted-foreground"
								itemProp="description"
							>
								{description}
							</p>
						)}

						{/* Compteur de produits (UX e-commerce) */}
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
