import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import type { FilterDefinition } from "@/shared/hooks/use-filter";
import { formatEuro } from "@/shared/utils/format-euro";
import { ReadonlyURLSearchParams } from "next/navigation";

interface ProductTypeOption {
	slug: string;
	label: string;
}

// Filtres statiques
const STATIC_FILTERS = {
	inStock: {
		name: "En stock",
	},
	search: {
		name: "Recherche",
	},
};

/**
 * Crée une fonction de formatage pour les filtres de produits
 * @param colors - Liste des couleurs depuis la base
 * @param materials - Liste des matériaux depuis la base
 * @param productTypes - Liste des types de produits depuis la base
 * @param searchParams - Paramètres de recherche URL (pour gérer le prix)
 */
export function createProductFilterFormatter(
	colors: GetColorsReturn["colors"],
	materials: MaterialOption[],
	productTypes: ProductTypeOption[],
	searchParams: ReadonlyURLSearchParams
) {
	// Créer le mapping dynamique des couleurs
	const colorMapping: Record<string, string> = {};
	colors.forEach((color) => {
		colorMapping[color.slug] = color.name;
	});

	// Créer le mapping dynamique des matériaux
	const materialMapping: Record<string, string> = {};
	materials.forEach((material) => {
		materialMapping[material.id] = material.name;
	});

	// Créer le mapping dynamique des types de produits
	const productTypeMapping: Record<string, string> = {};
	productTypes.forEach((type) => {
		productTypeMapping[type.slug] = type.label;
	});

	// Configuration des filtres avec mapping dynamique
	const FILTER_CONFIG = {
		// Types de produits (dynamique depuis la base)
		type: {
			name: "Type",
			values: productTypeMapping,
		},
		// Couleurs (dynamique depuis la base)
		color: {
			name: "Couleur",
			values: colorMapping,
		},
		// Matériaux (dynamique depuis la base)
		material: {
			name: "Matériau",
			values: materialMapping,
		},
		...STATIC_FILTERS,
	};

	// Fonction de formatage pour les filtres de produits
	return function formatProductFilter(filter: FilterDefinition) {
		const key = filter.key;
		const value = filter.value as string;

		// Gestion du filtre de notes clients
		if (key === "rating") {
			const stars = parseInt(value);
			return {
				label: "Notes",
				displayValue: `${stars}+ ★`,
			};
		}

		// Gestion des filtres de prix
		if (key === "priceMin") {
			const priceMin = searchParams.get("priceMin");
			const priceMax = searchParams.get("priceMax");
			const minValue = priceMin ? parseInt(priceMin) : 0;
			const maxValue = priceMax ? parseInt(priceMax) : 200;

			return {
				label: "Prix",
				displayValue: `${formatEuro(minValue * 100)} - ${formatEuro(maxValue * 100)}`,
			};
		}

		// Ne pas afficher priceMax séparément
		if (key === "priceMax") {
			return null;
		}

		// Gestion des autres filtres
		const filterConfig = FILTER_CONFIG[key as keyof typeof FILTER_CONFIG];
		if (!filterConfig) {
			return {
				label: key,
				displayValue: value,
			};
		}

		let displayValue = value;
		const label = filterConfig.name;

		// Pour les filtres avec des valeurs prédéfinies
		if ("values" in filterConfig && filterConfig.values) {
			const mappedValue =
				filterConfig.values[value as keyof typeof filterConfig.values];
			if (mappedValue) {
				displayValue = mappedValue;
			}
		}

		// Pour les filtres booléens
		if (!("values" in filterConfig) && value === "true") {
			displayValue = ""; // Pas de valeur à afficher, juste le nom du filtre
		}

		// Pour la recherche, afficher le terme
		if (key === "search") {
			displayValue = `"${value}"`;
		}

		return {
			label,
			displayValue,
		};
	};
}
