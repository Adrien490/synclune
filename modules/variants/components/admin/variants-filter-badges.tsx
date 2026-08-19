"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { type FilterDefinition } from "@/shared/hooks/use-filter";
import { formatStatusFilter } from "@/shared/utils/format-status-filter";
import type { ColorOption } from "@/modules/colors/data/get-color-options";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";

const STOCK_STATUS_LABELS: Record<string, string> = {
	in_stock: "En stock",
	low_stock: "Stock faible",
	out_of_stock: "Rupture",
};

interface VariantsFilterBadgesProps {
	colors: ColorOption[];
	materials: MaterialOption[];
}

function formatVariantFilter(
	filter: FilterDefinition,
	options: {
		colors: Map<string, string>;
		materials: Map<string, string>;
	},
) {
	const { colors, materials } = options;
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	// Gestion du statut de stock
	if (filterKey === "stockStatus") {
		const label = STOCK_STATUS_LABELS[value];
		return label ? { label: "Stock", displayValue: label } : null;
	}

	// Gestion du statut actif/inactif.
	// ⚠️ `filter.key` porte le préfixe : le suffixe est `isActive`, pas `active`
	// (`variants-filter-sheet.tsx` écrit `filter_isActive`). Comparé à "active",
	// le test échouait toujours et le badge tombait dans son cas par défaut, où
	// il rendait la clé technique : « isActive : true », y compris dans le nom
	// accessible du bouton de retrait.
	if (filterKey === "isActive") {
		return formatStatusFilter(value, "Actives", "Inactives");
	}

	// Gestion des couleurs
	if (filterKey === "colorId") {
		const colorName = colors.get(value);
		return {
			label: "Couleur",
			displayValue: colorName ?? value,
		};
	}

	// Gestion des matériaux
	if (filterKey === "materialId") {
		const materialName = materials.get(value);
		return {
			label: "Matériau",
			displayValue: materialName ?? value,
		};
	}

	// Cas par défaut
	return {
		label: filterKey,
		displayValue: value,
	};
}

export function VariantsFilterBadges({ colors, materials }: VariantsFilterBadgesProps) {
	// Create lookup maps for efficient access
	const filterMaps = {
		colors: new Map(colors.map((c) => [c.id, c.name])),
		materials: new Map(materials.map((m) => [m.id, m.name])),
	};

	return <FilterBadges formatFilter={(filter) => formatVariantFilter(filter, filterMaps)} />;
}
