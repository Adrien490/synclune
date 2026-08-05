import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import type { FilterDefinition } from "@/shared/hooks/use-filter";
import { formatEuro } from "@/shared/utils/format-euro";
import { type ReadonlyURLSearchParams } from "next/navigation";

interface ProductTypeOption {
	slug: string;
	label: string;
}

// Filtres statiques
const STATIC_FILTERS = {
	onSale: {
		name: "En promotion",
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
	searchParams: ReadonlyURLSearchParams,
) {
	// Créer le mapping dynamique des couleurs
	const colorMapping: Record<string, string> = {};
	colors.forEach((color) => {
		colorMapping[color.slug] = color.name;
	});

	// Créer le mapping dynamique des matériaux
	const materialMapping: Record<string, string> = {};
	materials.forEach((material) => {
		materialMapping[material.slug] = material.name;
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

		// Disponibilité : la valeur d'URL est un token technique (`in_stock`),
		// jamais un libellé — seul le nom s'affiche. L'ancienne branche générique
		// « booléenne » ne matchait que `value === "true"` et laissait fuir
		// « En stock : in_stock » dans le bandeau (audit rail 2026-08-05, P2).
		if (key === "stockStatus") {
			return { label: "En stock", displayValue: "" };
		}

		// Prix — mêmes formes que `formatActiveFilterSummary` (« X € - Y € »,
		// « à partir de X € », « jusqu'à Y € »). L'ancien repli affichait un
		// plafond de 200 € écrit en dur, faux dès que le plafond réel du
		// catalogue est ailleurs (100 € aujourd'hui).
		if (key === "priceMin") {
			const priceMin = searchParams.get("priceMin");
			const priceMax = searchParams.get("priceMax");
			const minValue = priceMin ? parseInt(priceMin) : 0;

			if (!priceMax) {
				return { label: "Prix", displayValue: `à partir de ${formatEuro(minValue * 100)}` };
			}
			return {
				label: "Prix",
				displayValue: `${formatEuro(minValue * 100)} - ${formatEuro(parseInt(priceMax) * 100)}`,
			};
		}

		// `priceMax` ne se rend SEUL que si la borne basse est restée au défaut
		// (elle n'est alors pas écrite dans l'URL) : plage « jusqu'à Y € ». Avec
		// `priceMin`, c'est lui qui porte la paire — pas de second badge.
		if (key === "priceMax") {
			if (searchParams.get("priceMin")) {
				return null;
			}
			return { label: "Prix", displayValue: `jusqu'à ${formatEuro((parseInt(value) || 0) * 100)}` };
		}

		// Gestion des autres filtres
		const filterConfig = FILTER_CONFIG[key as keyof typeof FILTER_CONFIG];

		let displayValue = value;
		const label = filterConfig.name;

		// Pour les filtres avec des valeurs prédéfinies
		if ("values" in filterConfig) {
			const mappedValue = filterConfig.values[value as keyof typeof filterConfig.values];
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
