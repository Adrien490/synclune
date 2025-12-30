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
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";

interface ProductDetailsProps {
	product: GetProductReturn;
	defaultSku: ProductSku;
	/** Nombre de paniers contenant ce produit (FOMO "dans X paniers") */
	cartsCount?: number;
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
		<div className="space-y-6">
			{/* 1. Prix + Réassurance en bloc fluide (style Etsy) */}
			<AnimatePresence mode="wait">
				<motion.div
					key={`price-${currentSku?.id || "no-sku"}`}
					variants={fadeVariants}
					initial="initial"
					animate="animate"
					exit="exit"
					transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
					className="space-y-4"
				>
					<ProductPriceDisplay selectedSku={currentSku} product={product} cartsCount={cartsCount} />
					<ProductReassurance />
				</motion.div>
			</AnimatePresence>

			{/* 2. Sélection des variantes */}
			<VariantSelector product={product} defaultSku={defaultSku} />

			{/* 3. Caractéristiques principales (avant CTA pour aider le client) */}
			<AnimatePresence mode="wait">
				<motion.div
					key={`chars-${currentSku?.id || "no-sku"}`}
					variants={fadeVariants}
					initial="initial"
					animate="animate"
					exit="exit"
					transition={{ duration: prefersReducedMotion ? 0 : 0.15, delay: 0.05 }}
				>
					<ProductCharacteristics selectedSku={currentSku} />
				</motion.div>
			</AnimatePresence>

			{/* 4. CTA principal */}
			<AddToCartForm product={product} selectedSku={currentSku} />

			<Separator className="bg-border" />

			{/* 5. Highlights produit (après CTA - pattern Etsy) */}
			<ProductHighlights product={product} />

			{/* 6. Description produit (après CTA - pattern Etsy) */}
			{product.description && (
				<div
					id="product-description"
					className="text-base tracking-normal antialiased text-muted-foreground leading-relaxed max-w-prose space-y-3"
					itemProp="description"
				>
					{product.description.split("\n").map((line, i) => (
						<p key={`desc-line-${i}`}>{line || "\u00A0"}</p>
					))}
				</div>
			)}

			{/* 7. Entretien et livraison (reste en bas) */}
			<ProductCareInfo primaryMaterial={currentSku?.material?.name} />
		</div>
	);
}
