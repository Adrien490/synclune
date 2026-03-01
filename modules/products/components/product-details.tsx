"use client";

import { useSelectedSku } from "@/modules/skus/hooks/use-selected-sku";
import { ProductPriceDisplay } from "./product-price-display";
import { ProductCharacteristics } from "./product-characteristics";
import { ProductReassurance } from "./product-reassurance";
import { ProductHighlights } from "./product-highlights";
import { AddToCartForm } from "@/modules/cart/components/add-to-cart-form";
import { ProductCareInfo } from "./product-care-info";
import { VariantSelector } from "@/modules/skus/components/sku-selector";
import { Separator } from "@/shared/components/ui/separator";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { RatingStars } from "@/shared/components/rating-stars";
import { formatRating } from "@/shared/utils/rating-utils";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";
import type { ProductReviewStatistics } from "@/modules/reviews/types/review.types";

interface ProductDetailsProps {
	product: GetProductReturn;
	defaultSku: ProductSku;
	/** Nombre de paniers contenant ce produit (FOMO "dans X paniers") */
	cartsCount?: number;
	/** Review stats for micro-summary near CTA */
	reviewStats?: ProductReviewStatistics;
}

/**
 * ProductDetails - Wrapper client pour la section de détails produit
 *
 * Utilise useSelectedSku pour synchroniser le SKU avec les paramètres URL.
 * Quand l'utilisateur sélectionne une variante (couleur, matériau, taille),
 * l'URL change et ce composant re-calcule automatiquement le SKU sélectionné.
 *
 * Responsabilités :
 * - Calculer le SKU sélectionné depuis les searchParams URL
 * - Orchestrer les composants enfants : Prix, Caractéristiques, Sélecteurs, Panier, Entretien
 * - Animer les transitions lors du changement de variante
 */
export function ProductDetails({
	product,
	defaultSku,
	cartsCount,
	reviewStats,
}: ProductDetailsProps) {
	const { selectedSku } = useSelectedSku({ product, defaultSku });
	const prefersReducedMotion = useReducedMotion();

	const currentSku = selectedSku ?? defaultSku;

	// Animation variants
	const fadeVariants = {
		initial: prefersReducedMotion ? {} : { opacity: 0, y: 4 },
		animate: { opacity: 1, y: 0 },
		exit: prefersReducedMotion ? {} : { opacity: 0, y: -4 },
	};

	return (
		<div className="space-y-8">
			{/* 1. Prix (Baymard: visible en premier) */}
			<AnimatePresence mode="wait">
				<m.div
					key={`price-${currentSku?.id || "no-sku"}`}
					variants={fadeVariants}
					initial="initial"
					animate="animate"
					exit="exit"
					transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
				>
					<ProductPriceDisplay selectedSku={currentSku} product={product} cartsCount={cartsCount} />
				</m.div>
			</AnimatePresence>

			{/* 2. Review micro-summary near decision zone (Baymard: social proof near CTA) */}
			{reviewStats && reviewStats.totalCount > 0 && (
				<a
					href="#reviews"
					className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-2 text-sm transition-colors"
					aria-label={`Note moyenne: ${formatRating(reviewStats.averageRating)} sur 5, basée sur ${reviewStats.totalCount} avis. Voir les avis`}
				>
					<RatingStars rating={reviewStats.averageRating} maxRating={5} size="sm" />
					<span className="text-foreground font-medium">
						{formatRating(reviewStats.averageRating)}
					</span>
					<span>({reviewStats.totalCount} avis)</span>
				</a>
			)}

			{/* 3. Sélection des variantes */}
			<VariantSelector product={product} defaultSku={defaultSku} />

			{/* 4. CTA principal (monté pour réduire la distance au fold - Baymard) */}
			<AddToCartForm product={product} selectedSku={currentSku} />

			{/* 5. Réassurance (après CTA - "decision support") */}
			<ProductReassurance />

			{/* 5. Caractéristiques principales */}
			<AnimatePresence mode="wait">
				<m.div
					key={`chars-${currentSku?.id || "no-sku"}`}
					variants={fadeVariants}
					initial="initial"
					animate="animate"
					exit="exit"
					transition={{ duration: prefersReducedMotion ? 0 : 0.15, delay: 0.05 }}
				>
					<ProductCharacteristics selectedSku={currentSku} />
				</m.div>
			</AnimatePresence>

			<Separator className="bg-border" />

			{/* 6. Highlights produit (après CTA - pattern Etsy) */}
			<ProductHighlights product={product} />

			{/* 7. Description produit (après CTA - pattern Etsy) */}
			{product.description && (
				<div
					id="product-description"
					className="text-muted-foreground max-w-prose space-y-3 text-base leading-relaxed tracking-normal antialiased"
					itemProp="description"
				>
					{product.description.split("\n").map((line, i) => (
						<p key={`desc-line-${i}`}>{line || "\u00A0"}</p>
					))}
				</div>
			)}

			{/* 8. Entretien et livraison (reste en bas) */}
			<ProductCareInfo primaryMaterial={currentSku?.material?.name} />
		</div>
	);
}
