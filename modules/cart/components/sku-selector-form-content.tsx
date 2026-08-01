"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MOTION_CONFIG, maybeReduceMotion } from "@/shared/components/animations/motion.config";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ResponsiveDialogFooter } from "@/shared/components/responsive-dialog";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";
import type { ProductCarouselItem } from "@/modules/products/types/product.types";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";
import { slugify } from "@/shared/utils/generate-slug";
import {
	hasActiveDiscount,
	calculateDiscountPercent,
} from "@/modules/products/services/product-pricing.service";

import type { ColorOption, MaterialOption, ActiveSku } from "./sku-selector-utils";
import {
	VALIDATION_ERROR_ID,
	buildAvailabilityMaps,
	getImageForColor,
	computeValidationErrors,
} from "./sku-selector-utils";
import {
	ColorSelector,
	MaterialSelector,
	SizeSelectorGroup,
	QuantitySection,
} from "./sku-selector-selectors";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

// ============================================================================
// Form Content (extracted from Subscribe for readability + perf)
// ============================================================================

export interface SkuSelectorFormContentProps {
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
	product: ProductCarouselItem;
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

export function SkuSelectorFormContent({
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
			if (!selectedColor) return false;
			const skuColorSlugs = sku.colors.map((link) => link.color.slug);
			if (!skuColorSlugs.includes(selectedColor)) return false;
		}
		if (materials.length > 1) {
			if (!selectedMaterial) return false;
			const skuMaterialSlugs = sku.materials
				.map((link) => (link.material.name ? slugify(link.material.name) : null))
				.filter((s): s is string => s !== null);
			if (!skuMaterialSlugs.includes(selectedMaterial)) return false;
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

	// Clamp quantity -- when maxQuantity is 0 (stock exhausted), default to 1
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
						transition={maybeReduceMotion(
							{ duration: MOTION_CONFIG.duration.normal },
							!!shouldReduceMotion,
						)}
						className="bg-muted relative size-24 shrink-0 overflow-hidden rounded-lg sm:size-40"
					>
						<Image
							src={currentImage.url}
							alt={currentImage.alt}
							fill
							className="object-cover"
							placeholder={currentImage.blurDataUrl ? "blur" : "empty"}
							blurDataURL={currentImage.blurDataUrl ?? undefined}
							sizes="(min-width: 640px) 160px, 96px"
							quality={IMAGE_QUALITY.STANDARD}
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
								transition={maybeReduceMotion(
									{
										duration: MOTION_CONFIG.duration.normal,
									},
									!!shouldReduceMotion,
								)}
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
							<Badge variant="warning" role="status" className="mt-1">
								Stock maximum atteint
							</Badge>
						)}
					</div>
				</div>

				{/* Link to product page */}
				<Link
					href={`/creations/${product.slug}`}
					onClick={handleClose}
					aria-label={`Voir la fiche produit : ${product.title}`}
					className="text-muted-foreground can-hover:hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
				>
					Voir la fiche produit
					<ArrowRight className="size-3.5" aria-hidden="true" />
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
						? "Ajout en cours…"
						: `Ajouter au panier · ${formatEuro(displayPrice * quantity)}`}
				</Button>
				{/* Validation error -- always present for aria-describedby, content swapped */}
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
