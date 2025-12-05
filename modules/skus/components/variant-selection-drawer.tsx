"use client";

import Image from "next/image";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { Badge } from "@/shared/components/ui/badge";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
	ResponsiveDialogFooter,
	ResponsiveDialogDescription,
} from "@/shared/components/ui/responsive-dialog";
import {
	InlineColorSelector,
	InlineMaterialSelector,
	InlineSizeSelector,
} from "./inline-variant-selectors";
import { formatEuro } from "@/shared/utils/format-euro";
import { ShoppingCart, Heart, Loader2 } from "lucide-react";
import type {
	ProductForDrawer,
	DrawerMode,
} from "@/modules/skus/hooks/use-variant-selection-drawer";
import type { ProductVariantInfo } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";

interface VariantSelectionDrawerProps {
	isOpen: boolean;
	mode: DrawerMode | null;
	product: ProductForDrawer | null;
	variantInfo: ProductVariantInfo | null;
	selectedVariants: {
		color: string | null;
		material: string | null;
		size: string | null;
	};
	selectedSku: ProductSku | null;
	currentImage: {
		url: string;
		altText?: string | null;
		blurDataUrl?: string | null;
	} | null;
	canSubmit: boolean;
	isPending: boolean;

	onClose: () => void;
	onSelectVariant: (
		type: "color" | "material" | "size",
		value: string | null
	) => void;
	onSubmit: () => void;

	isColorAvailable: (colorSlug: string) => boolean;
	isMaterialAvailable: (materialName: string) => boolean;
	isSizeAvailable: (size: string) => boolean;
}

/**
 * Drawer de sélection rapide des variantes
 *
 * Utilisé sur les ProductCard pour permettre aux utilisateurs de choisir
 * une variante avant d'ajouter au panier ou à la wishlist.
 *
 * - Desktop: Dialog centré
 * - Mobile: Drawer depuis le bas
 */
export function VariantSelectionDrawer({
	isOpen,
	mode,
	product,
	variantInfo,
	selectedVariants,
	selectedSku,
	currentImage,
	canSubmit,
	isPending,
	onClose,
	onSelectVariant,
	onSubmit,
	isColorAvailable,
	isMaterialAvailable,
	isSizeAvailable,
}: VariantSelectionDrawerProps) {
	if (!product || !variantInfo) return null;

	const hasMultipleColors = variantInfo.availableColors.length > 1;
	const hasMultipleMaterials = variantInfo.availableMaterials.length > 1;
	const hasMultipleSizes = variantInfo.availableSizes.length > 0;

	// Déterminer si on a besoin d'afficher des sélecteurs
	const hasSelectorsToShow =
		hasMultipleColors || hasMultipleMaterials || hasMultipleSizes;

	// Message d'action selon le mode
	const actionLabel = mode === "cart" ? "Ajouter au panier" : "Ajouter aux favoris";
	const ActionIcon = mode === "cart" ? ShoppingCart : Heart;

	// Stock status
	const isOutOfStock = selectedSku ? selectedSku.inventory <= 0 : false;
	const stockLabel = isOutOfStock ? "Rupture de stock" : "En stock";

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<ResponsiveDialogContent className="sm:max-w-[425px]">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle className="text-lg font-semibold">
						{product.title}
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription className="sr-only">
						Sélectionnez vos options pour {product.title}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<div className="space-y-4 py-4">
					{/* Image du produit */}
					<div className="relative aspect-square w-full max-w-[200px] mx-auto overflow-hidden rounded-lg bg-muted">
						{currentImage ? (
							<Image
								src={currentImage.url}
								alt={currentImage.altText || product.title}
								fill
								className="object-cover"
								sizes="200px"
								placeholder={currentImage.blurDataUrl ? "blur" : "empty"}
								blurDataURL={currentImage.blurDataUrl || undefined}
							/>
						) : (
							<div className="flex items-center justify-center h-full text-muted-foreground">
								Aucune image
							</div>
						)}
					</div>

					{/* Prix et stock */}
					<div className="flex items-center justify-between">
						<span className="text-lg font-semibold">
							{selectedSku
								? formatEuro(selectedSku.priceInclTax)
								: variantInfo.priceRange.min === variantInfo.priceRange.max
									? formatEuro(variantInfo.priceRange.min)
									: `${formatEuro(variantInfo.priceRange.min)} - ${formatEuro(variantInfo.priceRange.max)}`}
						</span>
						{selectedSku && (
							<Badge variant={isOutOfStock ? "destructive" : "secondary"}>
								{stockLabel}
							</Badge>
						)}
					</div>

					{hasSelectorsToShow && <Separator />}

					{/* Sélecteurs de variantes */}
					<div className="space-y-4">
						{hasMultipleColors && (
							<InlineColorSelector
								colors={variantInfo.availableColors}
								selected={selectedVariants.color}
								onSelect={(value) => onSelectVariant("color", value)}
								isAvailable={isColorAvailable}
								disabled={isPending}
							/>
						)}

						{hasMultipleMaterials && (
							<InlineMaterialSelector
								materials={variantInfo.availableMaterials}
								selected={selectedVariants.material}
								onSelect={(value) => onSelectVariant("material", value)}
								isAvailable={isMaterialAvailable}
								disabled={isPending}
							/>
						)}

						{hasMultipleSizes && (
							<InlineSizeSelector
								sizes={variantInfo.availableSizes}
								selected={selectedVariants.size}
								onSelect={(value) => onSelectVariant("size", value)}
								isAvailable={isSizeAvailable}
								productTypeSlug={product.type?.slug}
								disabled={isPending}
							/>
						)}
					</div>

					{/* Message si sélection incomplète */}
					{!canSubmit && hasSelectorsToShow && (
						<p className="text-sm text-muted-foreground text-center">
							Sélectionnez vos options pour continuer
						</p>
					)}
				</div>

				<ResponsiveDialogFooter>
					<Button
						onClick={onSubmit}
						disabled={!canSubmit || isPending || isOutOfStock}
						className="w-full"
						size="lg"
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Ajout en cours...
							</>
						) : (
							<>
								<ActionIcon className="mr-2 h-4 w-4" />
								{isOutOfStock ? "Indisponible" : actionLabel}
							</>
						)}
					</Button>
				</ResponsiveDialogFooter>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
