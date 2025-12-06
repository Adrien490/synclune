"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { FilterDefinition } from "@/shared/hooks/use-filter";
import type { ColorOption } from "@/modules/colors/data/get-color-options";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";

const STOCK_STATUS_LABELS: Record<string, string> = {
	in_stock: "En stock",
	low_stock: "Stock faible",
	out_of_stock: "Rupture",
};

const ACTIVE_STATUS_LABELS: Record<string, string> = {
	true: "Actives",
	false: "Inactives",
};

interface SkusFilterBadgesProps {
	colors: ColorOption[];
	materials: MaterialOption[];
}

function formatSkuFilter(
	filter: FilterDefinition,
	options: {
		colors: Map<string, string>;
		materials: Map<string, string>;
	}
) {
	const { colors, materials } = options;
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	// Gestion du statut de stock
	if (filterKey === "stockStatus") {
		const label = STOCK_STATUS_LABELS[value];
		return label ? { label: "Stock", displayValue: label } : null;
	}

	// Gestion du statut actif/inactif
	if (filterKey === "isActive") {
		const label = ACTIVE_STATUS_LABELS[value];
		return label ? { label: "Statut", displayValue: label } : null;
	}

	// Gestion des couleurs
	if (filterKey === "colorId") {
		const colorName = colors.get(value);
		return {
			label: "Couleur",
			displayValue: colorName || value,
		};
	}

	// Gestion des materiaux
	if (filterKey === "materialId") {
		const materialName = materials.get(value);
		return {
			label: "Materiau",
			displayValue: materialName || value,
		};
	}

	// Cas par defaut
	return {
		label: filterKey,
		displayValue: value,
	};
}

export function SkusFilterBadges({ colors, materials }: SkusFilterBadgesProps) {
	// Create lookup maps for efficient access
	const filterMaps = {
		colors: new Map(colors.map((c) => [c.id, c.name])),
		materials: new Map(materials.map((m) => [m.id, m.name])),
	};

	return (
		<FilterBadges
			formatFilter={(filter) => formatSkuFilter(filter, filterMaps)}
		/>
	);
}
