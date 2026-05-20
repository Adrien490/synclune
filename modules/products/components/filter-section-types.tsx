"use client";

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { useHaptic } from "@/shared/hooks/use-haptic";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductTypeOption {
	slug: string;
	label: string;
	_count?: { products: number };
}

interface TypeFilterSectionProps {
	productTypes: ProductTypeOption[];
	selectedValues: string[];
	onToggle: (slug: string, checked: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Corps de la section "Types de bijoux" du filtre produit.
 * Rendu dans un panneau du menu drill-down (sans coquille accordéon).
 */
export function TypeFilterSection({
	productTypes,
	selectedValues,
	onToggle,
}: TypeFilterSectionProps) {
	const haptic = useHaptic();
	if (productTypes.length === 0) return null;

	return (
		<div className="space-y-1">
			{productTypes.map((type) => {
				const isSelected = selectedValues.includes(type.slug);
				return (
					<CheckboxFilterItem
						key={type.slug}
						id={`type-${type.slug}`}
						checked={isSelected}
						onCheckedChange={(checked) => {
							haptic("selection");
							onToggle(type.slug, checked === true);
						}}
						count={type._count?.products}
					>
						{type.label}
					</CheckboxFilterItem>
				);
			})}
		</div>
	);
}
