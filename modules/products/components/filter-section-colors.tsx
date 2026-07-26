"use client";

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { cn } from "@/shared/utils/cn";
import { Check } from "lucide-react";
import { isLightColor, getContrastTextColor } from "@/modules/colors/utils/color-contrast.utils";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { SectionSearch, SEARCH_THRESHOLD } from "./filter-section-header";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";

// ============================================================================
// TYPES
// ============================================================================

interface ColorFilterSectionProps {
	colors: GetColorsReturn["colors"];
	filteredColors: GetColorsReturn["colors"];
	selectedValues: string[];
	colorSearch: string;
	onColorSearchChange: (value: string) => void;
	onToggle: (slug: string, checked: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Corps de la section "Couleurs" du filtre produit.
 * Rendu dans un panneau du menu drill-down (sans coquille accordéon).
 */
export function ColorFilterSection({
	colors,
	filteredColors,
	selectedValues,
	colorSearch,
	onColorSearchChange,
	onToggle,
}: ColorFilterSectionProps) {
	const haptic = useHaptic();
	if (colors.length === 0) return null;

	// `Set` construit une fois : un `selectedValues.includes()` par ligne rescanne
	// tout le tableau à chaque rendu de la liste.
	const selectedSet = new Set(selectedValues);

	return (
		<>
			{colors.length > SEARCH_THRESHOLD && (
				<SectionSearch
					value={colorSearch}
					onChange={onColorSearchChange}
					placeholder="Rechercher une couleur…"
				/>
			)}
			<div className="space-y-1">
				{filteredColors.length === 0 ? (
					<p className="text-muted-foreground py-2 text-center text-xs">Aucun résultat</p>
				) : (
					filteredColors.map((color) => {
						const isSelected = selectedSet.has(color.slug);
						const light = isLightColor(color.hex, 0.85);
						return (
							<CheckboxFilterItem
								key={color.slug}
								id={`color-${color.slug}`}
								checked={isSelected}
								onCheckedChange={(checked) => {
									haptic("selection");
									onToggle(color.slug, checked === true);
								}}
								indicator={
									<span
										className={cn(
											"relative size-6 rounded-full shadow-sm",
											light ? "border-border border" : "border-border/50 border",
											isSelected
												? "ring-primary ring-2 ring-offset-1"
												: "ring-1 ring-black/5 ring-inset",
										)}
										style={{
											backgroundColor: color.hex,
										}}
									>
										{isSelected && (
											<Check
												className="absolute inset-0 m-auto size-3"
												style={{
													color: getContrastTextColor(color.hex),
												}}
												strokeWidth={3}
											/>
										)}
									</span>
								}
								count={color._count.skus}
							>
								{color.name}
							</CheckboxFilterItem>
						);
					})
				)}
			</div>
		</>
	);
}
