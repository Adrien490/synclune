import { describe, it, expect } from "vitest";

import {
	parseFilterValuesFromURL,
	buildFilterURL,
	buildClearFiltersURL,
	countActiveFilters,
	getDefaultFilterValues,
	isProductCategoryPage,
	getCategorySlugFromPath,
	getSectionActiveCount,
	filterFormDataToProductFilters,
	productFiltersToFilterFormData,
	formatActiveFilterSummary,
	resetFilterGroup,
	type FilterFormData,
	type ParseFilterParams,
	type BuildFilterURLParams,
} from "../product-filter-params.service";

// ============================================================================
// HELPERS
// ============================================================================

const DEFAULT_PRICE_RANGE: [number, number] = [0, 500];

function makeParseParams(
	search: string,
	overrides: Partial<Omit<ParseFilterParams, "searchParams">> = {},
): ParseFilterParams {
	return {
		searchParams: new URLSearchParams(search),
		defaultPriceRange: DEFAULT_PRICE_RANGE,
		...overrides,
	};
}

function makeFormData(overrides: Partial<FilterFormData> = {}): FilterFormData {
	return {
		colors: [],
		materials: [],
		productTypes: [],
		priceRange: DEFAULT_PRICE_RANGE,
		inStockOnly: false,
		onSale: false,
		...overrides,
	};
}

function makeBuildParams(overrides: Partial<BuildFilterURLParams> = {}): BuildFilterURLParams {
	return {
		formData: makeFormData(),
		currentSearchParams: new URLSearchParams(),
		defaultPriceRange: DEFAULT_PRICE_RANGE,
		isOnCategoryPage: false,
		currentCategorySlug: null,
		...overrides,
	};
}

// ============================================================================
// parseFilterValuesFromURL
// ============================================================================

