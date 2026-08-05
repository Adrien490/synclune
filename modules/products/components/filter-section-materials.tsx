"use client";

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { FilterOverflowList } from "./filter-overflow-list";

import type { MaterialOption } from "@/modules/materials/data/get-material-options";

// ============================================================================
// TYPES
// ============================================================================

interface MaterialFilterSectionProps {
	/** Préfixe des `id` DOM — cf. `ProductFilterCompartments.host`. */
	idPrefix: string;
	/** Matériaux complets, déjà triés par nombre de pièces décroissant. */
	materials: MaterialOption[];
	selectedValues: string[];
	onToggle: (slug: string, checked: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Corps du compartiment « Matériaux » du panneau de filtres — liste bornée à
 * 6 entrées + « + N autres », recherche au dépli (cf. `FilterOverflowList`).
 */
export function MaterialFilterSection({
	idPrefix,
	materials,
	selectedValues,
	onToggle,
}: MaterialFilterSectionProps) {
	const haptic = useHaptic();
	if (materials.length === 0) return null;

	// `Set` construit une fois : un `.includes()` par ligne rescanne tout le
	// tableau à chaque rendu de la liste.
	const selectedSet = new Set(selectedValues);

	return (
		<FilterOverflowList
			items={materials}
			itemKey={(material) => material.slug}
			moreLabel={(n) => `+ ${n} autre${n > 1 ? "s" : ""} matériau${n > 1 ? "x" : ""}`}
			matchesSearch={(material, query) => material.name.toLowerCase().includes(query)}
			searchPlaceholder="Rechercher un matériau…"
			renderItem={(material) => (
				<CheckboxFilterItem
					id={`${idPrefix}-material-${material.slug}`}
					checked={selectedSet.has(material.slug)}
					onCheckedChange={(checked) => {
						haptic("selection");
						onToggle(material.slug, checked === true);
					}}
					count={material._count?.skus}
				>
					{material.name}
				</CheckboxFilterItem>
			)}
		/>
	);
}
