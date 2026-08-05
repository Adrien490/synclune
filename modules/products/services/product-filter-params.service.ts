/**
 * Service de gestion des paramètres de filtre produit
 *
 * Fonctions pures pour parser, construire et manipuler les paramètres URL
 * des filtres de la boutique.
 */

import type { ProductFilters } from "../types/product.types";

// ============================================================================
// TYPES
// ============================================================================

export interface FilterFormData {
	colors: string[];
	materials: string[];
	productTypes: string[];
	priceRange: [number, number];
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

interface ActiveFiltersResult {
	hasActiveFilters: boolean;
	activeFiltersCount: number;
}

/** Identifiants stables des sections de filtre (ordre d'affichage du panneau). */
export type FilterSectionId = "types" | "price" | "colors" | "materials" | "availability";

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
			case "stockStatus":
				inStockOnly = value === "in_stock";
				break;
			case "onSale":
				onSale = value === "true" || value === "1";
				break;
		}
	});

	// Clamp prices to valid range
	priceMin = Math.max(0, Math.min(priceMin, defaultPriceRange[1]));
	priceMax = Math.max(priceMin, Math.min(priceMax, defaultPriceRange[1]));

	return {
		colors: [...new Set(colors)],
		materials: [...new Set(materials)],
		productTypes: [...new Set(productTypes)],
		priceRange: [priceMin, priceMax],
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
			urlParams.set("color", formData.colors[0]!);
		} else {
			for (const color of formData.colors) {
				urlParams.append("color", color);
			}
		}
	}

	// Matériaux
	if (formData.materials.length > 0) {
		if (formData.materials.length === 1) {
			urlParams.set("material", formData.materials[0]!);
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
	const hasPriceFilter = searchParams.has("priceMin") || searchParams.has("priceMax");

	searchParams.forEach((value, key) => {
		// Ignorer les paramètres non-filtre
		if (NON_FILTER_KEYS.includes(key)) {
			return;
		}

		switch (key) {
			case "type":
			case "color":
			case "material":
			case "stockStatus":
			case "onSale":
				count += 1;
				break;
		}
	});

	if (hasPriceFilter) {
		count += 1;
	}

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

// ============================================================================
// SECTION ACTIVE COUNT
// ============================================================================

/**
 * Compte les filtres actifs par section depuis les valeurs du formulaire.
 * Sert à la fois aux badges des en-têtes de section et au total
 * `pendingFilterCount`.
 *
 * @param values - Valeurs courantes du formulaire de filtre
 * @param defaultPriceRange - Plage de prix par défaut (pour détecter un prix custom)
 */
export function getSectionActiveCount(
	values: FilterFormData,
	defaultPriceRange: [number, number],
): Record<FilterSectionId, number> {
	const priceActive =
		values.priceRange[0] !== defaultPriceRange[0] || values.priceRange[1] !== defaultPriceRange[1];

	return {
		types: values.productTypes.length,
		price: priceActive ? 1 : 0,
		colors: values.colors.length,
		materials: values.materials.length,
		availability: (values.inStockOnly ? 1 : 0) + (values.onSale ? 1 : 0),
	};
}

/**
 * Convertit les valeurs du formulaire de filtre vers la forme `ProductFilters`
 * consommée par `getProducts` — la MÊME dérivation que le chemin URL
 * (`buildFilterURL` → `parseFilters`), pour que le compteur vivant du panneau
 * compte exactement ce que la grille affichera : prix euros → centimes
 * (`Math.floor(x * 100)`), plage par défaut omise, `stockStatus: "in_stock"`.
 */
export function filterFormDataToProductFilters(
	values: FilterFormData,
	defaultPriceRange: [number, number],
): ProductFilters {
	const filters: ProductFilters = {};

	if (values.productTypes.length > 0) filters.type = [...values.productTypes].sort();
	if (values.colors.length > 0) filters.color = [...values.colors].sort();
	if (values.materials.length > 0) filters.material = [...values.materials].sort();

	// `> 0` et non `!== défaut` sur le min : parseFilters ignore un priceMin de 0,
	// le reproduire ici garde les deux chemins bit-identiques.
	if (values.priceRange[0] !== defaultPriceRange[0] && values.priceRange[0] > 0) {
		filters.priceMin = Math.floor(values.priceRange[0] * 100);
	}
	if (values.priceRange[1] !== defaultPriceRange[1] && values.priceRange[1] > 0) {
		filters.priceMax = Math.floor(values.priceRange[1] * 100);
	}

	if (values.inStockOnly) filters.stockStatus = "in_stock";
	if (values.onSale) filters.onSale = true;

	return filters;
}

/**
 * Réinitialise UN groupe de filtres à sa valeur par défaut — utilisé par la
 * sortie chiffrée de l'état vide (« Retire la couleur pour en voir 24 ») pour
 * recompter sans le dernier groupe modifié.
 */
export function resetFilterGroup(
	values: FilterFormData,
	group: FilterSectionId,
	defaultPriceRange: [number, number],
): FilterFormData {
	switch (group) {
		case "types":
			return { ...values, productTypes: [] };
		case "colors":
			return { ...values, colors: [] };
		case "materials":
			return { ...values, materials: [] };
		case "price":
			return { ...values, priceRange: [...defaultPriceRange] as [number, number] };
		case "availability":
			return { ...values, inStockOnly: false, onSale: false };
	}
}

/**
 * Inverse de {@link filterFormDataToProductFilters} — pour un appelant SERVEUR
 * qui a déjà les `ProductFilters` parsés (les pages catalogue) et veut la forme
 * « formulaire », notamment pour en tirer un résumé lisible.
 *
 * Les deux fonctions vivent côte à côte volontairement : c'est ce qui garantit
 * que la conversion centimes ↔ euros ne dérive pas d'un côté seulement.
 */
export function productFiltersToFilterFormData(
	filters: ProductFilters,
	defaultPriceRange: [number, number],
): FilterFormData {
	const toArray = (value: string | string[] | undefined): string[] =>
		value === undefined ? [] : Array.isArray(value) ? value : [value];

	return {
		productTypes: toArray(filters.type),
		colors: toArray(filters.color),
		materials: toArray(filters.material),
		priceRange: [
			filters.priceMin !== undefined ? Math.round(filters.priceMin / 100) : defaultPriceRange[0],
			filters.priceMax !== undefined ? Math.round(filters.priceMax / 100) : defaultPriceRange[1],
		],
		inStockOnly: filters.stockStatus === "in_stock",
		onSale: filters.onSale === true,
	};
}

/**
 * Résumé en clair des filtres actifs — la ligne « 9 pièces · Papilloux, Or
 * jaune, jusqu'à 65 € » sous le titre du catalogue (rail desktop).
 *
 * Fonction pure : les libellés viennent de l'appelant (le serveur les a déjà,
 * il n'y a pas de second fetch). Retourne `null` quand rien n'est filtré — la
 * ligne de compte reste alors telle quelle.
 */
export function formatActiveFilterSummary(
	values: FilterFormData,
	labels: {
		types?: Record<string, string>;
		colors?: Record<string, string>;
		materials?: Record<string, string>;
	},
	defaultPriceRange: [number, number],
): string | null {
	const parts: string[] = [];

	const resolve = (slugs: string[], map?: Record<string, string>) =>
		slugs.map((slug) => map?.[slug] ?? slug);

	parts.push(...resolve(values.productTypes, labels.types));
	parts.push(...resolve(values.colors, labels.colors));
	parts.push(...resolve(values.materials, labels.materials));

	const [min, max] = values.priceRange;
	const minChanged = min !== defaultPriceRange[0];
	const maxChanged = max !== defaultPriceRange[1];
	if (minChanged && maxChanged) parts.push(`de ${min} à ${max} €`);
	else if (maxChanged) parts.push(`jusqu'à ${max} €`);
	else if (minChanged) parts.push(`à partir de ${min} €`);

	if (values.inStockOnly) parts.push("en stock");
	if (values.onSale) parts.push("en promotion");

	return parts.length > 0 ? parts.join(", ") : null;
}

/** Libellé d'un groupe de filtres dans la copie de l'état vide (avec article). */
export const FILTER_GROUP_EMPTY_STATE_LABELS: Record<FilterSectionId, string> = {
	types: "le type",
	price: "le filtre de prix",
	colors: "la couleur",
	materials: "le matériau",
	availability: "le filtre de disponibilité",
};

/**
 * Sortie de l'état vide, en une phrase — SSOT de la copie « Aucune pièce ne
 * réunit ces critères », rendue par le footer du panneau ET le pied du rail
 * (« Le comptoir », audit rail 2026-08-05) : deux copies locales auraient
 * dérivé. Chiffrée quand le serveur a trouvé une relaxation (`relaxed`),
 * générique sinon ; muette tant qu'un recomptage est en vol ou que le chiffre
 * connu répond à d'autres critères — annoncer un zéro calculé pour d'autres
 * valeurs serait une promesse fausse.
 *
 * Le paramètre est structurel (le `LiveFilterCount` de
 * `use-live-filter-count.ts` s'y conforme) : la couche services ne dépend pas
 * des hooks.
 */
export function emptyStateHint(live: {
	count: number | null;
	isUpdating: boolean;
	countUnavailable: boolean;
	relaxed: { group: FilterSectionId; count: number } | null;
}): string | null {
	if (!live.isUpdating && !live.countUnavailable && live.count === 0) {
		const exit = live.relaxed
			? `Retire ${FILTER_GROUP_EMPTY_STATE_LABELS[live.relaxed.group]} pour en voir ${live.relaxed.count}.`
			: "Retire un critère pour élargir.";
		return `Aucune pièce ne réunit ces critères. ${exit}`;
	}
	return null;
}
