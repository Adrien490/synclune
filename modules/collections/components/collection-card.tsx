import {
	ABOVE_FOLD_THRESHOLD,
	COLLECTION_IMAGE_SIZES,
} from "@/modules/collections/constants/image-sizes.constants";
import { Reveal } from "@/shared/components/animations/reveal";
import { buildUrl } from "@/shared/constants/urls";
import { cn } from "@/shared/utils/cn";
import { Gem } from "lucide-react";
import Link from "next/link";
import type { CollectionImage } from "../types/collection.types";
import { CollectionImagesGrid } from "./collection-images-grid";

interface CollectionCardProps {
  slug: string;
  name: string;
  /** Description de la collection pour SEO (schema.org) */
  description?: string | null;
  /** Images multiples pour Bento Grid (prioritaire) */
  images?: CollectionImage[];
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
  index,
  sizes = COLLECTION_IMAGE_SIZES.COLLECTION_CARD,
  headingLevel: HeadingTag = "h3",
  productCount,
}: CollectionCardProps) {
  const uniqueSuffix = `${slug}-${index ?? 0}`;
  const titleId = `collection-title-${uniqueSuffix}`;
  const isAboveFold = index !== undefined && index < ABOVE_FOLD_THRESHOLD;

  const displayImages: CollectionImage[] =
    images && images.length > 0 ? images : [];

  return (
    <article itemScope itemType="https://schema.org/CollectionPage">
      <Link
        href={`/collections/${slug}`}
        className={cn(
          "group block min-w-0",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:rounded-xl",
        )}
        aria-labelledby={titleId}
        aria-label={`Voir la collection ${name}`}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-xl bg-card",
            // COHERENCE ProductCard: border-2 transparent
            "border-2 border-transparent shadow-sm",
            "transition-all duration-300 ease-out",
            // Motion-reduce: desactiver transforms, garder transitions couleurs
            "motion-reduce:transition-colors",
            // COHERENCE ProductCard: border-primary/40
            "motion-safe:can-hover:hover:border-primary/40",
            // COHERENCE ProductCard: shadow oklch pastel
            "motion-safe:can-hover:hover:shadow-[0_8px_30px_-8px_oklch(0.85_0.12_350/0.35),0_4px_15px_-5px_oklch(0.82_0.10_300/0.25)]",
            // COHERENCE ProductCard: transform subtil (version plus douce)
            "motion-safe:can-hover:hover:-translate-y-1.5 motion-safe:can-hover:hover:scale-[1.01]",
            // Active state pour feedback tactile immediat sur mobile
            "active:scale-[0.98] active:shadow-sm",
            // COHERENCE ProductCard: focus state
            "focus-within:border-primary/40 focus-within:shadow-lg focus-within:shadow-primary/15",
            // COHERENCE ProductCard: GPU optimization
            "will-change-transform",
          )}
        >
          {/* SEO: Metadata schema.org */}
          <link itemProp="url" href={buildUrl(`/collections/${slug}`)} />
          {description && (
            <meta itemProp="description" content={description.slice(0, 200)} />
          )}
          {productCount !== undefined && (
            <meta itemProp="numberOfItems" content={String(productCount)} />
          )}
          {displayImages[0] && (
            <meta itemProp="primaryImageOfPage" content={displayImages[0].url} />
          )}
          {/* Brand Schema.org (Synclune) */}
          <div
            itemProp="brand"
            itemScope
            itemType="https://schema.org/Brand"
            className="hidden"
          >
            <meta itemProp="name" content="Synclune" />
          </div>

          {/* Images Bento Grid avec animation scroll */}
          {displayImages.length > 0 ? (
            <Reveal y={8} once amount={0.2}>
              <CollectionImagesGrid
                images={displayImages}
                collectionName={name}
                isAboveFold={isAboveFold}
              />
            </Reveal>
          ) : (
            <div
              role="img"
              className="relative aspect-square overflow-hidden bg-muted rounded-t-xl flex items-center justify-center"
              aria-label={`Collection ${name} - Aucune image disponible`}
            >
              <Gem className="w-12 h-12 text-primary/40" aria-hidden="true" />
              <span className="sr-only">
                Aucune image disponible pour cette collection
              </span>
            </div>
          )}

          {/* Titre avec elements decoratifs */}
          <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-center">
            {/* Ligne decorative - utilise scale au lieu de width pour animation composable */}
            <div
              className={cn(
                "w-12 h-px mx-auto mb-3",
                "bg-linear-to-r from-transparent via-primary/40 to-transparent",
                "transition-[transform,opacity] duration-300 origin-center",
                "scale-x-[0.67]",
                // Motion-reduce: pas d'animation de scale
                "motion-reduce:scale-x-100",
                "motion-safe:can-hover:group-hover:scale-x-100 motion-safe:can-hover:group-hover:via-primary/60",
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
              itemProp="name"
            >
              {name}
            </HeadingTag>

            {/* Compteur de produits (UX e-commerce) - contraste WCAG ameliore */}
            {productCount !== undefined && productCount > 0 && (
              <p role="status" className="mt-2 text-xs text-foreground/60">
                {productCount} article{productCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
