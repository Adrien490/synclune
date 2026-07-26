/**
 * @regression catalog-pagination-fail-safe
 *
 * F6 (audit validation Zod 2026-07-06) — une URL forgée sur /produits
 * (`?direction=foo`, `?cursor=abc`, `?perPage=99999`) passait brute jusqu'à
 * `getProductsSchema.safeParse` dans `getProducts`, qui throw
 * "Invalid parameters" → error boundary/500 forgeable en prod.
 *
 * Verrouille le parse FAIL-SAFE de `parsePaginationParams` : toute valeur
 * invalide retombe sur les defaults (le throw de get-products.ts reste la
 * garde des appels programmatiques).
 */
import { describe, it, expect, vi } from "vitest";

// catalog.ts importe la couche data ("use cache") — mockée, seul le parsing pur est testé
vi.mock("@/modules/product-types/data/get-product-types", () => ({ getProductTypes: vi.fn() }));
vi.mock("@/modules/colors/data/get-colors", () => ({ getColors: vi.fn() }));
vi.mock("@/modules/materials/data/get-material-options", () => ({
	getMaterialOptions: vi.fn(),
}));
vi.mock("@/modules/products/data/get-max-product-price", () => ({ getMaxProductPrice: vi.fn() }));
vi.mock("@/modules/products/data/get-products", () => ({ getProducts: vi.fn() }));
vi.mock("../params", () => ({ parseFilters: vi.fn(() => ({})) }));

import { parsePaginationParams } from "../catalog";
import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
} from "@/modules/products/constants/product.constants";

// CUID v1 : 25 chars (CUID_LENGTH de pagination-schema)
const VALID_CURSOR = "cm3x7k2ab0001qz8v4h2j9d3e";

// Le type ProductSearchParams restreint `direction`, mais une URL réelle porte
// n'importe quelle string — `forge` simule les searchParams bruts du réseau.
function forge(params: Record<string, string>) {
	return params as Parameters<typeof parsePaginationParams>[0];
}

describe("parsePaginationParams — fail-safe (regression)", () => {
	it("direction forgée → fallback 'forward' (plus de 500)", () => {
		expect(parsePaginationParams(forge({ direction: "foo" })).direction).toBe("forward");
		expect(parsePaginationParams(forge({ direction: "" })).direction).toBe("forward");
	});

	it("direction valide préservée", () => {
		expect(parsePaginationParams({ direction: "backward" }).direction).toBe("backward");
		expect(parsePaginationParams({}).direction).toBe("forward");
	});

	it("cursor de longueur invalide → undefined (plus de 500)", () => {
		expect(parsePaginationParams({ cursor: "abc" }).cursor).toBeUndefined();
		expect(parsePaginationParams({ cursor: "a".repeat(300) }).cursor).toBeUndefined();
	});

	it("cursor 25 chars valide préservé", () => {
		expect(parsePaginationParams({ cursor: VALID_CURSOR }).cursor).toBe(VALID_CURSOR);
	});

	it("perPage forgé → clamp/défaut (99999 → max, 0/-1 → 1, 'abc' → défaut)", () => {
		expect(parsePaginationParams({ perPage: "99999" }).perPage).toBe(
			GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
		);
		expect(parsePaginationParams({ perPage: "0" }).perPage).toBe(1);
		expect(parsePaginationParams({ perPage: "-1" }).perPage).toBe(1);
		expect(parsePaginationParams({ perPage: "abc" }).perPage).toBe(GET_PRODUCTS_DEFAULT_PER_PAGE);
		expect(parsePaginationParams({ perPage: "2.5" }).perPage).toBe(GET_PRODUCTS_DEFAULT_PER_PAGE);
	});

	it("params valides passent intacts", () => {
		const result = parsePaginationParams({
			cursor: VALID_CURSOR,
			direction: "backward",
			perPage: "40",
			sortBy: "price-ascending",
			search: "collier",
		});
		expect(result).toEqual({
			cursor: VALID_CURSOR,
			direction: "backward",
			perPage: 40,
			sortBy: "price-ascending",
			searchTerm: "collier",
		});
	});

	it("search borné à 200 chars", () => {
		const result = parsePaginationParams({ search: "x".repeat(500) });
		expect(result.searchTerm).toHaveLength(200);
	});
});
