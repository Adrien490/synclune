"use client";

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { SectionSearch, SEARCH_THRESHOLD } from "./filter-section-header";

import type { MaterialOption } from "@/modules/materials/data/get-material-options";

// ============================================================================
// TYPES
// ============================================================================

interface MaterialFilterSectionProps {
	materials: MaterialOption[];
	filteredMaterials: MaterialOption[];
	selectedValues: string[];
	materialSearch: string;
	onMaterialSearchChange: (value: string) => void;
	onToggle: (slug: string, checked: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Corps de la section "Matériaux" du filtre produit.
 * Rendu dans un panneau du menu drill-down (sans coquille accordéon).
 */
export function MaterialFilterSection({
	materials,
	filteredMaterials,
	selectedValues,
	materialSearch,
	onMaterialSearchChange,
	onToggle,
}: MaterialFilterSectionProps) {
	const haptic = useHaptic();
	if (materials.length === 0) return null;

	// `Set` construit une fois : un `.includes()` par ligne rescanne tout le
	// tableau à chaque rendu de la liste.
	const selectedSet = new Set(selectedValues);

	return (
		<>
			{materials.length > SEARCH_THRESHOLD && (
				<SectionSearch
					value={materialSearch}
					onChange={onMaterialSearchChange}
					placeholder="Rechercher un matériau…"
				/>
			)}
			<div className="space-y-1">
				{filteredMaterials.length === 0 ? (
					<p className="text-muted-foreground py-2 text-center text-xs">Aucun résultat</p>
				) : (
					filteredMaterials.map((material) => {
						const isSelected = selectedSet.has(material.slug);
						return (
							<CheckboxFilterItem
								key={material.slug}
								id={`material-${material.slug}`}
								checked={isSelected}
								onCheckedChange={(checked) => {
									haptic("selection");
									onToggle(material.slug, checked === true);
								}}
								count={material._count?.skus}
							>
								{material.name}
							</CheckboxFilterItem>
						);
					})
				)}
			</div>
		</>
	);
}
