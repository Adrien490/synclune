import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { FilterDefinition } from "@/shared/hooks/use-filter";
import { formatEuro } from "@/shared/utils/format-euro";
import { ReadonlyURLSearchParams } from "next/navigation";

// Filtres autres que les couleurs
const OTHER_FILTERS = {
	material: {
		name: "Matériau",
		values: {
			argent: "Argent",
			or: "Or",
			acier: "Acier inoxydable",
			cuivre: "Cuivre",
			laiton: "Laiton",
		},
	},
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
 * @param searchParams - Paramètres de recherche URL (pour gérer le prix)
 */
export function createProductFilterFormatter(
	colors: GetColorsReturn["colors"],
	searchParams: ReadonlyURLSearchParams
) {
	// Créer le mapping dynamique des couleurs
	const colorMapping: Record<string, string> = {};
	colors.forEach((color) => {
		colorMapping[color.slug] = color.name;
	});

	// Configuration des filtres avec mapping dynamique
	const FILTER_CONFIG = {
		// Couleurs (dynamique depuis la base)
		color: {
			name: "Couleur",
			values: colorMapping,
		},
		...OTHER_FILTERS,
	};

	// Fonction de formatage pour les filtres de produits
	return function formatProductFilter(filter: FilterDefinition) {
		const key = filter.key;
		const value = filter.value as string;

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
