"use client";

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { cn } from "@/shared/utils/cn";
import { CheckIcon } from "@phosphor-icons/react/ssr";
import { isLightColor, getContrastTextColor } from "@/modules/colors/utils/color-contrast.utils";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { FilterOverflowList } from "./filter-overflow-list";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";

// ============================================================================
// TYPES
// ============================================================================

interface ColorFilterSectionProps {
	/** Préfixe des `id` DOM — cf. `ProductFilterCompartments.host`. */
	idPrefix: string;
	/** Couleurs complètes, déjà triées par nombre de pièces décroissant. */
	colors: GetColorsReturn["colors"];
	selectedValues: string[];
	onToggle: (slug: string, checked: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Corps du compartiment « Couleurs » du panneau de filtres — liste bornée à
 * 6 entrées + « + N autres », recherche au dépli (cf. `FilterOverflowList`).
 */
export function ColorFilterSection({
	idPrefix,
	colors,
	selectedValues,
	onToggle,
}: ColorFilterSectionProps) {
	const haptic = useHaptic();
	if (colors.length === 0) return null;

	// `Set` construit une fois : un `selectedValues.includes()` par ligne rescanne
	// tout le tableau à chaque rendu de la liste.
	const selectedSet = new Set(selectedValues);

	return (
		<FilterOverflowList
			items={colors}
			itemKey={(color) => color.slug}
			moreLabel={(n) => `+ ${n} autre${n > 1 ? "s" : ""} couleur${n > 1 ? "s" : ""}`}
			matchesSearch={(color, query) => color.name.toLowerCase().includes(query)}
			searchPlaceholder="Rechercher une couleur…"
			renderItem={(color) => {
				const isSelected = selectedSet.has(color.slug);
				const light = isLightColor(color.hex, 0.85);
				return (
					<CheckboxFilterItem
						id={`${idPrefix}-color-${color.slug}`}
						checked={isSelected}
						onCheckedChange={(checked) => {
							haptic("selection");
							onToggle(color.slug, checked === true);
						}}
						indicator={
							<span
								className={cn(
									// `block` obligatoire : un <span> inline ignore width/height —
									// la pastille se peignait 2px de large (audit 2026-08-04).
									// 32px (« La réglette », lot 1) : la couleur est le PRODUIT,
									// elle ne se juge pas sur un disque de 24px.
									"relative block size-8 rounded-full shadow-sm",
									light ? "border-border border" : "border-border/50 border",
									// L'anneau interne permanent fait exister les teintes quasi
									// blanches (Or blanc / Cristal / Perle : 1,06-1,09:1 nues).
									isSelected
										? "ring-brand-rose-strong ring-2 ring-offset-1"
										: "ring-1 ring-black/10 ring-inset",
								)}
								style={{
									backgroundColor: color.hex,
								}}
							>
								{isSelected && (
									<CheckIcon
										className="absolute inset-0 m-auto size-4"
										style={{
											color: getContrastTextColor(color.hex),
										}}
										weight="bold"
									/>
								)}
							</span>
						}
						count={color._count.skus}
					>
						{color.name}
					</CheckboxFilterItem>
				);
			}}
		/>
	);
}
