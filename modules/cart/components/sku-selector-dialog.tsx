"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { GetCartReturn } from "@/modules/cart/types/cart.types";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useAppForm } from "@/shared/components/forms";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";
import type { Product } from "@/modules/products/types/product.types";
import { getPrimaryImageForList } from "@/modules/products/services/product-display.service";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";
import { PRODUCT_TYPES_REQUIRING_SIZE } from "@/modules/products/constants/product-texts.constants";
import { slugify } from "@/shared/utils/generate-slug";
import {
	hasActiveDiscount,
	calculateDiscountPercent,
} from "@/modules/products/services/product-pricing.service";
import { isLightColor } from "@/modules/colors/utils/color-contrast.utils";
import { useRadioGroupKeyboard } from "@/shared/hooks/use-radio-group-keyboard";
import ScrollFade from "@/shared/components/scroll-fade";

import type { SkuSelectorDialogData } from "../types/dialog-data.types";

// Lazy loading - size guide dialog loads only when opened
const SizeGuideDialog = dynamic(() =>
	import("@/modules/skus/components/size-guide-dialog").then((mod) => mod.SizeGuideDialog),
);

export type { SkuSelectorDialogData };

// ============================================================================
// Types
// ============================================================================

type ColorOption = { slug: string; hex: string; name: string };
type MaterialOption = { slug: string; name: string };
type ActiveSku = NonNullable<Product["skus"]>[number];

interface ImageSelection {
	url: string;
	alt: string;
	blurDataUrl: string | null;
}

interface AvailabilityMaps {
	color: Map<string, boolean>;
	material: Map<string, boolean>;
	size: Map<string, boolean>;
}

/** ID for aria-describedby on validation errors */
const VALIDATION_ERROR_ID = "sku-selector-validation-error";

/** ID for aria-describedby on quantity input bounds */
const QUANTITY_BOUNDS_ID = "sku-selector-quantity-bounds";

/** IDs for aria-labelledby on radiogroup containers */
const COLOR_LEGEND_ID = "sku-color-legend";
const MATERIAL_LEGEND_ID = "sku-material-legend";
const SIZE_LEGEND_ID = "sku-size-legend";

export const SKU_SELECTOR_DIALOG_ID = "sku-selector";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts unique color, material, and size options from active SKUs.
 * Shared between form initialization (useEffect) and render to avoid duplication.
 */
function extractVariantOptions(activeSkus: ActiveSku[]) {
	const uniqueColors = new Map<string, ColorOption>();
	const uniqueMaterials = new Map<string, MaterialOption>();
	const uniqueSizes = new Set<string>();

	for (const sku of activeSkus) {
		if (sku.color?.slug && sku.color.hex) {
			if (!uniqueColors.has(sku.color.slug)) {
				uniqueColors.set(sku.color.slug, {
					slug: sku.color.slug,
					hex: sku.color.hex,
					name: sku.color.name,
				});
			}
		}
		if (sku.material?.name) {
			const slug = slugify(sku.material.name);
			if (!uniqueMaterials.has(slug)) {
				uniqueMaterials.set(slug, { slug, name: sku.material.name });
			}
		}
		if (sku.size) {
			uniqueSizes.add(sku.size);
		}
	}

	return {
		colors: Array.from(uniqueColors.values()),
		materials: Array.from(uniqueMaterials.values()),
		sizes: Array.from(uniqueSizes),
	};
}

/**
 * Builds availability maps in a single pass over active SKUs.
 * Each map indicates whether a given option has at least one compatible SKU in stock.
 */
function buildAvailabilityMaps(
	activeSkus: ActiveSku[],
	colors: ColorOption[],
	materials: MaterialOption[],
	sizes: string[],
	selectedColor: string,
	selectedMaterial: string,
	selectedSize: string,
): AvailabilityMaps {
	const colorMap = new Map<string, boolean>(colors.map((c) => [c.slug, false]));
	const materialMap = new Map<string, boolean>(materials.map((m) => [m.slug, false]));
	const sizeMap = new Map<string, boolean>(sizes.map((s) => [s, false]));

	for (const sku of activeSkus) {
		if (sku.inventory <= 0) continue;

		const skuColor = sku.color?.slug;
		const skuMaterial = sku.material?.name ? slugify(sku.material.name) : null;
		const skuSize = sku.size;

		// Color availability: matches selected material + size
		if (skuColor && colorMap.has(skuColor) && !colorMap.get(skuColor)) {
			const materialMatch = !selectedMaterial || skuMaterial === selectedMaterial;
			const sizeMatch = !selectedSize || skuSize === selectedSize;
			if (materialMatch && sizeMatch) {
				colorMap.set(skuColor, true);
			}
		}

		// Material availability: matches selected color + size
		if (skuMaterial && materialMap.has(skuMaterial) && !materialMap.get(skuMaterial)) {
			const colorMatch = !selectedColor || skuColor === selectedColor;
			const sizeMatch = !selectedSize || skuSize === selectedSize;
			if (colorMatch && sizeMatch) {
				materialMap.set(skuMaterial, true);
			}
		}

		// Size availability: matches selected color + material
		if (skuSize && sizeMap.has(skuSize) && !sizeMap.get(skuSize)) {
			const colorMatch = !selectedColor || skuColor === selectedColor;
			const materialMatch = !selectedMaterial || skuMaterial === selectedMaterial;
			if (colorMatch && materialMatch) {
				sizeMap.set(skuSize, true);
			}
		}
	}

	return { color: colorMap, material: materialMap, size: sizeMap };
}

