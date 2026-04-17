"use client";

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { SectionHeader, SectionSearch, SEARCH_THRESHOLD } from "./filter-section-header";

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
	onReset: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MaterialFilterSection({
	materials,
	filteredMaterials,
	selectedValues,
	materialSearch,
	onMaterialSearchChange,
	onToggle,
	onReset,
}: MaterialFilterSectionProps) {
	const haptic = useHaptic();
	if (materials.length === 0) return null;

	return (
		<AccordionItem value="materials">
			<AccordionTrigger headingLevel={3} className="hover:no-underline">
				<SectionHeader label="Matériaux" count={selectedValues.length} onReset={onReset} />
			</AccordionTrigger>
			<AccordionContent>
				{materials.length > SEARCH_THRESHOLD && (
					<SectionSearch
						value={materialSearch}
						onChange={onMaterialSearchChange}
						placeholder="Rechercher un matériau..."
					/>
				)}
				<div className="space-y-1">
					{filteredMaterials.length === 0 ? (
						<p className="text-muted-foreground py-2 text-center text-xs">Aucun résultat</p>
					) : (
						filteredMaterials.map((material) => {
							const isSelected = selectedValues.includes(material.slug);
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
			</AccordionContent>
		</AccordionItem>
	);
}
