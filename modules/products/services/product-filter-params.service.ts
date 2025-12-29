/**
 * Service de gestion des paramètres de filtre produit
 *
 * Fonctions pures pour parser, construire et manipuler les paramètres URL
 * des filtres de la boutique.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FilterFormData {
	colors: string[];
	materials: string[];
	productTypes: string[];
	priceRange: [number, number];
	ratingMin: number | null;
	inStockOnly: boolean;
	onSale: boolean;
}

export interface ParseFilterParams {
	searchParams: URLSearchParams;
	activeProductTypeSlug?: string;
	defaultPriceRange: [number, number];
}

export interface BuildFilterURLParams {
	formData: FilterFormData;
	currentSearchParams: URLSearchParams;
	defaultPriceRange: [number, number];
	isOnCategoryPage: boolean;
	currentCategorySlug: string | null;
}

export interface ActiveFiltersResult {
	hasActiveFilters: boolean;
	activeFiltersCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Clés des paramètres URL de filtrage */
const FILTER_KEYS = [
	"color",
	"material",
	"type",
	"priceMin",
	"priceMax",
	"rating",
	"stockStatus",
	"onSale",
] as const;

/** Clés à exclure du comptage des filtres actifs */
const NON_FILTER_KEYS = ["page", "perPage", "sortBy", "search", "cursor", "direction"];

// ============================================================================
// PARSING
// ============================================================================

/**
 * Parse les paramètres URL en valeurs de formulaire de filtre
 *
 * @param params - Paramètres de parsing
 * @returns Valeurs du formulaire de filtre
 *
 * @example
 * ```ts
 * const values = parseFilterValuesFromURL({
 *   searchParams: new URLSearchParams("?color=or&priceMin=50"),
 *   defaultPriceRange: [0, 500],
 * });
 * // { colors: ["or"], priceRange: [50, 500], ... }
 * ```
 */
export function parseFilterValuesFromURL(params: ParseFilterParams): FilterFormData {
	const { searchParams, activeProductTypeSlug, defaultPriceRange } = params;

	const colors: string[] = [];
	const materials: string[] = [];
	const productTypes: string[] = [];
	let priceMin = defaultPriceRange[0];
	let priceMax = defaultPriceRange[1];
	let ratingMin: number | null = null;
	let inStockOnly = false;
	let onSale = false;

	// Ajouter le type actif depuis le path segment (page catégorie)
	if (activeProductTypeSlug) {
		productTypes.push(activeProductTypeSlug);
	}

	searchParams.forEach((value, key) => {
		switch (key) {
			case "color":
				colors.push(value);
				break;
			case "material":
				materials.push(value);
				break;
			case "type":
				productTypes.push(value);
				break;
			case "priceMin":
				priceMin = Number(value) || defaultPriceRange[0];
				break;
			case "priceMax":
				priceMax = Number(value) || defaultPriceRange[1];
				break;
			case "rating": {
				const val = Number(value);
				if (val >= 1 && val <= 5) ratingMin = val;
				break;
			}
			case "stockStatus":
				inStockOnly = value === "in_stock";
				break;
			case "onSale":
				onSale = value === "true" || value === "1";
				break;
		}
	});

	return {
		colors: [...new Set(colors)],
		materials: [...new Set(materials)],
		productTypes: [...new Set(productTypes)],
		priceRange: [priceMin, priceMax],
		ratingMin,
		inStockOnly,
		onSale,
	};
}

// ============================================================================
// URL BUILDING
// ============================================================================

/**
 * Construit les paramètres URL à partir des valeurs de filtre
 *
 * @param params - Paramètres de construction
 * @returns Objet avec le path cible et la query string
 *
 * @example
 * ```ts
 * const { targetPath, queryString } = buildFilterURL({
 *   formData: { colors: ["or"], ... },
 *   currentSearchParams: new URLSearchParams(),
 *   defaultPriceRange: [0, 500],
 *   isOnCategoryPage: false,
 *   currentCategorySlug: null,
 * });
 * // { targetPath: "/produits", queryString: "color=or" }
 * ```
 */