describe("parseFilterValuesFromURL", () => {
	it("should return defaults when no search params are provided", () => {
		const result = parseFilterValuesFromURL(makeParseParams(""));
		expect(result).toEqual({
			colors: [],
			materials: [],
			productTypes: [],
			priceRange: DEFAULT_PRICE_RANGE,
			inStockOnly: false,
			onSale: false,
		});
	});

	it("should parse a single color", () => {
		const result = parseFilterValuesFromURL(makeParseParams("color=or"));
		expect(result.colors).toEqual(["or"]);
	});

	it("should parse multiple colors", () => {
		const result = parseFilterValuesFromURL(makeParseParams("color=or&color=argent"));
		expect(result.colors).toContain("or");
		expect(result.colors).toContain("argent");
		expect(result.colors).toHaveLength(2);
	});

	it("should deduplicate repeated colors", () => {
		const result = parseFilterValuesFromURL(makeParseParams("color=or&color=or"));
		expect(result.colors).toEqual(["or"]);
	});

	it("should parse a single material", () => {
		const result = parseFilterValuesFromURL(makeParseParams("material=argent-925"));
		expect(result.materials).toEqual(["argent-925"]);
	});

	it("should parse multiple materials", () => {
		const result = parseFilterValuesFromURL(makeParseParams("material=argent-925&material=or-14k"));
		expect(result.materials).toHaveLength(2);
	});

	it("should parse a single product type", () => {
		const result = parseFilterValuesFromURL(makeParseParams("type=bagues"));
		expect(result.productTypes).toEqual(["bagues"]);
	});

	it("should include activeProductTypeSlug when provided", () => {
		const result = parseFilterValuesFromURL(
			makeParseParams("", { activeProductTypeSlug: "bagues" }),
		);
		expect(result.productTypes).toContain("bagues");
	});

	it("should not duplicate type if both activeProductTypeSlug and type param match", () => {
		const result = parseFilterValuesFromURL(
			makeParseParams("type=bagues", { activeProductTypeSlug: "bagues" }),
		);
		expect(result.productTypes).toEqual(["bagues"]);
	});

	it("should parse priceMin", () => {
		const result = parseFilterValuesFromURL(makeParseParams("priceMin=50"));
		expect(result.priceRange[0]).toBe(50);
	});

	it("should parse priceMax", () => {
		const result = parseFilterValuesFromURL(makeParseParams("priceMax=300"));
		expect(result.priceRange[1]).toBe(300);
	});

	it("should use default priceMin when value is 0 or invalid", () => {
		const result = parseFilterValuesFromURL(makeParseParams("priceMin=0"));
		expect(result.priceRange[0]).toBe(DEFAULT_PRICE_RANGE[0]);
	});

	it("should use default priceMax when value is 0 or invalid", () => {
		const result = parseFilterValuesFromURL(makeParseParams("priceMax=invalid"));
		expect(result.priceRange[1]).toBe(DEFAULT_PRICE_RANGE[1]);
	});

	it("should parse stockStatus=in_stock as inStockOnly=true", () => {
		const result = parseFilterValuesFromURL(makeParseParams("stockStatus=in_stock"));
		expect(result.inStockOnly).toBe(true);
	});

	it("should parse stockStatus=all as inStockOnly=false", () => {
		const result = parseFilterValuesFromURL(makeParseParams("stockStatus=all"));
		expect(result.inStockOnly).toBe(false);
	});

	it("should parse onSale=true", () => {
		const result = parseFilterValuesFromURL(makeParseParams("onSale=true"));
		expect(result.onSale).toBe(true);
	});

	it("should parse onSale=1 as true", () => {
		const result = parseFilterValuesFromURL(makeParseParams("onSale=1"));
		expect(result.onSale).toBe(true);
	});

	it("should parse onSale=false as false", () => {
		const result = parseFilterValuesFromURL(makeParseParams("onSale=false"));
		expect(result.onSale).toBe(false);
	});

	it("should clamp negative priceMin to 0", () => {
		const result = parseFilterValuesFromURL(makeParseParams("priceMin=-50"));
		expect(result.priceRange[0]).toBe(0);
	});

	it("should clamp priceMax to defaultPriceRange[1] when over", () => {
		const result = parseFilterValuesFromURL(makeParseParams("priceMax=9999"));
		expect(result.priceRange[1]).toBe(DEFAULT_PRICE_RANGE[1]);
	});

	it("should clamp priceMin to priceMax when priceMin > priceMax", () => {
		const result = parseFilterValuesFromURL(makeParseParams("priceMin=400&priceMax=100"));
		// priceMax ≥ priceMin invariant enforced
		expect(result.priceRange[0]).toBeLessThanOrEqual(result.priceRange[1]);
	});

	it("should deduplicate productTypes from activeProductTypeSlug and type param", () => {
		const result = parseFilterValuesFromURL(
			makeParseParams("type=bagues&type=bagues&type=colliers", {
				activeProductTypeSlug: "bagues",
			}),
		);
		expect(result.productTypes).toEqual(["bagues", "colliers"]);
	});
});

// ============================================================================
// buildFilterURL
// ============================================================================

