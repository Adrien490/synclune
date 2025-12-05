"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { filterCompatibleSkus } from "@/modules/skus/services/filter-compatible-skus";
import { findSkuByVariants } from "@/modules/skus/services/find-sku-by-variants";
import { extractVariantInfo } from "@/modules/skus/services/extract-sku-info";
import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { useAddToWishlist } from "@/modules/wishlist/hooks/use-add-to-wishlist";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { Product } from "@/modules/products/types/product.types";

export type DrawerMode = "cart" | "wishlist";

/** Type minimal pour le produit passé au drawer (compatible avec listings et détail) */
export type ProductForDrawer = GetProductReturn | Product;

interface SelectedVariants {
	color: string | null;
	material: string | null;
	size: string | null;
}

interface UseVariantSelectionDrawerOptions {
	onSuccess?: () => void;
}

/**
 * Hook pour gérer le drawer de sélection de variantes
 *
 * Gère l'état du drawer, la sélection de variantes, et les actions cart/wishlist.
 * L'image change dynamiquement selon la couleur sélectionnée.
 */
export function useVariantSelectionDrawer(
	options?: UseVariantSelectionDrawerOptions
) {
	// État du drawer
	const [isOpen, setIsOpen] = useState(false);
	const [mode, setMode] = useState<DrawerMode | null>(null);
	const [product, setProduct] = useState<ProductForDrawer | null>(null);
	const [selectedVariants, setSelectedVariants] = useState<SelectedVariants>({
		color: null,
		material: null,
		size: null,
	});

	const [isSubmitting, startTransition] = useTransition();

	// Hooks pour les actions
	const { action: addToCartAction, isPending: isCartPending } = useAddToCart({
		onSuccess: () => {
			closeDrawer();
			options?.onSuccess?.();
		},
	});

	const { action: addToWishlistAction, isPending: isWishlistPending } =
		useAddToWishlist({
			onSuccess: () => {
				closeDrawer();
				options?.onSuccess?.();
			},
		});

	// Extraire les infos de variantes du produit
	const variantInfo = useMemo(() => {
		if (!product) return null;
		return extractVariantInfo(product as GetProductReturn);
	}, [product]);

	// Calculer les SKUs compatibles avec la sélection actuelle
	const compatibleSkus = useMemo(() => {
		if (!product) return [];
		return filterCompatibleSkus(product as GetProductReturn, {
			colorSlug: selectedVariants.color || undefined,
			materialSlug: selectedVariants.material || undefined,
			size: selectedVariants.size || undefined,
		});
	}, [product, selectedVariants]);

	// Trouver le SKU exactement sélectionné
	const selectedSku = useMemo(() => {
		if (!product) return null;
		return findSkuByVariants(product as GetProductReturn, {
			colorSlug: selectedVariants.color || undefined,
			materialSlug: selectedVariants.material || undefined,
			size: selectedVariants.size || undefined,
		});
	}, [product, selectedVariants]);

	// Image dynamique basée sur la couleur sélectionnée
	const currentImage = useMemo(() => {
		if (!product?.skus) return null;

		// Si un SKU est sélectionné, utiliser son image
		if (selectedSku?.images?.[0]) {
			const primaryImage =
				selectedSku.images.find((img) => img.isPrimary) ||
				selectedSku.images[0];
			return primaryImage;
		}

		// Sinon, chercher un SKU avec la couleur sélectionnée
		if (selectedVariants.color) {
			const skuWithColor = product.skus.find(
				(sku) =>
					sku.isActive &&
					sku.color?.slug === selectedVariants.color &&
					sku.images?.length > 0
			);
			if (skuWithColor?.images?.[0]) {
				const primaryImage =
					skuWithColor.images.find((img) => img.isPrimary) ||
					skuWithColor.images[0];
				return primaryImage;
			}
		}

		// Fallback: première image du produit (SKU par défaut)
		const defaultSku = product.skus.find((sku) => sku.isDefault && sku.images?.length > 0);
		if (defaultSku?.images?.[0]) {
			return defaultSku.images.find((img) => img.isPrimary) || defaultSku.images[0];
		}

		// Dernière tentative: n'importe quelle image
		for (const sku of product.skus) {
			if (sku.images?.length > 0) {
				return sku.images.find((img) => img.isPrimary) || sku.images[0];
			}
		}

		return null;
	}, [product, selectedSku, selectedVariants.color]);

	// Vérifier si une option est disponible (pour les sélecteurs)
	const isColorAvailable = useCallback(
		(colorSlug: string): boolean => {
			if (!product) return false;
			const skus = filterCompatibleSkus(product as GetProductReturn, {
				colorSlug,
				materialSlug: selectedVariants.material || undefined,
				size: selectedVariants.size || undefined,
			});
			return skus.length > 0;
		},
		[product, selectedVariants.material, selectedVariants.size]
	);

	const isMaterialAvailable = useCallback(
		(materialName: string): boolean => {
			if (!product) return false;
			const skus = filterCompatibleSkus(product as GetProductReturn, {
				colorSlug: selectedVariants.color || undefined,
				materialSlug: materialName,
				size: selectedVariants.size || undefined,
			});
			return skus.length > 0;
		},
		[product, selectedVariants.color, selectedVariants.size]
	);

	const isSizeAvailable = useCallback(
		(size: string): boolean => {
			if (!product) return false;
			const skus = filterCompatibleSkus(product as GetProductReturn, {
				colorSlug: selectedVariants.color || undefined,
				materialSlug: selectedVariants.material || undefined,
				size,
			});
			return skus.length > 0;
		},
		[product, selectedVariants.color, selectedVariants.material]
	);

	// Ouvrir le drawer
	const openDrawer = useCallback(
		(productData: ProductForDrawer, drawerMode: DrawerMode) => {
			setProduct(productData);
			setMode(drawerMode);
			setSelectedVariants({ color: null, material: null, size: null });
			setIsOpen(true);
		},
		[]
	);

	// Fermer le drawer
	const closeDrawer = useCallback(() => {
		setIsOpen(false);
		// Reset après l'animation de fermeture
		setTimeout(() => {
			setProduct(null);
			setMode(null);
			setSelectedVariants({ color: null, material: null, size: null });
		}, 300);
	}, []);

	// Sélectionner une variante
	const selectVariant = useCallback(
		(type: keyof SelectedVariants, value: string | null) => {
			setSelectedVariants((prev) => ({
				...prev,
				[type]: value,
			}));
		},
		[]
	);

	// Soumettre (ajouter au panier ou wishlist)
	const submit = useCallback(() => {
		if (!selectedSku || !mode) return;

		startTransition(() => {
			const formData = new FormData();
			formData.set("skuId", selectedSku.id);

			if (mode === "cart") {
				formData.set("quantity", "1");
				addToCartAction(formData);
			} else {
				addToWishlistAction(formData);
			}
		});
	}, [selectedSku, mode, addToCartAction, addToWishlistAction]);

	// Vérifier si le formulaire est valide (SKU sélectionné et en stock)
	const canSubmit = useMemo(() => {
		return selectedSku !== null && selectedSku.inventory > 0;
	}, [selectedSku]);

	const isPending = isSubmitting || isCartPending || isWishlistPending;

	return {
		// État
		isOpen,
		mode,
		product,
		selectedVariants,
		variantInfo,
		compatibleSkus,
		selectedSku,
		currentImage,

		// Actions
		openDrawer,
		closeDrawer,
		selectVariant,
		submit,

		// Helpers pour les sélecteurs
		isColorAvailable,
		isMaterialAvailable,
		isSizeAvailable,

		// États
		canSubmit,
		isPending,
	};
}