/**
 * Returns the image to display based on the selected color.
 */
function getImageForColor(
	selectedColor: string,
	activeSkus: ActiveSku[],
	product: Product,
): ImageSelection {
	if (selectedColor) {
		const skuWithColor = activeSkus.find(
			(sku) => sku.color?.slug === selectedColor && sku.images.length > 0,
		);
		if (skuWithColor?.images.length) {
			const img = skuWithColor.images.find((i) => i.isPrimary) ?? skuWithColor.images[0];
			if (!img) return { url: "", alt: "", blurDataUrl: null };
			return {
				url: img.url,
				alt: img.altText ?? `${product.title} - ${selectedColor}`,
				blurDataUrl: img.blurDataUrl ?? null,
			};
		}
	}
	const primaryImage = getPrimaryImageForList(product);
	return {
		url: primaryImage.url,
		alt: primaryImage.alt ?? product.title,
		blurDataUrl: primaryImage.blurDataUrl ?? null,
	};
}

/**
 * Computes validation errors based on required selections.
 */
function computeValidationErrors(
	colors: ColorOption[],
	materials: MaterialOption[],
	sizes: string[],
	requiresSize: boolean,
	selectedColor: string,
	selectedMaterial: string,
	selectedSize: string,
): string[] {
	const errors: string[] = [];
	if (colors.length > 1 && !selectedColor) {
		errors.push("Veuillez sélectionner une couleur");
	}
	if (materials.length > 1 && !selectedMaterial) {
		errors.push("Veuillez sélectionner un matériau");
	}
	if (requiresSize && sizes.length > 0 && !selectedSize) {
		errors.push("Veuillez sélectionner une taille");
	}
	return errors;
}

// ============================================================================
// Color Selector
// ============================================================================

interface ColorSelectorProps {
	colors: ColorOption[];
	selectedValue: string;
	onSelect: (slug: string) => void;
	isPending: boolean;
	hasValidationErrors: boolean;
	colorAvailability: Map<string, boolean>;
}

