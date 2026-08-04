import { ABOVE_FOLD_THRESHOLD } from "@/modules/collections/constants/image-sizes.constants";
import { COLLECTION_TEXTS } from "@/modules/collections/constants/collection-texts.constants";
import {
	CARD_SURFACE_FOCUS,
	CARD_SURFACE_HOVER,
	CARD_SURFACE_POLAROID,
} from "@/shared/components/card-surface.constants";
import { MaskingTape } from "@/shared/components/masking-tape";
import { PlaceholderImage } from "@/shared/components/placeholder-image";
import { SquiggleUnderline } from "@/shared/components/squiggle-underline";
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
	/**
	 * Index dans la liste (preload above-fold, et sens de l'inclinaison au
	 * survol : une planche sur deux penche à droite)
	 */
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
 * Card de collection — « La Planche-contact » (redesign Atelier 2026-08-03).
 *
 * @description
 * Un produit est un tirage polaroid (ProductCard) ; une collection est la
 * planche-contact de la série : un seul cadre papier (CARD_SURFACE_POLAROID +
 * grain `.polaroid-paper`), le bento existant inséré dedans (variante
 * `framed`), masking tape de coin, légende à gauche — eyebrow
 * « Collection · N créations » (le compteur promu en tête de légende), titre
 * Fraunces souligné du trait rose (SquiggleUnderline, dessiné au survol ET au
 * focus clavier), description, from-price. Au survol la planche s'incline
 * légèrement (sens alterné par index), gaté motion-safe + can-hover.
 *
 * Pattern stretched-link : <article relative> wrappe la carte, <Link> entoure
 * uniquement le titre avec ::after qui couvre toute la carte. Le reste du
 * contenu est decoratif/non-interactif et reste cliquable via le ::after —
 * aucun element decoratif ne doit intercepter les clics : tape et grain sont
 * `pointer-events-none`, sous le ::after.
 *
 * z-index stack (documented):
 * - z-1: grain papier (`.polaroid-paper::before`, pointer-events-none)
 * - z-10: Stretched link (title link ::after covers the entire card)
 * - z-20: Masking tape de coin (pointer-events-none)
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

	// Eyebrow — la sémantique « série » dite en tête de légende : compteur promu
	// (redesign 2026-08-03, remplace la ligne discrète en pied de carte de
	// l'audit F3 2026-05-29), « Bientôt » si la collection est vide.
	const eyebrow =
		productCount !== undefined
			? `${COLLECTION_TEXTS.CARD_EYEBROW_PREFIX} · ${
					productCount > 0
						? COLLECTION_TEXTS.PRODUCT_COUNT(productCount)
						: COLLECTION_TEXTS.PRODUCT_COUNT_EMPTY
				}`
			: COLLECTION_TEXTS.CARD_EYEBROW_PREFIX;

	return (
		<article
			aria-labelledby={titleId}
			className={cn(
				CARD_SURFACE_POLAROID,
				// Grain papier de la planche (::before z-1, pointer-events-none)
				"polaroid-paper",
				CARD_SURFACE_HOVER,
				// Inclinaison + lift au survol, sens alterné une planche sur deux
				"motion-safe:can-hover:hover:-translate-y-1",
				(index ?? 0) % 2 === 0
					? "motion-safe:can-hover:hover:-rotate-1"
					: "motion-safe:can-hover:hover:rotate-1",
				CARD_SURFACE_FOCUS,
			)}
		>
			{/* Masking tape de coin — silhouette distincte du tape centré produit */}
			<MaskingTape className="-top-2 -left-3.5 z-20 h-4 w-14 rotate-[-35deg]" />

			{/* Tirage inséré dans le cadre : bento adaptatif, ou placeholder */}
			{hasImages ? (
				<CollectionImagesGrid
					images={images}
					collectionName={name}
					isAboveFold={isAboveFold}
					isLcpCandidate={isLcpCandidate}
					collectionSlug={slug}
					framed
				/>
			) : (
				<PlaceholderImage
					className="rounded-sm border-0"
					label={`${name} — ${COLLECTION_TEXTS.PLACEHOLDER.COMING_SOON}`}
				/>
			)}

			{/* Légende de la planche — no position:relative so stretched link ::after
			    reaches the article */}
			<div className="flex flex-col gap-1.5 overflow-hidden px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4">
				<span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
					{eyebrow}
				</span>

				{/* Stretched link : le trait dessiné sous le titre est l'affordance du
				    lien — il se révèle au survol ET au focus clavier (WCAG 2.4.7). */}
				<Link
					href={collectionUrl}
					className="focus-ring block w-fit max-w-full after:absolute after:inset-0 after:z-10 focus-visible:rounded-sm"
				>
					<span className="relative block">
						<HeadingTag
							id={titleId}
							className="font-display text-foreground wrap-break-words line-clamp-2 text-base font-normal sm:text-lg"
						>
							{name}
						</HeadingTag>
						<SquiggleUnderline />
					</span>
				</Link>

				{/* Description : visible sur tous les viewports */}
				{description && <p className="text-muted-foreground line-clamp-2 text-xs">{description}</p>}

				{/* From-price — signal de scan prioritaire (apres le titre, cf Baymard) */}
				{priceRange && (
					<p className="text-foreground mt-0.5 text-sm font-medium">
						<span className="text-muted-foreground font-normal">
							{COLLECTION_TEXTS.PRICING.FROM_LABEL}{" "}
						</span>
						{formatEuro(priceRange.min, { compact: true })}
					</p>
				)}
			</div>
		</article>
	);
}
