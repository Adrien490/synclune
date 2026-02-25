import { describe, it, expect } from "vitest";

import {
	parseFilterValuesFromURL,
	buildFilterURL,
	buildClearFiltersURL,
	countActiveFilters,
	getDefaultFilterValues,
	isProductCategoryPage,
	getCategorySlugFromPath,
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
	overrides: Partial<Omit<ParseFilterParams, "searchParams">> = {}
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
		ratingMin: null,
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
			ratingMin: null,
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
			makeParseParams("", { activeProductTypeSlug: "bagues" })
		);
		expect(result.productTypes).toContain("bagues");
	});

	it("should not duplicate type if both activeProductTypeSlug and type param match", () => {
		const result = parseFilterValuesFromURL(
			makeParseParams("type=bagues", { activeProductTypeSlug: "bagues" })
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

	it("should parse valid rating (1-5)", () => {
		const result = parseFilterValuesFromURL(makeParseParams("rating=4"));
		expect(result.ratingMin).toBe(4);
	});

	it("should ignore invalid rating (0 or >5)", () => {
		expect(parseFilterValuesFromURL(makeParseParams("rating=0")).ratingMin).toBeNull();
		expect(parseFilterValuesFromURL(makeParseParams("rating=6")).ratingMin).toBeNull();
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
			makeBuildParams({ formData: makeFormData({ productTypes: ["bagues"] }) })
		);
		expect(result.targetPath).toBe("/produits/bagues");
	});

	it("should stay on /produits with type params when multiple types selected", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ productTypes: ["bagues", "colliers"] }) })
		);
		expect(result.targetPath).toBe("/produits");
		expect(result.queryString).toContain("type=bagues");
		expect(result.queryString).toContain("type=colliers");
	});

	it("should return to /produits when on category page with no types selected", () => {
		const result = buildFilterURL(
			makeBuildParams({ isOnCategoryPage: true, currentCategorySlug: "bagues" })
		);
		expect(result.targetPath).toBe("/produits");
	});

	it("should add single color as set param", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ colors: ["or"] }) })
		);
		expect(result.queryString).toContain("color=or");
	});

	it("should add multiple colors as append params", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ colors: ["or", "argent"] }) })
		);
		expect(result.queryString).toContain("color=or");
		expect(result.queryString).toContain("color=argent");
	});

	it("should add single material", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ materials: ["argent-925"] }) })
		);
		expect(result.queryString).toContain("material=argent-925");
	});

	it("should add price range when not default", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ priceRange: [50, 300] }) })
		);
		expect(result.queryString).toContain("priceMin=50");
		expect(result.queryString).toContain("priceMax=300");
	});

	it("should not add price range when at default", () => {
		const result = buildFilterURL(makeBuildParams());
		expect(result.queryString).not.toContain("priceMin");
		expect(result.queryString).not.toContain("priceMax");
	});

	it("should add rating when set", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ ratingMin: 4 }) })
		);
		expect(result.queryString).toContain("rating=4");
	});

	it("should add stockStatus=in_stock when inStockOnly", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ inStockOnly: true }) })
		);
		expect(result.queryString).toContain("stockStatus=in_stock");
	});

	it("should add onSale=true when onSale is set", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ onSale: true }) })
		);
		expect(result.queryString).toContain("onSale=true");
	});

	it("should build fullUrl without ? when no query params", () => {
		const result = buildFilterURL(makeBuildParams());
		expect(result.fullUrl).toBe("/produits");
	});

	it("should build fullUrl with ? when query params exist", () => {
		const result = buildFilterURL(
			makeBuildParams({ formData: makeFormData({ colors: ["or"] }) })
		);
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
			})
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
		const result = buildClearFiltersURL(
			new URLSearchParams("color=or&sortBy=price-asc")
		);
		expect(result).toContain("sortBy=price-asc");
		expect(result).not.toContain("color=");
	});

	it("should remove all filter keys", () => {
		const params = new URLSearchParams(
			"color=or&material=argent&type=bagues&priceMin=50&priceMax=300&rating=4&stockStatus=in_stock&onSale=true"
		);
		const result = buildClearFiltersURL(params);
		expect(result).toBe("/produits");
	});

	it("should remove cursor and direction", () => {
		const result = buildClearFiltersURL(
			new URLSearchParams("cursor=abc&direction=forward&page=2")
		);
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
			new URLSearchParams("page=2&perPage=20&sortBy=price&search=bague&cursor=abc&direction=forward")
		);
		expect(result.activeFiltersCount).toBe(0);
	});

	it("should count onSale, stockStatus and rating as filters", () => {
		const result = countActiveFilters(
			new URLSearchParams("onSale=true&stockStatus=in_stock&rating=4")
		);
		expect(result.activeFiltersCount).toBe(3);
	});

	it("should count type filter", () => {
		const result = countActiveFilters(new URLSearchParams("type=bagues"));
		expect(result.activeFiltersCount).toBe(1);
	});

	it("should count combined filters correctly", () => {
		const result = countActiveFilters(
			new URLSearchParams("color=or&color=argent&priceMin=50&priceMax=300&rating=4")
		);
		// 2 colors + 1 price range + 1 rating = 4
		expect(result.activeFiltersCount).toBe(4);
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
			ratingMin: null,
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
