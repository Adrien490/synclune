"use client";

import { useSelectedSku } from "@/modules/skus/hooks/use-selected-sku";
import { ProductPriceDisplay } from "./product-price-display";
import { ProductCharacteristics } from "./product-characteristics";
import { AddToCartButton } from "@/modules/cart/components/add-to-cart-button";
import { ProductCareInfo } from "./product-care-info";
import { VariantSelector } from "@/modules/skus/components/sku-selector";
import { Separator } from "@/shared/components/ui/separator";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";

interface ProductDetailsProps {
	product: GetProductReturn;
	defaultSku: ProductSku;
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
export function ProductDetails({ product, defaultSku }: ProductDetailsProps) {
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
			{/* Prix du SKU sélectionné - avec animation */}
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

			{/* Caractéristiques principales - avec animation */}
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

			<Separator className="bg-border" />

			{/* Sélection des variantes - pas d'animation (interaction directe) */}
			<VariantSelector product={product} />

			{/* CTA principal */}
			<AddToCartButton product={product} selectedSku={currentSku} />

			<Separator className="bg-border" />

			{/* Entretien et livraison */}
			<ProductCareInfo primaryMaterial={currentSku?.material?.name} />
		</>
	);
}
