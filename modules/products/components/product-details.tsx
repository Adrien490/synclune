"use client";

import { useSelectedSku } from "@/modules/skus/hooks/use-selected-sku";
import { ProductPrice } from "./product-price-card";
import { ProductCharacteristics } from "./product-characteristics";
import { AddToCartButton } from "@/modules/cart/components/add-to-cart-button";
import { ProductCareInfo } from "./product-care-info";
import { VariantSelector } from "@/modules/skus/components/sku-selector";
import { Separator } from "@/shared/components/ui/separator";
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
 */
export function ProductDetails({ product, defaultSku }: ProductDetailsProps) {
	const { selectedSku } = useSelectedSku({ product, defaultSku });

	const currentSku = selectedSku ?? defaultSku;

	return (
		<>
			{/* Prix du SKU sélectionné */}
			<ProductPrice selectedSku={currentSku} product={product} />

			{/* Caractéristiques principales */}
			<ProductCharacteristics product={product} selectedSku={currentSku} />

			<Separator className="bg-border" />

			{/* Sélection des variantes */}
			<VariantSelector product={product} />

			{/* CTA principal */}
			<AddToCartButton product={product} selectedSku={currentSku} />

			<Separator className="bg-border" />

			{/* Entretien et livraison */}
			<ProductCareInfo primaryMaterial={currentSku?.material} />
		</>
	);
}
