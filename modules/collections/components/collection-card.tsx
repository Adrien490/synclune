import { ABOVE_FOLD_THRESHOLD } from "@/modules/collections/constants/image-sizes.constants";
import { COLLECTION_TEXTS } from "@/modules/collections/constants/collection-texts.constants";
import {
	CARD_SURFACE_BASE,
	CARD_SURFACE_FOCUS,
	CARD_SURFACE_HOVER,
} from "@/shared/components/card-surface.constants";
import { PlaceholderImage } from "@/shared/components/placeholder-image";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
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
	/** Disable above-fold preload (for cards inside Suspense boundaries) */
	disablePreload?: boolean;
}

/**
 * Card de collection - Design coherent avec ProductCard via CARD_SURFACE_*.
 *
 * Pattern stretched-link : <article relative> wrappe la carte, <Link> entoure
 * uniquement le titre avec ::after qui couvre toute la carte. Le reste du contenu
 * (description, prix, compteur, cue « Decouvrir ») est decoratif/non-interactif et
 * reste cliquable via le ::after — la structure permet d'ajouter un futur CTA
 * secondaire (couche z-30) sans imbriquer button dans anchor.
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
	disablePreload = false,
}: CollectionCardProps) {
	const titleId = `collection-title-${slug}`;
	const isAboveFold = !disablePreload && index !== undefined && index < ABOVE_FOLD_THRESHOLD;
	// LCP candidate : seule la 1re carte priorise son image principale (fetchPriority=high)
	// pour eviter la concurrence bande passante sur 4G (cf ProductCard).
	const isLcpCandidate = !disablePreload && index === 0;

	const collectionUrl = `/collections/${slug}`;
	const hasImages = images !== undefined && images.length > 0;

	return (
		<article
			aria-labelledby={titleId}
			className={cn(
				CARD_SURFACE_BASE,
				"rounded-lg lg:rounded-xl",
				CARD_SURFACE_HOVER,
				"motion-safe:can-hover:hover:-translate-y-1.5 motion-safe:can-hover:hover:scale-[1.01]",
				CARD_SURFACE_FOCUS,
				"active:scale-[0.98] active:transition-transform active:duration-75",
			)}
		>
			{/* Images Bento Grid (ou placeholder) */}
			{hasImages ? (
				<CollectionImagesGrid
					images={images}
					collectionName={name}
					isAboveFold={isAboveFold}
					isLcpCandidate={isLcpCandidate}
					collectionSlug={slug}
				/>
			) : (
				<PlaceholderImage
					className="rounded-t-lg rounded-b-none border-0 lg:rounded-t-xl"
					label={`${name} — ${COLLECTION_TEXTS.PLACEHOLDER.COMING_SOON}`}
				/>
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
						"motion-reduce:scale-x-100",
						"motion-safe:can-hover:group-hover:scale-x-100 motion-safe:can-hover:group-hover:via-primary/60",
						"group-focus-within:via-primary/60 motion-safe:group-focus-within:scale-x-100",
					)}
					aria-hidden="true"
				/>

				{/* Stretched link: titre enveloppe par Link avec ::after couvrant la carte */}
				<Link
					href={collectionUrl}
					className={cn(
						"focus-ring block after:absolute after:inset-0 after:z-10 after:rounded-lg after:lg:rounded-xl",
					)}
				>
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
				</Link>

				{/* Description : visible sur tous les viewports */}
				{description && (
					<p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs">{description}</p>
				)}

				{/* From-price — signal de scan prioritaire (apres le titre, cf Baymard) */}
				{priceRange && (
					<p className="text-foreground mt-2 text-sm font-medium">
						<span className="text-muted-foreground font-normal">
							{COLLECTION_TEXTS.PRICING.FROM_LABEL}{" "}
						</span>
						{formatEuro(priceRange.min, { compact: true })}
					</p>
				)}

				{/* Product count — meta discrete (ou signal « Bientot » si 0 produit) */}
				{productCount !== undefined &&
					(productCount > 0 ? (
						<p className="text-muted-foreground mt-1 text-xs">
							{COLLECTION_TEXTS.PRODUCT_COUNT(productCount)}
						</p>
					) : (
						<p className="text-muted-foreground/80 mt-1 text-xs italic">
							{COLLECTION_TEXTS.PRODUCT_COUNT_EMPTY}
						</p>
					))}

				{/* Cue de clic decoratif : visible sur tactile, revele au hover/focus sur desktop */}
				<p
					aria-hidden="true"
					className={cn(
						"text-primary mt-2 inline-flex items-center gap-1 text-xs font-medium",
						"transition-[opacity,transform] duration-300",
						// Tactile / sans hover : toujours visible
						"translate-x-0 opacity-100",
						// Appareils hover-capables : masque jusqu'au survol
						"can-hover:opacity-0 motion-safe:can-hover:-translate-x-1",
						"can-hover:group-hover:opacity-100 motion-safe:can-hover:group-hover:translate-x-0",
						// Focus clavier : toujours revele
						"group-focus-within:translate-x-0 group-focus-within:opacity-100",
					)}
				>
					Découvrir
					<span
						aria-hidden="true"
						className="motion-safe:can-hover:group-hover:translate-x-0.5 transition-transform duration-300"
					>
						→
					</span>
				</p>
			</div>
		</article>
	);
}
