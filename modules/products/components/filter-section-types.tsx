"use client";

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { FilterOverflowList } from "./filter-overflow-list";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductTypeOption {
	slug: string;
	label: string;
	_count?: { products: number };
}

interface TypeFilterSectionProps {
	/** Préfixe des `id` DOM — cf. `ProductFilterCompartments.host`. */
	idPrefix: string;
	/** Types complets, déjà triés par nombre de pièces décroissant. */
	productTypes: ProductTypeOption[];
	selectedValues: string[];
	onToggle: (slug: string, checked: boolean) => void;
	/**
	 * Intention de coche (survol / focus / pointer down), AVANT le clic.
	 *
	 * Le type est le seul filtre qui change de path (`/produits` ↔
	 * `/produits/[slug]`) : c'est le seul dont la cible mérite un préchargement.
	 * Absent dans le panneau mobile, qui n'applique qu'au bouton.
	 */
	onIntent?: (slug: string, checked: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Corps du compartiment « Types de bijoux » du panneau de filtres — liste
 * bornée à 6 entrées + « + N autres » (cf. `FilterOverflowList`).
 */
export function TypeFilterSection({
	idPrefix,
	productTypes,
	selectedValues,
	onToggle,
	onIntent,
}: TypeFilterSectionProps) {
	const haptic = useHaptic();
	if (productTypes.length === 0) return null;

	// `Set` construit une fois : un `.includes()` par ligne rescanne tout le
	// tableau à chaque rendu de la liste.
	const selectedSet = new Set(selectedValues);

	return (
		<FilterOverflowList
			items={productTypes}
			itemKey={(type) => type.slug}
			moreLabel={(n) => `+ ${n} autre${n > 1 ? "s" : ""} type${n > 1 ? "s" : ""}`}
			matchesSearch={(type, query) => type.label.toLowerCase().includes(query)}
			searchPlaceholder="Rechercher un type…"
			renderItem={(type) => (
				<CheckboxFilterItem
					id={`${idPrefix}-type-${type.slug}`}
					checked={selectedSet.has(type.slug)}
					onCheckedChange={(checked) => {
						haptic("selection");
						onToggle(type.slug, checked === true);
					}}
					onIntent={onIntent && (() => onIntent(type.slug, !selectedSet.has(type.slug)))}
					count={type._count?.products}
				>
					{type.label}
				</CheckboxFilterItem>
			)}
		/>
	);
}
