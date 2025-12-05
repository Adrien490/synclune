"use client";

import { cn } from "@/shared/utils/cn";
import { AlertCircle, Check } from "lucide-react";
import type { Color, Material, Size } from "@/modules/skus/types/sku-selector.types";

/**
 * Sélecteurs de variantes inline (pas URL-based)
 * Utilisés dans le VariantSelectionDrawer pour une sélection locale
 */

// ============================================================================
// InlineColorSelector
// ============================================================================

interface InlineColorSelectorProps {
	colors: Color[];
	selected: string | null;
	onSelect: (colorSlug: string | null) => void;
	isAvailable: (colorSlug: string) => boolean;
	disabled?: boolean;
}

export function InlineColorSelector({
	colors,
	selected,
	onSelect,
	isAvailable,
	disabled = false,
}: InlineColorSelectorProps) {
	if (colors.length === 0) return null;

	return (
		<fieldset
			className="space-y-3"
			role="radiogroup"
			aria-label="Sélection de couleur"
		>
			<legend className="text-sm/6 font-semibold tracking-tight antialiased">
				Couleur
			</legend>
			<div className="flex flex-wrap gap-3">
				{colors.map((color) => {
					const colorIdentifier = color.slug || color.id;
					const isSelected = colorIdentifier === selected;
					const available = isAvailable(colorIdentifier);

					return (
						<button
							key={color.id}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-label={`${color.name}${!available ? " (indisponible)" : ""}`}
							onClick={() => onSelect(colorIdentifier)}
							disabled={!available || disabled}
							className={cn(
								"group relative flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
								"hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!available && "opacity-70 saturate-50"
							)}
						>
							{color.hex && (
								<div
									className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
									style={{ backgroundColor: color.hex }}
								/>
							)}
							<div className="text-left">
								<span className="text-sm/6 tracking-normal antialiased font-medium">
									{color.name}
								</span>
								{!available && (
									<p className="text-xs/5 tracking-normal antialiased text-muted-foreground">
										Indisponible
									</p>
								)}
							</div>
							{isSelected && (
								<Check className="w-4 h-4 text-primary ml-auto" />
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}

// ============================================================================
// InlineMaterialSelector
// ============================================================================

interface InlineMaterialSelectorProps {
	materials: Material[];
	selected: string | null;
	onSelect: (materialName: string | null) => void;
	isAvailable: (materialName: string) => boolean;
	disabled?: boolean;
}

export function InlineMaterialSelector({
	materials,
	selected,
	onSelect,
	isAvailable,
	disabled = false,
}: InlineMaterialSelectorProps) {
	// Ne pas afficher si un seul matériau ou aucun
	if (materials.length <= 1) return null;

	return (
		<fieldset
			className="space-y-3"
			role="radiogroup"
			aria-label="Sélection de matériau"
		>
			<legend className="text-sm/6 font-semibold tracking-tight antialiased">
				Matériau
			</legend>
			<div className="grid grid-cols-2 gap-2">
				{materials.map((material) => {
					const isSelected =
						material.name.toLowerCase() === selected?.toLowerCase();
					const available = isAvailable(material.name);

					return (
						<button
							key={material.name}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-label={`${material.name}${!available ? " (indisponible)" : ""}`}
							onClick={() => onSelect(material.name)}
							disabled={!available || disabled}
							className={cn(
								"flex items-center justify-between p-3 rounded-lg border text-left transition-all",
								"hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!available && "opacity-70 saturate-50"
							)}
						>
							<span className="text-sm/6 tracking-normal antialiased font-medium">
								{material.name}
							</span>
							{isSelected && <Check className="w-4 h-4 text-primary" />}
							{!available && (
								<AlertCircle className="w-4 h-4 text-muted-foreground" />
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}

// ============================================================================
// InlineSizeSelector
// ============================================================================

interface InlineSizeSelectorProps {
	sizes: Size[];
	selected: string | null;
	onSelect: (size: string | null) => void;
	isAvailable: (size: string) => boolean;
	productTypeSlug?: string | null;
	disabled?: boolean;
}

export function InlineSizeSelector({
	sizes,
	selected,
	onSelect,
	isAvailable,
	productTypeSlug,
	disabled = false,
}: InlineSizeSelectorProps) {
	if (sizes.length === 0) return null;

	// Label adapté au type de produit
	const getSizeLabel = () => {
		const slug = productTypeSlug?.toLowerCase();
		if (slug === "rings" || slug === "ring" || slug === "bagues" || slug === "bague")
			return "Taille (Diamètre)";
		if (slug === "bracelets" || slug === "bracelet")
			return "Taille (Tour de poignet)";
		return "Taille";
	};

	return (
		<fieldset
			className="space-y-3"
			role="radiogroup"
			aria-label="Sélection de taille"
		>
			<legend className="text-sm/6 font-semibold tracking-tight antialiased">
				{getSizeLabel()}
			</legend>
			<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
				{sizes.map((sizeOption) => {
					const isSelected = sizeOption.size === selected;
					const available = isAvailable(sizeOption.size);

					return (
						<button
							key={sizeOption.size}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-label={`Taille ${sizeOption.size}${!available ? " (indisponible)" : ""}`}
							onClick={() => onSelect(sizeOption.size)}
							disabled={!available || disabled}
							className={cn(
								"p-2 text-center rounded-lg border transition-all",
								"hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!available && "opacity-70 saturate-50"
							)}
						>
							<span className="text-sm/6 tracking-normal antialiased font-medium">
								{sizeOption.size}
							</span>
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}