function ColorSelector({
	colors,
	selectedValue,
	onSelect,
	isPending,
	hasValidationErrors,
	colorAvailability,
}: ColorSelectorProps) {
	const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
		options: colors,
		getOptionId: (color) => color.slug,
		isOptionDisabled: (color) => !(colorAvailability.get(color.slug) ?? false),
		onSelect: (color) => onSelect(color.slug),
	});

	const needsCarousel = colors.length > 5;
	const colorButtons = colors.map((color, index) => {
		const isSelected = color.slug === selectedValue;
		const isAvailable = colorAvailability.get(color.slug) ?? false;

		return (
			<button
				key={color.slug}
				type="button"
				role="radio"
				aria-checked={isSelected}
				data-option-id={color.slug}
				onClick={() => onSelect(color.slug)}
				onKeyDown={(e) => handleKeyDown(e, index)}
				tabIndex={isSelected || (!selectedValue && index === 0) ? 0 : -1}
				disabled={!isAvailable || isPending}
				className={cn(
					"relative flex min-h-11 items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all",
					"hover:shadow-sm active:scale-[0.98]",
					"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
					"disabled:cursor-not-allowed",
					isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
					!isAvailable && "opacity-40 saturate-0",
					needsCarousel && "shrink-0 snap-start",
				)}
				aria-label={`${color.name}${!isAvailable ? " (indisponible)" : ""}`}
			>
				<div
					className={cn(
						"h-6 w-6 shrink-0 rounded-full shadow-sm sm:h-5 sm:w-5",
						isLightColor(color.hex, 0.85) ? "border-border border-2" : "border-border/50 border",
					)}
					style={{ backgroundColor: color.hex }}
				/>
				<span className="text-sm">{color.name}</span>
				{isSelected && (
					<m.div
						initial={{ scale: 0.5, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{
							type: "spring",
							stiffness: 400,
							damping: 15,
						}}
					>
						<Check className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
					</m.div>
				)}
				{!isAvailable && (
					<div
						className="pointer-events-none absolute inset-0 flex items-center justify-center"
						aria-hidden="true"
					>
						<div className="bg-muted-foreground/50 h-px w-full rotate-[-8deg]" />
					</div>
				)}
			</button>
		);
	});

	return (
		<fieldset className="space-y-2" disabled={isPending}>
			<legend id={COLOR_LEGEND_ID} className="text-sm font-medium">
				Couleur
				<span className="text-destructive ml-0.5" aria-hidden="true">
					*
				</span>
				<span className="sr-only">(obligatoire)</span>
				{selectedValue && (
					<span className="text-muted-foreground ml-1 font-normal">
						: {colors.find((c) => c.slug === selectedValue)?.name}
					</span>
				)}
			</legend>
			{needsCarousel ? (
				<ScrollFade axis="horizontal" hideScrollbar>
					<div
						ref={containerRef}
						role="radiogroup"
						aria-required="true"
						aria-labelledby={COLOR_LEGEND_ID}
						aria-describedby={
							hasValidationErrors && !selectedValue ? VALIDATION_ERROR_ID : undefined
						}
						className="flex gap-2 pb-1"
					>
						{colorButtons}
					</div>
				</ScrollFade>
			) : (
				<div
					ref={containerRef}
					role="radiogroup"
					aria-required="true"
					aria-labelledby={COLOR_LEGEND_ID}
					aria-describedby={hasValidationErrors && !selectedValue ? VALIDATION_ERROR_ID : undefined}
					className="flex flex-wrap gap-2"
				>
					{colorButtons}
				</div>
			)}
		</fieldset>
	);
}

// ============================================================================
// Material Selector
// ============================================================================

interface MaterialSelectorProps {
	materials: MaterialOption[];
	selectedValue: string;
	onSelect: (slug: string) => void;
	isPending: boolean;
	hasValidationErrors: boolean;
	materialAvailability: Map<string, boolean>;
}