describe("buildFilterURL", () => {
	it("should return /produits as targetPath when no types selected", () => {
		const result = buildFilterURL(makeBuildParams());
		expect(result.targetPath).toBe("/produits");
	});

	it("should navigate to category page when exactly one type is selected", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ productTypes: ["bagues"] }) }),
		);
		expect(result.targetPath).toBe("/produits/bagues");
	});

	it("should stay on /produits with type params when multiple types selected", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ productTypes: ["bagues", "colliers"] }) }),
		);
		expect(result.targetPath).toBe("/produits");
		expect(result.queryString).toContain("type=bagues");
		expect(result.queryString).toContain("type=colliers");
	});

	it("should return to /produits when on category page with no types selected", () => {
		const result = buildFilterURL(
			makeBuildParams({ isOnCategoryPage: true, currentCategorySlug: "bagues" }),
		);
		expect(result.targetPath).toBe("/produits");
	});

	it("should add single color as set param", () => {
		const result = buildFilterURL(makeBuildParams({ formData: makeFormData({ colors: ["or"] }) }));
		expect(result.queryString).toContain("color=or");
	});

	it("should add multiple colors as append params", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ colors: ["or", "argent"] }) }),
		);
		expect(result.queryString).toContain("color=or");
		expect(result.queryString).toContain("color=argent");
	});

	it("should add single material", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ materials: ["argent-925"] }) }),
		);
		expect(result.queryString).toContain("material=argent-925");
	});

	it("should add price range when not default", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ priceRange: [50, 300] }) }),
		);
		expect(result.queryString).toContain("priceMin=50");
		expect(result.queryString).toContain("priceMax=300");
	});

	it("should not add price range when at default", () => {
		const result = buildFilterURL(makeBuildParams());
		expect(result.queryString).not.toContain("priceMin");
		expect(result.queryString).not.toContain("priceMax");
	});

	it("should add stockStatus=in_stock when inStockOnly", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ inStockOnly: true }) }),
		);
		expect(result.queryString).toContain("stockStatus=in_stock");
	});

	it("should add onSale=true when onSale is set", () => {
		const result = buildFilterURL(makeBuildParams({ formData: makeFormData({ onSale: true }) }));
		expect(result.queryString).toContain("onSale=true");
	});

	it("should build fullUrl without ? when no query params", () => {
		const result = buildFilterURL(makeBuildParams());
		expect(result.fullUrl).toBe("/produits");
	});

	it("should build fullUrl with ? when query params exist", () => {
		const result = buildFilterURL(makeBuildParams({ formData: makeFormData({ colors: ["or"] }) }));
		expect(result.fullUrl).toBe("/produits?color=or");
	});

	it("should remove cursor and direction from existing params", () => {
		const currentParams = new URLSearchParams("cursor=abc&direction=forward&sortBy=price");
		const result = buildFilterURL(makeBuildParams({ currentSearchParams: currentParams }));
		expect(result.queryString).not.toContain("cursor");
		expect(result.queryString).not.toContain("direction");
		expect(result.queryString).toContain("sortBy=price");
	});

	it("should clear old filter keys from existing params", () => {
		const currentParams = new URLSearchParams("color=rouge&material=or&onSale=true");
		const result = buildFilterURL(
			makeBuildParams({
				currentSearchParams: currentParams,
				formData: makeFormData({ colors: ["argent"] }),
			}),
		);
		expect(result.queryString).not.toContain("color=rouge");
		expect(result.queryString).not.toContain("material=or");
		expect(result.queryString).not.toContain("onSale=true");
		expect(result.queryString).toContain("color=argent");
	});
});

// ============================================================================
// buildClearFiltersURL
// ============================================================================

describe("buildClearFiltersURL", () => {
	it("should return /produits when no other params", () => {
		const result = buildClearFiltersURL(new URLSearchParams("color=or&priceMin=50"));
		expect(result).toBe("/produits");
	});

	it("should preserve non-filter params like sortBy", () => {
		const result = buildClearFiltersURL(new URLSearchParams("color=or&sortBy=price-asc"));
		expect(result).toContain("sortBy=price-asc");
		expect(result).not.toContain("color=");
	});

	it("should remove all filter keys", () => {
		const params = new URLSearchParams(
			"color=or&material=argent&type=bagues&priceMin=50&priceMax=300&stockStatus=in_stock&onSale=true",
		);
		const result = buildClearFiltersURL(params);
		expect(result).toBe("/produits");
	});

	it("should remove cursor and direction", () => {
		const result = buildClearFiltersURL(new URLSearchParams("cursor=abc&direction=forward&page=2"));
		expect(result).not.toContain("cursor");
		expect(result).not.toContain("direction");
	});
});

// ============================================================================
// countActiveFilters
// ============================================================================