export function buildFilterURL(params: BuildFilterURLParams): {
	targetPath: string;
	queryString: string;
	fullUrl: string;
} {
	const {
		formData,
		currentSearchParams,
		defaultPriceRange,
		isOnCategoryPage,
		currentCategorySlug,
	} = params;

	const urlParams = new URLSearchParams(currentSearchParams.toString());

	// Nettoyer tous les anciens filtres
	for (const key of FILTER_KEYS) {
		urlParams.delete(key);
	}

	// Reset cursor pagination
	urlParams.delete("cursor");
	urlParams.delete("direction");

	// Déterminer le path de destination basé sur les types sélectionnés
	let targetPath = "/produits";
	const selectedTypes = formData.productTypes;

	if (selectedTypes.length === 1) {
		// Un seul type → naviguer vers la page catégorie dédiée
		targetPath = `/produits/${selectedTypes[0]}`;
	} else if (selectedTypes.length > 1) {
		// Multi-types → rester sur /produits avec searchParams
		for (const type of selectedTypes) {
			urlParams.append("type", type);
		}
	} else if (isOnCategoryPage && currentCategorySlug) {
		// Aucun type sélectionné mais on est sur une page catégorie → retour à /produits
		targetPath = "/produits";
	}

	// Couleurs
	if (formData.colors.length > 0) {
		if (formData.colors.length === 1) {
			urlParams.set("color", formData.colors[0]);
		} else {
			for (const color of formData.colors) {
				urlParams.append("color", color);
			}
		}
	}

	// Matériaux
	if (formData.materials.length > 0) {
		if (formData.materials.length === 1) {
			urlParams.set("material", formData.materials[0]);
		} else {
			for (const material of formData.materials) {
				urlParams.append("material", material);
			}
		}
	}

	// Prix
	if (
		formData.priceRange[0] !== defaultPriceRange[0] ||
		formData.priceRange[1] !== defaultPriceRange[1]
	) {
		urlParams.set("priceMin", formData.priceRange[0].toString());
		urlParams.set("priceMax", formData.priceRange[1].toString());
	}

	// Notes clients
	if (formData.ratingMin !== null) {
		urlParams.set("rating", formData.ratingMin.toString());
	}

	// Disponibilité
	if (formData.inStockOnly) {
		urlParams.set("stockStatus", "in_stock");
	}

	// Promotions
	if (formData.onSale) {
		urlParams.set("onSale", "true");
	}

	const queryString = urlParams.toString();
	const fullUrl = queryString ? `${targetPath}?${queryString}` : targetPath;

	return { targetPath, queryString, fullUrl };
}

/**
 * Construit l'URL pour effacer tous les filtres
 *
 * @param currentSearchParams - Paramètres URL actuels
 * @returns URL avec filtres effacés
 */
export function buildClearFiltersURL(currentSearchParams: URLSearchParams): string {
	const urlParams = new URLSearchParams(currentSearchParams.toString());

	// Supprimer tous les filtres
	for (const key of FILTER_KEYS) {
		urlParams.delete(key);
	}

	// Reset cursor pagination
	urlParams.delete("cursor");
	urlParams.delete("direction");

	const targetPath = "/produits";
	const queryString = urlParams.toString();

	return queryString ? `${targetPath}?${queryString}` : targetPath;
}

// ============================================================================
// COUNTING
// ============================================================================

/**
 * Compte les filtres actifs depuis les paramètres URL
 *
 * @param searchParams - Paramètres URL
 * @returns Nombre de filtres actifs et indicateur booléen
 *
 * @example
 * ```ts
 * const { activeFiltersCount, hasActiveFilters } = countActiveFilters(
 *   new URLSearchParams("?color=or&color=argent&priceMin=50")
 * );
 * // { activeFiltersCount: 3, hasActiveFilters: true }
 * ```
 */
export function countActiveFilters(searchParams: URLSearchParams): ActiveFiltersResult {
	let count = 0;

	searchParams.forEach((value, key) => {
		// Ignorer les paramètres non-filtre
		if (NON_FILTER_KEYS.includes(key)) {
			return;
		}

		switch (key) {
			case "type":
			case "color":
			case "material":
			case "rating":
			case "stockStatus":
			case "onSale":
				count += 1;
				break;
			case "priceMin":
				// Compter une seule fois pour la plage de prix
				count += 1;
				break;
			case "priceMax":
				// Ne pas compter (déjà compté avec priceMin)
				break;
		}
	});

	return {
		hasActiveFilters: count > 0,
		activeFiltersCount: count,
	};
}

// ============================================================================
// DEFAULTS
// ============================================================================

/**
 * Retourne les valeurs par défaut du formulaire de filtre
 *
 * @param defaultPriceRange - Plage de prix par défaut
 * @returns Valeurs par défaut
 */
export function getDefaultFilterValues(defaultPriceRange: [number, number]): FilterFormData {
	return {
		colors: [],
		materials: [],
		productTypes: [],
		priceRange: defaultPriceRange,
		ratingMin: null,
		inStockOnly: false,
		onSale: false,
	};
}

// ============================================================================
// PATH UTILITIES
// ============================================================================

/**
 * Détermine si le pathname correspond à une page catégorie
 *
 * @param pathname - Chemin URL
 * @returns true si c'est une page catégorie /produits/[type]
 */
export function isProductCategoryPage(pathname: string): boolean {
	return pathname.startsWith("/produits/") && pathname !== "/produits";
}

/**
 * Extrait le slug de catégorie depuis le pathname
 *
 * @param pathname - Chemin URL
 * @returns Slug de catégorie ou null
 */
export function getCategorySlugFromPath(pathname: string): string | null {
	if (!isProductCategoryPage(pathname)) {
		return null;
	}
	return pathname.split("/produits/")[1]?.split("/")[0] ?? null;
}