function MaterialSelector({
	materials,
	selectedValue,
	onSelect,
	isPending,
	hasValidationErrors,
	materialAvailability,
}: MaterialSelectorProps) {
	const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
		options: materials,
		getOptionId: (material) => material.slug,
		isOptionDisabled: (material) => !(materialAvailability.get(material.slug) ?? false),
		onSelect: (material) => onSelect(material.slug),
	});

	return (
		<fieldset className="space-y-2" disabled={isPending}>
			<legend id={MATERIAL_LEGEND_ID} className="text-sm font-medium">
				Matériau
				<span className="text-destructive ml-0.5" aria-hidden="true">
					*
				</span>
				<span className="sr-only">(obligatoire)</span>
			</legend>
			<div
				ref={containerRef}
				role="radiogroup"
				aria-required="true"
				aria-labelledby={MATERIAL_LEGEND_ID}
				aria-describedby={hasValidationErrors && !selectedValue ? VALIDATION_ERROR_ID : undefined}
				className="grid grid-cols-1 gap-2 sm:grid-cols-2"
			>
				{materials.map((material, index) => {
					const isSelected = material.slug === selectedValue;
					const isAvailable = materialAvailability.get(material.slug) ?? false;

					return (
						<button
							key={material.slug}
							type="button"
							role="radio"
							aria-checked={isSelected}
							data-option-id={material.slug}
							onClick={() => onSelect(material.slug)}
							onKeyDown={(e) => handleKeyDown(e, index)}
							tabIndex={isSelected || (!selectedValue && index === 0) ? 0 : -1}
							disabled={!isAvailable || isPending}
							className={cn(
								"relative flex min-h-11 items-center justify-between rounded-lg border-2 px-4 py-3 transition-all",
								"hover:shadow-sm active:scale-[0.98]",
								"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
								"disabled:cursor-not-allowed",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!isAvailable && "opacity-40 saturate-0",
							)}
							aria-label={`${material.name}${!isAvailable ? " (indisponible)" : ""}`}
						>
							<span className="text-sm">{material.name}</span>
							{isSelected && (
								<m.div
									initial={{ scale: 0.85, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{
										type: "spring",
										stiffness: 400,
										damping: 15,
									}}
								>
									<Check className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
								</m.div>
							)}
							{!isAvailable && (
								<div
									className="pointer-events-none absolute inset-0 flex items-center justify-center"
									aria-hidden="true"
								>
									<div className="bg-muted-foreground/50 h-px w-full rotate-[-8deg]" />
								</div>
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}

// ============================================================================
// Size Selector
// ============================================================================

interface SizeSelectorGroupProps {
	sizes: string[];
	selectedValue: string;
	onSelect: (size: string) => void;
	isPending: boolean;
	hasValidationErrors: boolean;
	sizeAvailability: Map<string, boolean>;
	productTypeSlug?: string | null;
}

function SizeSelectorGroup({
	sizes,
	selectedValue,
	onSelect,
	isPending,
	hasValidationErrors,
	sizeAvailability,
	productTypeSlug,
}: SizeSelectorGroupProps) {
	const sizeOptions = sizes.map((s) => ({ size: s }));
	const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
		options: sizeOptions,
		getOptionId: (option) => option.size,
		isOptionDisabled: (option) => !(sizeAvailability.get(option.size) ?? false),
		onSelect: (option) => onSelect(option.size),
	});

	return (
		<fieldset className="space-y-2" disabled={isPending}>
			<div className="flex items-center justify-between">
				<legend id={SIZE_LEGEND_ID} className="text-sm font-medium">
					Taille
					<span className="text-destructive ml-0.5" aria-hidden="true">
						*
					</span>
					<span className="sr-only">(obligatoire)</span>
					{productTypeSlug === "ring" && (
						<span className="text-muted-foreground ml-1 font-normal">(Diamètre)</span>
					)}
					{productTypeSlug === "bracelet" && (
						<span className="text-muted-foreground ml-1 font-normal">(Tour de poignet)</span>
					)}
				</legend>
				<SizeGuideDialog productTypeSlug={productTypeSlug} />
			</div>
			<div
				ref={containerRef}
				role="radiogroup"
				aria-required="true"
				aria-labelledby={SIZE_LEGEND_ID}
				aria-describedby={hasValidationErrors && !selectedValue ? VALIDATION_ERROR_ID : undefined}
				className="grid grid-cols-3 gap-2 sm:grid-cols-4"
			>
				{sizes.map((size, index) => {
					const isSelected = size === selectedValue;
					const isAvailable = sizeAvailability.get(size) ?? false;

					return (
						<button
							key={size}
							type="button"
							role="radio"
							aria-checked={isSelected}
							data-option-id={size}
							onClick={() => onSelect(size)}
							onKeyDown={(e) => handleKeyDown(e, index)}
							tabIndex={isSelected || (!selectedValue && index === 0) ? 0 : -1}
							disabled={!isAvailable || isPending}
							className={cn(
								"relative flex min-h-11 items-center justify-center rounded-lg border-2 px-2 py-3 transition-all",
								"hover:shadow-sm active:scale-[0.98]",
								"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
								"disabled:cursor-not-allowed",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!isAvailable && "opacity-40 saturate-0",
							)}
							aria-label={`Taille ${size}${!isAvailable ? " (indisponible)" : ""}`}
						>
							<span className="truncate text-sm font-medium">{size}</span>
							{isSelected && (
								<m.div
									initial={{ scale: 0.85, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{
										type: "spring",
										stiffness: 400,
										damping: 15,
									}}
									className="absolute top-1.5 right-1.5"
								>
									<Check className="text-primary h-3.5 w-3.5" aria-hidden="true" />
								</m.div>
							)}
							{!isAvailable && (
								<div
									className="pointer-events-none absolute inset-0 flex items-center justify-center"
									aria-hidden="true"
								>
									<div className="bg-muted-foreground/50 h-px w-full rotate-[-8deg]" />
								</div>
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}

// ============================================================================
// Quantity Section (isolated for performance — only re-renders on quantity change)
// ============================================================================

interface QuantitySectionProps {
	quantity: number;
	maxQuantity: number;
	onQuantityChange: (q: number) => void;
	isPending: boolean;
	selectedSku: ActiveSku | undefined;
	displayPrice: number;
}

function QuantitySection({
	quantity,
	maxQuantity,
	onQuantityChange,
	isPending,
	selectedSku,
	displayPrice,
}: QuantitySectionProps) {
	return (
		<fieldset className="space-y-2" disabled={isPending}>
			<legend className="text-sm font-medium">Quantité</legend>
			<div className="flex items-center gap-4 sm:gap-3">
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
					disabled={isPending || quantity <= 1}
					aria-label="Diminuer la quantité"
				>
					<Minus className="h-4 w-4" />
				</Button>
				<input
					type="text"
					inputMode="numeric"
					pattern="[0-9]*"
					min={1}
					max={maxQuantity}
					value={quantity}
					onChange={(e) => {
						const val = parseInt(e.target.value, 10) || 1;
						onQuantityChange(Math.max(1, Math.min(maxQuantity, val)));
					}}
					disabled={isPending}
					className="focus-visible:ring-ring w-12 rounded-md bg-transparent text-center text-lg font-semibold tabular-nums focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					aria-label="Quantité à ajouter au panier"
					aria-describedby={QUANTITY_BOUNDS_ID}
				/>
				<span id={QUANTITY_BOUNDS_ID} className="sr-only">
					Minimum 1, maximum {maxQuantity}
				</span>
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={() => onQuantityChange(Math.min(maxQuantity, quantity + 1))}
					disabled={isPending || quantity >= maxQuantity}
					aria-label="Augmenter la quantité"
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>
			{/* Subtotal when quantity > 1 */}
			{quantity > 1 && selectedSku && (
				<p
					className="text-muted-foreground text-xs"
					aria-label={`${quantity} fois ${formatEuro(displayPrice)}`}
				>
					{quantity} x {formatEuro(displayPrice)}
				</p>
			)}
		</fieldset>
	);
}

// ============================================================================
// Main Component
// ============================================================================

interface SkuSelectorDialogProps {
	/** Cart data for checking available quantities */
	cart: GetCartReturn;
}

/**
 * Dialog de sélection de variante pour ajout rapide au panier
 *
 * S'affiche quand l'utilisateur clique sur "Ajouter au panier"
 * sur une ProductCard avec plusieurs variantes.
 *
 * Utilise TanStack Form (useAppForm) pour la gestion du formulaire
 */
export function SkuSelectorDialog({ cart }: SkuSelectorDialogProps) {
	const cartItems =
		cart?.items.map((item) => ({
			skuId: item.sku.id,
			quantity: item.quantity,
		})) ?? [];

	const { isOpen, data, close } = useDialog<SkuSelectorDialogData>(SKU_SELECTOR_DIALOG_ID);
	const { action, isPending } = useAddToCart({
		openSheetOnSuccess: true,
		onSuccess: close,
	});
	const shouldReduceMotion = useReducedMotion();

	const form = useAppForm({
		defaultValues: {
			color: "",
			material: "",
			size: "",
			quantity: 1,
		},
	});

	const product = data?.product;
	const preselectedColor = data?.preselectedColor;

	// Reset form when dialog opens with a new product
	// Pre-selects default SKU variants for better UX
	useEffect(() => {
		if (isOpen && product) {
			const activeSkus = product.skus.filter((sku) => sku.isActive);
			const defaultSku =
				activeSkus.find((sku) => sku.isDefault && sku.inventory > 0) ??
				activeSkus.find((sku) => sku.inventory > 0) ??
				activeSkus.find((sku) => sku.isDefault) ??
				activeSkus[0];
			const { colors, materials, sizes } = extractVariantOptions(activeSkus);

			// m5: Validate preselectedColor exists in active colors
			const validPreselectedColor =
				preselectedColor && colors.some((c) => c.slug === preselectedColor)
					? preselectedColor
					: null;

			// Priority: validPreselectedColor > default SKU > auto-select if unique
			const initialColor =
				validPreselectedColor ??
				defaultSku?.color?.slug ??
				(colors.length === 1 ? colors[0]!.slug : "");

			const initialMaterial =
				(defaultSku?.material?.name ? slugify(defaultSku.material.name) : "") ||
				(materials.length === 1 ? materials[0]!.slug : "") ||
				"";

			const initialSize = defaultSku?.size ?? (sizes.length === 1 ? sizes[0] : "") ?? "";

			form.reset({
				color: initialColor,
				material: initialMaterial,
				size: initialSize,
				quantity: 1,
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- form.reset is stable
	}, [isOpen, product, preselectedColor]);

	const handleClose = () => {
		form.reset();
		close();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			handleClose();
		}
	};

	// Skeleton state with aria-busy and accessible title
	if (!product) {
		return (
			<ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
				<ResponsiveDialogContent className="sm:max-w-130" aria-busy="true">
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle className="sr-only">
							Chargement des options du produit
						</ResponsiveDialogTitle>
						<Skeleton className="h-6 w-40" aria-hidden="true" />
						<ResponsiveDialogDescription className="sr-only">
							Chargement en cours
						</ResponsiveDialogDescription>
						<Skeleton className="mt-1 h-4 w-32" aria-hidden="true" />
					</ResponsiveDialogHeader>
					<div className="space-y-6 py-4">
						{/* Image + Prix skeleton */}
						<div className="flex gap-4">
							<Skeleton className="h-24 w-24 shrink-0 rounded-lg sm:h-40 sm:w-40" />
							<div className="flex flex-col justify-center gap-2">
								<Skeleton className="h-8 w-20" />
							</div>
						</div>
						{/* Sélecteurs skeleton */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<div className="flex flex-wrap gap-2">
								<Skeleton className="h-11 w-24 rounded-lg" />
								<Skeleton className="h-11 w-28 rounded-lg" />
								<Skeleton className="h-11 w-20 rounded-lg" />
							</div>
						</div>
						{/* Quantité skeleton */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<div className="flex items-center gap-3">
								<Skeleton className="h-11 w-11 rounded-md" />
								<Skeleton className="h-6 w-8" />
								<Skeleton className="h-11 w-11 rounded-md" />
							</div>
						</div>
					</div>
					<ResponsiveDialogFooter>
						<Skeleton className="h-11 w-full rounded-md" />
					</ResponsiveDialogFooter>
				</ResponsiveDialogContent>
			</ResponsiveDialog>
		);
	}

	const activeSkus = product.skus.filter((sku) => sku.isActive);
	const { colors, materials, sizes } = extractVariantOptions(activeSkus);

	// Check for product unavailability
	const noActiveSkus = activeSkus.length === 0;
	const allOutOfStock = activeSkus.length > 0 && activeSkus.every((sku) => sku.inventory <= 0);

	const hasAdjustableSizes = sizes.some((s) => s.toLowerCase().includes("ajustable"));
	const requiresSize =
		!hasAdjustableSizes &&
		sizes.length > 0 &&
		PRODUCT_TYPES_REQUIRING_SIZE.includes(
			product.type?.slug as (typeof PRODUCT_TYPES_REQUIRING_SIZE)[number],
		);

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="group/sku-selector sm:max-h-[85vh] sm:max-w-130">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle className="line-clamp-1">{product.title}</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Choisissez vos options pour ajouter au panier
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<p className="text-muted-foreground text-xs" aria-hidden="true">
					* Champs obligatoires
				</p>

				{/* Unavailable product message */}
				{(noActiveSkus || allOutOfStock) && (
					<div className="space-y-3 py-8 text-center">
						<p role="alert" className="text-muted-foreground">
							{noActiveSkus
								? "Ce produit n'est actuellement pas disponible"
								: "Ce produit est actuellement en rupture de stock"}
						</p>
						<Link
							href={`/creations/${product.slug}`}
							onClick={handleClose}
							aria-label={`Voir la fiche produit : ${product.title}`}
							className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
						>
							Voir la fiche produit
							<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
						</Link>
					</div>
				)}

				{/* Normal form - only when SKUs are available */}
				{!noActiveSkus && !allOutOfStock && (
					<form
						action={action}
						className="flex min-h-0 flex-1 flex-col"
						data-pending={isPending ? "" : undefined}
					>
						{/* Variant fields subscribe — isolated from quantity changes */}
						<form.Subscribe selector={(state) => state.values}>
							{(values) => (
								<SkuSelectorFormContent
									key={product.id}
									values={values}
									onColorChange={(c) => form.setFieldValue("color", c)}
									onMaterialChange={(m) => form.setFieldValue("material", m)}
									onSizeChange={(s) => form.setFieldValue("size", s)}
									onQuantityChange={(q) => form.setFieldValue("quantity", q)}
									product={product}
									activeSkus={activeSkus}
									colors={colors}
									materials={materials}
									sizes={sizes}
									requiresSize={requiresSize}
									cartItems={cartItems}
									isPending={isPending}
									shouldReduceMotion={shouldReduceMotion}
									handleClose={handleClose}
								/>
							)}
						</form.Subscribe>
					</form>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

// ============================================================================
// Form Content (extracted from Subscribe for readability + perf)
// ============================================================================

interface SkuSelectorFormContentProps {
	values: {
		color: string;
		material: string;
		size: string;
		quantity: number;
	};
	onColorChange: (color: string) => void;
	onMaterialChange: (material: string) => void;
	onSizeChange: (size: string) => void;
	onQuantityChange: (quantity: number) => void;
	product: Product;
	activeSkus: ActiveSku[];
	colors: ColorOption[];
	materials: MaterialOption[];
	sizes: string[];
	requiresSize: boolean;
	cartItems: { skuId: string; quantity: number }[];
	isPending: boolean;
	shouldReduceMotion: boolean | null;
	handleClose: () => void;
}

function SkuSelectorFormContent({
	values,
	onColorChange,
	onMaterialChange,
	onSizeChange,
	onQuantityChange,
	product,
	activeSkus,
	colors,
	materials,
	sizes,
	requiresSize,
	cartItems,
	isPending,
	shouldReduceMotion,
	handleClose,
}: SkuSelectorFormContentProps) {
	const { color: selectedColor, material: selectedMaterial, size: selectedSize } = values;

	// Only show validation errors after submit attempt
	const [showErrors, setShowErrors] = useState(false);

	// Availability maps (optimized single-pass)
	const availability = buildAvailabilityMaps(
		activeSkus,
		colors,
		materials,
		sizes,
		selectedColor,
		selectedMaterial,
		selectedSize,
	);

	// Find matching SKU
	const selectedSku = activeSkus.find((sku) => {
		if (sku.inventory <= 0) return false;
		if (colors.length > 1) {
			if (!selectedColor || sku.color?.slug !== selectedColor) return false;
		}
		if (materials.length > 1) {
			if (!selectedMaterial) return false;
			const skuMaterialSlug = sku.material?.name ? slugify(sku.material.name) : null;
			if (skuMaterialSlug !== selectedMaterial) return false;
		}
		if (requiresSize && sizes.length > 0) {
			if (!selectedSize || sku.size !== selectedSize) return false;
		}
		return true;
	});

	// Dynamic image based on selected color
	const currentImage = getImageForColor(selectedColor, activeSkus, product);

	// Validation
	const validationErrors = computeValidationErrors(
		colors,
		materials,
		sizes,
		requiresSize,
		selectedColor,
		selectedMaterial,
		selectedSize,
	);

	// Cart quantity check
	const quantityInCart = selectedSku
		? (cartItems.find((item) => item.skuId === selectedSku.id)?.quantity ?? 0)
		: 0;
	const availableToAdd = selectedSku ? Math.max(0, selectedSku.inventory - quantityInCart) : 0;

	const canAddToCart = selectedSku && validationErrors.length === 0 && availableToAdd > 0;
	const displayPrice = selectedSku ? selectedSku.priceInclTax : (activeSkus[0]?.priceInclTax ?? 0);

	// Discount info
	const compareAtPrice = selectedSku?.compareAtPrice ?? activeSkus[0]?.compareAtPrice;
	const showDiscount = hasActiveDiscount(compareAtPrice, displayPrice);
	const discountPercent = showDiscount ? calculateDiscountPercent(compareAtPrice, displayPrice) : 0;

	const maxQuantity = selectedSku
		? Math.min(availableToAdd, MAX_QUANTITY_PER_ORDER)
		: MAX_QUANTITY_PER_ORDER;

	// Clamp quantity — when maxQuantity is 0 (stock exhausted), default to 1
	// (the UI hides the quantity selector and disables submit in this case)
	const quantity = maxQuantity > 0 ? Math.min(values.quantity, maxQuantity) : 1;

	const hasVisibleErrors = !canAddToCart && validationErrors.length > 0 && showErrors && !isPending;

	return (
		<>
			{/* Hidden fields for form action */}
			{selectedSku && (
				<>
					<input type="hidden" name="skuId" value={selectedSku.id} />
					<input type="hidden" name="quantity" value={quantity} />
				</>
			)}

			{/* Scrollable content with opacity effect during submit */}
			<div
				className={cn(
					"relative min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain py-4 pr-2 pb-6",
					"group-has-[[data-pending]]/sku-selector:opacity-50",
					"group-has-[[data-pending]]/sku-selector:pointer-events-none",
					"transition-opacity duration-200",
				)}
			>
				{/* Image + Price */}
				<div className="flex gap-4">
					<m.div
						key={currentImage.url}
						initial={
							shouldReduceMotion
								? { opacity: 0 }
								: {
										scale: 0.95,
										opacity: 0,
									}
						}
						animate={{
							scale: 1,
							opacity: 1,
						}}
						transition={{ duration: 0.2 }}
						className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-lg sm:h-40 sm:w-40"
					>
						<Image
							src={currentImage.url}
							alt={currentImage.alt}
							fill
							className="object-cover"
							placeholder={currentImage.blurDataUrl ? "blur" : "empty"}
							blurDataURL={currentImage.blurDataUrl ?? undefined}
							sizes="(min-width: 640px) 160px, 96px"
							quality={85}
						/>
					</m.div>
					<div className="flex flex-col justify-center">
						{/* Price display */}
						<AnimatePresence mode="wait">
							<m.div
								key={displayPrice}
								initial={
									shouldReduceMotion
										? { opacity: 0 }
										: {
												opacity: 0,
												y: -10,
											}
								}
								animate={{
									opacity: 1,
									y: 0,
								}}
								exit={
									shouldReduceMotion
										? { opacity: 0 }
										: {
												opacity: 0,
												y: 10,
											}
								}
								transition={{
									duration: shouldReduceMotion ? 0.1 : 0.2,
								}}
								role="status"
								aria-live="polite"
							>
								<div className="flex items-center gap-2">
									<span className="text-foreground text-2xl font-bold tabular-nums">
										{formatEuro(displayPrice)}
									</span>
									{showDiscount && discountPercent > 0 && (
										<span className="bg-destructive rounded px-1.5 py-0.5 text-xs font-semibold text-white">
											-{discountPercent}%
										</span>
									)}
								</div>
								{showDiscount && compareAtPrice && (
									<>
										<span className="sr-only">Prix original : {formatEuro(compareAtPrice)}</span>
										<span
											className="text-foreground/60 text-sm tabular-nums line-through"
											aria-hidden="true"
										>
											{formatEuro(compareAtPrice)}
										</span>
									</>
								)}
								<span className="sr-only"> - Prix du produit</span>
							</m.div>
						</AnimatePresence>
						{/* Low stock badge */}
						{selectedSku && selectedSku.inventory <= STOCK_THRESHOLDS.LOW && availableToAdd > 0 && (
							<m.span
								role="status"
								animate={
									shouldReduceMotion
										? {}
										: {
												opacity: [1, 0.7, 1],
											}
								}
								transition={{
									repeat: Infinity,
									duration: 2,
									ease: "easeInOut",
								}}
								className="mt-1 text-xs font-medium text-amber-800"
							>
								Plus que {selectedSku.inventory} en stock
							</m.span>
						)}
						{quantityInCart > 0 && (
							<span role="status" className="text-muted-foreground mt-1 text-xs">
								{quantityInCart} déjà dans le panier
							</span>
						)}
						{/* Max stock badge */}
						{selectedSku && availableToAdd === 0 && (
							<span
								role="status"
								className="mt-1 inline-flex items-center rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700"
							>
								Stock maximum atteint
							</span>
						)}
					</div>
				</div>

				{/* Link to product page */}
				<Link
					href={`/creations/${product.slug}`}
					onClick={handleClose}
					aria-label={`Voir la fiche produit : ${product.title}`}
					className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
				>
					Voir la fiche produit
					<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
				</Link>

				{/* Color selector */}
				{colors.length > 1 && (
					<ColorSelector
						colors={colors}
						selectedValue={selectedColor}
						onSelect={onColorChange}
						isPending={isPending}
						hasValidationErrors={validationErrors.length > 0 && showErrors}
						colorAvailability={availability.color}
					/>
				)}

				{/* Material selector */}
				{materials.length > 1 && (
					<MaterialSelector
						materials={materials}
						selectedValue={selectedMaterial}
						onSelect={onMaterialChange}
						isPending={isPending}
						hasValidationErrors={validationErrors.length > 0 && showErrors}
						materialAvailability={availability.material}
					/>
				)}

				{/* Size selector */}
				{requiresSize && sizes.length > 0 && (
					<SizeSelectorGroup
						sizes={sizes}
						selectedValue={selectedSize}
						onSelect={onSizeChange}
						isPending={isPending}
						hasValidationErrors={validationErrors.length > 0 && showErrors}
						sizeAvailability={availability.size}
						productTypeSlug={product.type?.slug}
					/>
				)}

				{/* Quantity selector: hidden when stock max reached */}
				{(!selectedSku || availableToAdd > 0) && (
					<QuantitySection
						quantity={quantity}
						maxQuantity={maxQuantity}
						onQuantityChange={onQuantityChange}
						isPending={isPending}
						selectedSku={selectedSku}
						displayPrice={displayPrice}
					/>
				)}
			</div>
			{/* End scrollable content */}

			{/* Fixed footer */}
			<ResponsiveDialogFooter className="mt-auto shrink-0 border-t pt-4 pb-[max(0px,env(safe-area-inset-bottom))]">
				<Button
					type="submit"
					disabled={!canAddToCart || isPending}
					className="w-full"
					size="lg"
					aria-describedby={hasVisibleErrors ? VALIDATION_ERROR_ID : undefined}
					onClick={() => {
						if (validationErrors.length > 0) setShowErrors(true);
					}}
				>
					{isPending
						? "Ajout en cours..."
						: `Ajouter au panier · ${formatEuro(displayPrice * quantity)}`}
				</Button>
				{/* Validation error — always present for aria-describedby, content swapped */}
				<p
					id={VALIDATION_ERROR_ID}
					role="alert"
					aria-atomic="true"
					className={cn(
						"text-muted-foreground mt-2 text-center text-xs",
						!hasVisibleErrors && "sr-only",
					)}
				>
					{hasVisibleErrors
						? validationErrors.length === 1
							? validationErrors[0]
							: `${validationErrors.length} sélections requises`
						: null}
				</p>
			</ResponsiveDialogFooter>
		</>
	);
}
