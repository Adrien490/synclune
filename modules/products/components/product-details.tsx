"use client";

import { useSelectedSku } from "@/modules/skus/hooks/use-selected-sku";
import { ProductPriceDisplay } from "./product-price-display";
import { ProductCharacteristics } from "./product-characteristics";
import { ProductReassurance } from "./product-reassurance";
import { AddToCartForm } from "@/modules/cart/components/add-to-cart-form";
import { ProductCareInfo } from "./product-care-info";
import { VariantSelector } from "@/modules/skus/components/sku-selector";
import { Separator } from "@/shared/components/ui/separator";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";

interface ProductDetailsProps {
	product: GetProductReturn;
	defaultSku: ProductSku;
	productSlug: string;
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
	productSlug,
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
		<>
			{/* 1. Prix du SKU sélectionné - avec animation */}
			<AnimatePresence mode="wait">
				<motion.div
					key={`price-${currentSku?.id || "no-sku"}`}
					variants={fadeVariants}
					initial="initial"
					animate="animate"
					exit="exit"
					transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
				>
					<ProductPriceDisplay selectedSku={currentSku} product={product} />
				</motion.div>
			</AnimatePresence>

			{/* 2. Sélection des variantes (REMONTE - avant caractéristiques) */}
			<VariantSelector product={product} defaultSku={defaultSku} />

			{/* 3. CTA principal (REMONTE) */}
			<AddToCartForm product={product} selectedSku={currentSku} />

			{/* 4. Réassurance - juste après le CTA pour réduire l'anxiété d'achat */}
			<ProductReassurance productSlug={productSlug} />

			<Separator className="bg-border" />

			{/* 5. Caractéristiques principales - avec animation (DESCEND) */}
			<AnimatePresence mode="wait">
				<motion.div
					key={`chars-${currentSku?.id || "no-sku"}`}
					variants={fadeVariants}
					initial="initial"
					animate="animate"
					exit="exit"
					transition={{ duration: prefersReducedMotion ? 0 : 0.15, delay: 0.05 }}
				>
					<ProductCharacteristics product={product} selectedSku={currentSku} />
				</motion.div>
			</AnimatePresence>

			{/* 6. Entretien et livraison (reste en bas) */}
			<ProductCareInfo primaryMaterial={currentSku?.material?.name} />
		</>
	);
}