describe("countActiveFilters", () => {
	it("should return 0 for empty params", () => {
		const result = countActiveFilters(new URLSearchParams(""));
		expect(result.activeFiltersCount).toBe(0);
		expect(result.hasActiveFilters).toBe(false);
	});

	it("should count single color as 1", () => {
		const result = countActiveFilters(new URLSearchParams("color=or"));
		expect(result.activeFiltersCount).toBe(1);
		expect(result.hasActiveFilters).toBe(true);
	});

	it("should count each multi-value color separately", () => {
		const result = countActiveFilters(new URLSearchParams("color=or&color=argent"));
		expect(result.activeFiltersCount).toBe(2);
	});

	it("should count priceMin as 1 but not priceMax", () => {
		const result = countActiveFilters(new URLSearchParams("priceMin=50&priceMax=300"));
		expect(result.activeFiltersCount).toBe(1);
	});

	it("should ignore pagination params (page, perPage, sortBy, search, cursor, direction)", () => {
		const result = countActiveFilters(
			new URLSearchParams(
				"page=2&perPage=20&sortBy=price&search=bague&cursor=abc&direction=forward",
			),
		);
		expect(result.activeFiltersCount).toBe(0);
	});

	it("should count onSale and stockStatus as filters", () => {
		const result = countActiveFilters(new URLSearchParams("onSale=true&stockStatus=in_stock"));
		expect(result.activeFiltersCount).toBe(2);
	});

	it("should count type filter", () => {
		const result = countActiveFilters(new URLSearchParams("type=bagues"));
		expect(result.activeFiltersCount).toBe(1);
	});

	it("should count combined filters correctly", () => {
		const result = countActiveFilters(
			new URLSearchParams("color=or&color=argent&priceMin=50&priceMax=300"),
		);
		// 2 colors + 1 price range = 3
		expect(result.activeFiltersCount).toBe(3);
	});
});

// ============================================================================
// getDefaultFilterValues
// ============================================================================

describe("getDefaultFilterValues", () => {
	it("should return all defaults with given price range", () => {
		const result = getDefaultFilterValues([10, 800]);
		expect(result).toEqual({
			colors: [],
			materials: [],
			productTypes: [],
			priceRange: [10, 800],
			inStockOnly: false,
			onSale: false,
		});
	});

	it("should use the provided price range verbatim", () => {
		const result = getDefaultFilterValues([0, 1000]);
		expect(result.priceRange).toEqual([0, 1000]);
	});
});

// ============================================================================
// isProductCategoryPage
// ============================================================================

describe("isProductCategoryPage", () => {
	it("should return true for /produits/bagues", () => {
		expect(isProductCategoryPage("/produits/bagues")).toBe(true);
	});

	it("should return true for /produits/colliers", () => {
		expect(isProductCategoryPage("/produits/colliers")).toBe(true);
	});

	it("should return false for /produits", () => {
		expect(isProductCategoryPage("/produits")).toBe(false);
	});

	it("should return false for /produits/ (trailing slash matches category pattern)", () => {
		// /produits/ starts with /produits/ and is !== /produits → treated as category page
		expect(isProductCategoryPage("/produits/")).toBe(true);
	});

	it("should return false for /accueil", () => {
		expect(isProductCategoryPage("/accueil")).toBe(false);
	});

	it("should return false for /produits-soldes (not a sub-path)", () => {
		expect(isProductCategoryPage("/produits-soldes")).toBe(false);
	});
});

// ============================================================================
// getCategorySlugFromPath
// ============================================================================

describe("getCategorySlugFromPath", () => {
	it("should return the slug from /produits/bagues", () => {
		expect(getCategorySlugFromPath("/produits/bagues")).toBe("bagues");
	});

	it("should return the slug from /produits/colliers-fantaisie", () => {
		expect(getCategorySlugFromPath("/produits/colliers-fantaisie")).toBe("colliers-fantaisie");
	});

	it("should return null for /produits", () => {
		expect(getCategorySlugFromPath("/produits")).toBeNull();
	});

	it("should return null for non-product paths", () => {
		expect(getCategorySlugFromPath("/accueil")).toBeNull();
	});

	it("should return only the first path segment for nested paths", () => {
		expect(getCategorySlugFromPath("/produits/bagues/detail")).toBe("bagues");
	});
});

