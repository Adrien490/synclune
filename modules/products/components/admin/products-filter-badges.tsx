"use client";

import { Suspense, type ComponentProps } from "react";
import { type ProductStatus } from "@/app/generated/prisma/browser";
import { FilterBadges } from "@/shared/components/filter-badges";
import { type FilterDefinition } from "@/shared/hooks/use-filter";
import { formatEuro } from "@/shared/utils/format-euro";
import { useSearchParams } from "next/navigation";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";

const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
	DRAFT: "Brouillon",
	PUBLIC: "Public",
	ARCHIVED: "Archivé",
};

const STOCK_STATUS_LABELS: Record<string, string> = {
	in_stock: "En stock",
	low_stock: "Stock faible",
	out_of_stock: "Rupture de stock",
};

interface ProductsFilterBadgesProps {
	productTypes: Array<{ id: string; label: string; slug: string }>;
	collections: Array<{ id: string; name: string }>;
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
}

function formatProductFilter(
	filter: FilterDefinition,
	options: {
		productTypes: Map<string, string>;
		collections: Map<string, string>;
		colors: Map<string, string>;
		materials: Map<string, string>;
		searchParams: URLSearchParams;
	},
) {
	const { productTypes, collections, colors, materials, searchParams } = options;
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	// Gestion du statut de produit
	if (filterKey === "status") {
		const label = PRODUCT_STATUS_LABELS[value as keyof typeof PRODUCT_STATUS_LABELS];
		return label ? { label: "Statut", displayValue: label } : null;
	}

	// Gestion du statut de stock
	if (filterKey === "stockStatus") {
		const label = STOCK_STATUS_LABELS[value as keyof typeof STOCK_STATUS_LABELS];
		return label ? { label: "Stock", displayValue: label } : null;
	}

	// Gestion du prix (grouper priceMin/priceMax)
	if (filterKey === "priceMin") {
		const priceMin = searchParams.get("filter_priceMin");
		const priceMax = searchParams.get("filter_priceMax");
		const minValue = priceMin ? parseInt(priceMin) : 0;
		const maxValue = priceMax ? parseInt(priceMax) : 50000;

		return {
			label: "Prix",
			displayValue: `${formatEuro(minValue)} - ${formatEuro(maxValue)}`,
		};
	}

	// Ne pas afficher priceMax séparément
	if (filterKey === "priceMax") {
		return null;
	}

	// Gestion du type de bijou (slug-based)
	if (filterKey === "typeId") {
		const typeName = productTypes.get(value);
		return {
			label: "Type",
			displayValue: typeName ?? value,
		};
	}

	// Gestion des collections
	if (filterKey === "collectionId") {
		const collectionName = collections.get(value);
		return {
			label: "Collection",
			displayValue: collectionName ?? value,
		};
	}

	// Gestion des couleurs
	if (filterKey === "color") {
		const colorName = colors.get(value);
		return {
			label: "Couleur",
			displayValue: colorName ?? value,
		};
	}

	// Gestion des matériaux
	if (filterKey === "material") {
		const materialName = materials.get(value);
		return {
			label: "Matériau",
			displayValue: materialName ?? value,
		};
	}

	// Gestion de la promotion
	if (filterKey === "onSale") {
		return {
			label: "Promotion",
			displayValue: "En promotion",
		};
	}

	// Gestion de la publication
	if (filterKey === "isPublished") {
		return {
			label: "Publié",
			displayValue: value === "true" ? "Oui" : "Non",
		};
	}

	// Gestion des dates
	if (filterKey === "createdAfter") {
		return {
			label: "Créé après",
			displayValue: new Date(value).toLocaleDateString("fr-FR"),
		};
	}
	if (filterKey === "createdBefore") {
		return {
			label: "Créé avant",
			displayValue: new Date(value).toLocaleDateString("fr-FR"),
		};
	}
	if (filterKey === "updatedAfter") {
		return {
			label: "Modifié après",
			displayValue: new Date(value).toLocaleDateString("fr-FR"),
		};
	}
	if (filterKey === "updatedBefore") {
		return {
			label: "Modifié avant",
			displayValue: new Date(value).toLocaleDateString("fr-FR"),
		};
	}

	// Gestion des dates de publication
	if (filterKey === "publishedAfter") {
		return {
			label: "Publié après",
			displayValue: new Date(value).toLocaleDateString("fr-FR"),
		};
	}
	if (filterKey === "publishedBefore") {
		return {
			label: "Publié avant",
			displayValue: new Date(value).toLocaleDateString("fr-FR"),
		};
	}

	// Cas par défaut
	return {
		label: filterKey,
		displayValue: value,
	};
}

function ProductsFilterBadgesInner({
	productTypes,
	collections,
	colors,
	materials,
}: ProductsFilterBadgesProps) {
	const searchParams = useSearchParams();

	// Create lookup maps for efficient access
	const filterMaps = {
		productTypes: new Map(productTypes.map((t) => [t.slug, t.label])),
		collections: new Map(collections.map((c) => [c.id, c.name])),
		colors: new Map(colors.map((c) => [c.slug, c.name])),
		materials: new Map(materials.map((m) => [m.slug, m.name])),
	};

	return (
		<FilterBadges
			formatFilter={(filter) =>
				formatProductFilter(filter, {
					...filterMaps,
					searchParams,
				})
			}
		/>
	);
}

export function ProductsFilterBadges(props: ComponentProps<typeof ProductsFilterBadgesInner>) {
	return (
		<Suspense fallback={null}>
			<ProductsFilterBadgesInner {...props} />
		</Suspense>
	);
}
