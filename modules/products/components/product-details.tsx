"use client";

import { useSelectedSku } from "@/modules/skus/hooks/use-selected-sku";
import { ProductPriceDisplay } from "./product-price-display";
import { ProductCharacteristics } from "./product-characteristics";
import { ProductReassurance } from "./product-reassurance";
import { DeliveryEstimator } from "./delivery-estimator";
import { ProductHighlights } from "./product-highlights";
import { AddToCartForm } from "@/modules/cart/components/add-to-cart-form";
import { ProductCareInfo } from "./product-care-info";
import { VariantSelector } from "@/modules/skus/components/sku-selector";
import { Separator } from "@/shared/components/ui/separator";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";

import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";

interface ProductDetailsProps {
	product: GetProductReturn;
	defaultSku: ProductSku;
	/** Nombre de paniers contenant ce produit (FOMO "dans X paniers") */
	cartsCount?: number;
	/** Whether this product is in the user's wishlist */
	isInWishlist?: boolean;
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
	isInWishlist,
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
			{/* 1. Prix (Baymard: visible en premier) — wrapper stable aria-live pour que les
			    lecteurs d'écran annoncent le changement malgré le remount AnimatePresence */}
			<div aria-live="polite" aria-atomic="false">
				<AnimatePresence mode="wait">
					<m.div
						key={`price-${currentSku.id || "no-sku"}`}
						variants={fadeVariants}
						initial="initial"
						animate="animate"
						exit="exit"
						transition={{
							duration: prefersReducedMotion ? 0 : MOTION_CONFIG.duration.normal,
						}}
					>
						<ProductPriceDisplay
							selectedSku={currentSku}
							product={product}
							cartsCount={cartsCount}
							isInWishlist={isInWishlist}
						/>
					</m.div>
				</AnimatePresence>
			</div>

			{/* 2. Sélection des variantes */}
			<VariantSelector product={product} defaultSku={defaultSku} />

			{/* 4. CTA principal (monté pour réduire la distance au fold - Baymard) */}
			<AddToCartForm product={product} selectedSku={currentSku} />

			{/* 5. Estimation livraison dynamique */}
			<DeliveryEstimator />

			{/* 6. Réassurance (après CTA - "decision support") */}
			<ProductReassurance />

			{/* 5. Caractéristiques principales — wrapper stable aria-live */}
			<div aria-live="polite" aria-atomic="false">
				<AnimatePresence mode="wait">
					<m.div
						key={`chars-${currentSku.id || "no-sku"}`}
						variants={fadeVariants}
						initial="initial"
						animate="animate"
						exit="exit"
						transition={{
							duration: prefersReducedMotion ? 0 : MOTION_CONFIG.duration.fast,
							delay: 0.05,
						}}
					>
						<ProductCharacteristics selectedSku={currentSku} />
					</m.div>
				</AnimatePresence>
			</div>

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
			<ProductCareInfo primaryMaterial={currentSku.materials[0]?.material.name} />
		</div>
	);
}