// ============================================================================
// SECTION ACTIVE COUNT
// ============================================================================

describe("getSectionActiveCount", () => {
	it("returns all zeros for default values", () => {
		expect(getSectionActiveCount(makeFormData(), DEFAULT_PRICE_RANGE)).toEqual({
			types: 0,
			price: 0,
			colors: 0,
			materials: 0,
			availability: 0,
		});
	});

	it("counts the number of selected tokens per section", () => {
		const counts = getSectionActiveCount(
			makeFormData({
				productTypes: ["bagues", "colliers"],
				colors: ["or"],
				materials: ["acier", "titane", "platine"],
			}),
			DEFAULT_PRICE_RANGE,
		);
		expect(counts.types).toBe(2);
		expect(counts.colors).toBe(1);
		expect(counts.materials).toBe(3);
	});

	it("counts a custom price range as 1", () => {
		expect(
			getSectionActiveCount(makeFormData({ priceRange: [50, 200] }), DEFAULT_PRICE_RANGE).price,
		).toBe(1);
	});

	it("counts each availability toggle independently", () => {
		expect(
			getSectionActiveCount(makeFormData({ inStockOnly: true, onSale: true }), DEFAULT_PRICE_RANGE)
				.availability,
		).toBe(2);
	});
});

// ============================================================================
// FORM DATA ↔ PRODUCT FILTERS (parité avec le chemin URL)
// ============================================================================

describe("filterFormDataToProductFilters", () => {
	it("n'émet aucun filtre pour un formulaire vierge", () => {
		expect(filterFormDataToProductFilters(makeFormData(), DEFAULT_PRICE_RANGE)).toEqual({});
	});

	it("convertit les prix d'euros en centimes", () => {
		const filters = filterFormDataToProductFilters(
			makeFormData({ priceRange: [10, 60] }),
			DEFAULT_PRICE_RANGE,
		);
		expect(filters.priceMin).toBe(1000);
		expect(filters.priceMax).toBe(6000);
	});

	it("omet un priceMin de 0 — comme le fait `parseFilters` côté URL", () => {
		// Les deux chemins doivent produire le MÊME where, sinon le compteur vivant
		// du panneau annonce un nombre que la grille ne rend pas.
		const filters = filterFormDataToProductFilters(
			makeFormData({ priceRange: [0, 60] }),
			DEFAULT_PRICE_RANGE,
		);
		expect(filters.priceMin).toBeUndefined();
		expect(filters.priceMax).toBe(6000);
	});

	it("trie les slugs pour maximiser les hits de cache", () => {
		const filters = filterFormDataToProductFilters(
			makeFormData({ colors: ["rose", "argent", "or"] }),
			DEFAULT_PRICE_RANGE,
		);
		expect(filters.color).toEqual(["argent", "or", "rose"]);
	});

	it("traduit la disponibilité en stockStatus / onSale", () => {
		const filters = filterFormDataToProductFilters(
			makeFormData({ inStockOnly: true, onSale: true }),
			DEFAULT_PRICE_RANGE,
		);
		expect(filters.stockStatus).toBe("in_stock");
		expect(filters.onSale).toBe(true);
	});
});

describe("productFiltersToFilterFormData", () => {
	it("est l'inverse exact de filterFormDataToProductFilters", () => {
		const original = makeFormData({
			productTypes: ["bagues"],
			colors: ["argent", "or"],
			materials: ["acier"],
			priceRange: [10, 60],
			inStockOnly: true,
			onSale: true,
		});
		const roundTrip = productFiltersToFilterFormData(
			filterFormDataToProductFilters(original, DEFAULT_PRICE_RANGE),
			DEFAULT_PRICE_RANGE,
		);
		expect(roundTrip).toEqual(original);
	});

	it("normalise une valeur scalaire en tableau", () => {
		const values = productFiltersToFilterFormData({ color: "or" }, DEFAULT_PRICE_RANGE);
		expect(values.colors).toEqual(["or"]);
	});

	it("retombe sur la plage par défaut quand aucun prix n'est filtré", () => {
		expect(productFiltersToFilterFormData({}, DEFAULT_PRICE_RANGE).priceRange).toEqual(
			DEFAULT_PRICE_RANGE,
		);
	});
});

