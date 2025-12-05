"use client";

import { useCallback } from "react";
import { ProductCard } from "./product-card";
import { VariantSelectionDrawer } from "@/modules/skus/components/variant-selection-drawer";
import { useVariantSelectionDrawer } from "@/modules/skus/hooks/use-variant-selection-drawer";
import type { Product } from "@/modules/products/types/product.types";
import type { ColorSwatch } from "@/modules/products/services/product-list-helpers";

interface ProductCardWithDrawerProps {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	price: number;
	stockStatus: "in_stock" | "out_of_stock";
	stockMessage: string;
	inventory?: number;
	primaryImage: {
		url: string;
		alt: string | null;
		mediaType: "IMAGE";
		blurDataUrl?: string;
	};
	showDescription?: boolean;
	size?: "sm" | "md" | "lg";
	index?: number;
	viewTransitionContext?: string;
	primarySkuId?: string;
	isInWishlist?: boolean;
	/** Couleurs disponibles pour les pastilles */
	colors?: ColorSwatch[];
	/** Indique si le produit a plusieurs variantes */
	hasMultipleVariants?: boolean;
	/** Données complètes du produit pour le drawer */
	product?: Product;
}

/**
 * Wrapper client autour de ProductCard qui gère le drawer de sélection de variantes
 *
 * Utilisé quand un produit a plusieurs variantes et nécessite une sélection
 * avant l'ajout au panier ou à la wishlist.
 */
export function ProductCardWithDrawer({
	product,
	hasMultipleVariants = false,
	...cardProps
}: ProductCardWithDrawerProps) {
	const drawer = useVariantSelectionDrawer();

	// Callbacks pour ouvrir le drawer avec le bon mode
	const handleOpenCartDrawer = useCallback(() => {
		if (product) {
			drawer.openDrawer(product, "cart");
		}
	}, [product, drawer]);

	const handleOpenWishlistDrawer = useCallback(() => {
		if (product) {
			drawer.openDrawer(product, "wishlist");
		}
	}, [product, drawer]);

	// Si pas de multi-variantes ou pas de données produit, render la card simple
	if (!hasMultipleVariants || !product) {
		return <ProductCard {...cardProps} hasMultipleVariants={false} />;
	}

	return (
		<>
			<ProductCard
				{...cardProps}
				hasMultipleVariants={hasMultipleVariants}
				onOpenCartDrawer={handleOpenCartDrawer}
				onOpenWishlistDrawer={handleOpenWishlistDrawer}
			/>

			<VariantSelectionDrawer
				isOpen={drawer.isOpen}
				mode={drawer.mode}
				product={drawer.product}
				variantInfo={drawer.variantInfo}
				selectedVariants={drawer.selectedVariants}
				selectedSku={drawer.selectedSku}
				currentImage={drawer.currentImage}
				canSubmit={drawer.canSubmit}
				isPending={drawer.isPending}
				onClose={drawer.closeDrawer}
				onSelectVariant={drawer.selectVariant}
				onSubmit={drawer.submit}
				isColorAvailable={drawer.isColorAvailable}
				isMaterialAvailable={drawer.isMaterialAvailable}
				isSizeAvailable={drawer.isSizeAvailable}
			/>
		</>
	);
}
