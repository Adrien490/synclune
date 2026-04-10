"use client";

import dynamic from "next/dynamic";
import { Check, Minus, Plus } from "lucide-react";
import { m } from "motion/react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { isLightColor } from "@/modules/colors/utils/color-contrast.utils";
import { useRadioGroupKeyboard } from "@/shared/hooks/use-radio-group-keyboard";
import { formatEuro } from "@/shared/utils/format-euro";
import ScrollFade from "@/shared/components/scroll-fade";

import type { ColorOption, MaterialOption, ActiveSku } from "./sku-selector-utils";
import {
	VALIDATION_ERROR_ID,
	QUANTITY_BOUNDS_ID,
	COLOR_LEGEND_ID,
	MATERIAL_LEGEND_ID,
	SIZE_LEGEND_ID,
} from "./sku-selector-utils";

// Lazy loading - size guide dialog loads only when opened
const SizeGuideDialog = dynamic(() =>
	import("@/modules/skus/components/size-guide-dialog").then((mod) => mod.SizeGuideDialog),
);

// ============================================================================
// Color Selector
// ============================================================================

export interface ColorSelectorProps {
	colors: ColorOption[];
	selectedValue: string;
	onSelect: (slug: string) => void;
	isPending: boolean;
	hasValidationErrors: boolean;
	colorAvailability: Map<string, boolean>;
}

export function ColorSelector({
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

export interface MaterialSelectorProps {
	materials: MaterialOption[];
	selectedValue: string;
	onSelect: (slug: string) => void;
	isPending: boolean;
	hasValidationErrors: boolean;
	materialAvailability: Map<string, boolean>;
}

export function MaterialSelector({
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

export interface SizeSelectorGroupProps {
	sizes: string[];
	selectedValue: string;
	onSelect: (size: string) => void;
	isPending: boolean;
	hasValidationErrors: boolean;
	sizeAvailability: Map<string, boolean>;
	productTypeSlug?: string | null;
}

export function SizeSelectorGroup({
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
// Quantity Section (isolated for performance -- only re-renders on quantity change)
// ============================================================================

export interface QuantitySectionProps {
	quantity: number;
	maxQuantity: number;
	onQuantityChange: (q: number) => void;
	isPending: boolean;
	selectedSku: ActiveSku | undefined;
	displayPrice: number;
}

export function QuantitySection({
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