// ============================================================================
// RÉSUMÉ DES FILTRES ACTIFS
// ============================================================================

describe("formatActiveFilterSummary", () => {
	const labels = {
		types: { bagues: "Bagues", papilloux: "Papilloux" },
		colors: { "or-jaune": "Or jaune" },
		materials: { acier: "Acier" },
	};

	it("retourne null quand rien n'est filtré", () => {
		expect(formatActiveFilterSummary(makeFormData(), labels, DEFAULT_PRICE_RANGE)).toBeNull();
	});

	it("compose types, couleurs et borne haute de prix dans l'ordre", () => {
		expect(
			formatActiveFilterSummary(
				makeFormData({ productTypes: ["papilloux"], colors: ["or-jaune"], priceRange: [0, 65] }),
				labels,
				DEFAULT_PRICE_RANGE,
			),
		).toBe("Papilloux, Or jaune, jusqu'à 65 €");
	});

	it("dit « de X à Y » quand les DEUX bornes bougent", () => {
		expect(
			formatActiveFilterSummary(
				makeFormData({ priceRange: [20, 60] }),
				labels,
				DEFAULT_PRICE_RANGE,
			),
		).toBe("de 20 à 60 €");
	});

	it("dit « à partir de X » quand seule la borne basse bouge", () => {
		expect(
			formatActiveFilterSummary(
				makeFormData({ priceRange: [20, DEFAULT_PRICE_RANGE[1]] }),
				labels,
				DEFAULT_PRICE_RANGE,
			),
		).toBe("à partir de 20 €");
	});

	it("retombe sur le slug quand le libellé est inconnu", () => {
		// Un slug d'URL peut désigner une option retirée du catalogue : mieux vaut
		// le slug brut qu'un trou dans la phrase.
		expect(
			formatActiveFilterSummary(
				makeFormData({ colors: ["teinte-disparue"] }),
				labels,
				DEFAULT_PRICE_RANGE,
			),
		).toBe("teinte-disparue");
	});

	it("nomme la disponibilité en clair", () => {
		expect(
			formatActiveFilterSummary(
				makeFormData({ inStockOnly: true, onSale: true }),
				labels,
				DEFAULT_PRICE_RANGE,
			),
		).toBe("en stock, en promotion");
	});
});

// ============================================================================
// RESET D'UN GROUPE
// ============================================================================

describe("resetFilterGroup", () => {
	const filled = makeFormData({
		productTypes: ["bagues"],
		colors: ["or"],
		materials: ["acier"],
		priceRange: [20, 60],
		inStockOnly: true,
		onSale: true,
	});

	it("ne vide QUE le groupe visé", () => {
		const next = resetFilterGroup(filled, "colors", DEFAULT_PRICE_RANGE);
		expect(next.colors).toEqual([]);
		expect(next.productTypes).toEqual(["bagues"]);
		expect(next.materials).toEqual(["acier"]);
		expect(next.priceRange).toEqual([20, 60]);
	});

	it("rétablit la plage par défaut pour le prix", () => {
		expect(resetFilterGroup(filled, "price", DEFAULT_PRICE_RANGE).priceRange).toEqual(
			DEFAULT_PRICE_RANGE,
		);
	});

	it("remet les DEUX bascules de disponibilité à faux", () => {
		const next = resetFilterGroup(filled, "availability", DEFAULT_PRICE_RANGE);
		expect(next.inStockOnly).toBe(false);
		expect(next.onSale).toBe(false);
	});

	it("ne mute pas l'objet d'entrée", () => {
		resetFilterGroup(filled, "colors", DEFAULT_PRICE_RANGE);
		expect(filled.colors).toEqual(["or"]);
	});
});
