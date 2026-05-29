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
			{/* 1. Prix (Baymard: visible en premier).
			    Pas de wrapper aria-live ici : ProductPriceDisplay possède déjà ses propres
			    annonces SR (aria-live + sr-only "Prix mis à jour : ..."). */}
			<AnimatePresence mode="popLayout">
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

			{/* 2. Sélection des variantes */}
			<VariantSelector product={product} defaultSku={defaultSku} />

			{/* 3. CTA principal (monté pour réduire la distance au fold - Baymard) */}
			<AddToCartForm product={product} selectedSku={currentSku} />

			{/* 4. Estimation livraison dynamique */}
			<DeliveryEstimator />

			{/* 5. Description produit — remontée près du CTA pour valoriser le storytelling
			    artisanal (levier de conversion), surtout sur mobile. */}
			{product.description && (
				<div
					id="product-description"
					className="text-muted-foreground max-w-prose space-y-3 text-base leading-relaxed tracking-normal antialiased"
				>
					<h2 className="sr-only">Description</h2>
					{product.description.split("\n").map((line, i) => (
						<p key={`desc-line-${i}`}>{line || "\u00A0"}</p>
					))}
				</div>
			)}

			{/* 6. Réassurance (après CTA - "decision support") */}
			<ProductReassurance />

			{/* 7. Caractéristiques principales. */}
			<AnimatePresence mode="popLayout">
				<m.div
					key={`chars-${currentSku.id || "no-sku"}`}
					variants={fadeVariants}
					initial="initial"
					animate="animate"
					exit="exit"
					transition={{
						duration: prefersReducedMotion ? 0 : MOTION_CONFIG.duration.fast,
						delay: prefersReducedMotion ? 0 : 0.05,
					}}
				>
					<ProductCharacteristics selectedSku={currentSku} />
				</m.div>
			</AnimatePresence>

			<Separator />

			{/* 8. Highlights produit (après CTA - pattern Etsy) */}
			<ProductHighlights product={product} />

			{/* 9. Entretien et livraison (reste en bas) */}
			<ProductCareInfo primaryMaterial={currentSku.materials[0]?.material.name} />
		</div>
	);
}
