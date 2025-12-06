"use client";

import { ProductStatus } from "@/app/generated/prisma/browser";
import { FilterBadges } from "@/shared/components/filter-badges";
import { FilterDefinition } from "@/shared/hooks/use-filter";
import { formatEuro } from "@/shared/utils/format-euro";
import { useSearchParams } from "next/navigation";

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
	productTypes: Array<{ id: string; label: string }>;
	collections: Array<{ id: string; name: string }>;
}

function formatProductFilter(
	filter: FilterDefinition,
	options: {
		productTypes: Map<string, string>;
		collections: Map<string, string>;
		searchParams: URLSearchParams;
	}
) {
	const { productTypes, collections, searchParams } = options;
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	// Gestion du statut de produit
	if (filterKey === "status") {
		const label =
			PRODUCT_STATUS_LABELS[value as keyof typeof PRODUCT_STATUS_LABELS];
		return label ? { label: "Statut", displayValue: label } : null;
	}

	// Gestion du statut de stock
	if (filterKey === "stockStatus") {
		const label =
			STOCK_STATUS_LABELS[value as keyof typeof STOCK_STATUS_LABELS];
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

	// Gestion du type de bijou
	if (filterKey === "typeId") {
		const typeName = productTypes.get(value);
		return {
			label: "Type",
			displayValue: typeName || value,
		};
	}

	// Gestion des collections
	if (filterKey === "collectionId") {
		const collectionName = collections.get(value);
		return {
			label: "Collection",
			displayValue: collectionName || value,
		};
	}

	// Gestion de la publication
	if (filterKey === "isPublished") {
		return {
			label: "Publié",
			displayValue: value === "true" ? "Oui" : "Non",
		};
	}

	// Gestion des dates de publication
	if (filterKey === "publishedAfter") {
		const date = new Date(value);
		return {
			label: "Publié après",
			displayValue: date.toLocaleDateString("fr-FR"),
		};
	}

	if (filterKey === "publishedBefore") {
		const date = new Date(value);
		return {
			label: "Publié avant",
			displayValue: date.toLocaleDateString("fr-FR"),
		};
	}

	// Cas par défaut
	return {
		label: filterKey,
		displayValue: value,
	};
}

export function ProductsFilterBadges({
	productTypes,
	collections,
}: ProductsFilterBadgesProps) {
	const searchParams = useSearchParams();

	// Create lookup maps for efficient access
	const filterMaps = {
		productTypes: new Map(productTypes.map((t) => [t.id, t.label])),
		collections: new Map(collections.map((c) => [c.id, c.name])),
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
