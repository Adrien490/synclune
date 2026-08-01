/**
 * @regression quick-search-error-not-cached
 *
 * Une panne DB transitoire pendant la recherche rapide était MISE EN CACHE
 * (audit recherche 2026-08-01, P1-3) : le try/catch de `quickSearchProducts`
 * vivait DANS son scope `"use cache"`, donc Next figeait `{kind:"error"}` dans
 * l'entrée du terme pour toute la fenêtre du profil `catalog` (5 min
 * revalidate / 15 min stale) — tout visiteur cherchant le même terme voyait
 * l'état d'erreur après le rétablissement. Idem `fuzzySearchProductIds`, qui
 * retournait `{ids: []}` sur erreur : un zéro-résultat de panne caché en
 * « succès ». Même motif que le repli page-vide de `get-products.ts` /
 * `skus/data/fetch-skus.ts`.
 *
 * Le correctif : les fonctions cachées JETTENT (une erreur jetée n'est jamais
 * mise en cache), les wrappers HORS cache attrapent :
 * - `quickSearchProducts` (wrapper) → `{kind:"error"}` non caché ;
 * - `buildSearchConditions` → dégrade vers la recherche exacte COMPLÈTE
 *   (titre/description/champs liés), même repli que le chemin rate-limited.
 *
 * Ces cas se testent donc ICI, sur les wrappers. Le rethrow de
 * `fuzzySearchProductIds` est verrouillé par `fuzzy-search.test.ts`, et le
 * repli `null` hors cache de la suggestion par `spell-suggestion.test.ts`.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockFuzzySearchProductIds, mockGetSpellSuggestion, mockPrismaFindMany, mockPrismaCount } =
	vi.hoisted(() => ({
		mockFuzzySearchProductIds: vi.fn(),
		mockGetSpellSuggestion: vi.fn(),
		mockPrismaFindMany: vi.fn(),
		mockPrismaCount: vi.fn(),
	}));

vi.mock("../fuzzy-search", () => ({
	fuzzySearchProductIds: mockFuzzySearchProductIds,
}));

vi.mock("../spell-suggestion", () => ({
	getSpellSuggestion: mockGetSpellSuggestion,
	SUGGESTION_THRESHOLD_RESULTS: 3,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		product: { findMany: mockPrismaFindMany, count: mockPrismaCount },
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { quickSearchProducts } from "../quick-search-products";
import { buildSearchConditions } from "../../services/product-query-builder";

beforeEach(() => {
	vi.clearAllMocks();
	mockGetSpellSuggestion.mockResolvedValue(null);
	mockPrismaFindMany.mockResolvedValue([]);
	mockPrismaCount.mockResolvedValue(0);
});

describe("quickSearchProducts — repli erreur HORS du scope de cache", () => {
	it("retourne {kind:'error'} quand le cœur caché jette (fuzzy en panne)", async () => {
		mockFuzzySearchProductIds.mockRejectedValue(new Error("DB down"));

		const result = await quickSearchProducts("bague");

		expect(result).toEqual({ kind: "error" });
	});

	it("retourne {kind:'error'} quand le fetch produits jette", async () => {
		mockFuzzySearchProductIds.mockResolvedValue({ ids: ["p1"], totalCount: 1 });
		mockPrismaFindMany.mockRejectedValue(new Error("DB down"));

		const result = await quickSearchProducts("bague");

		expect(result).toEqual({ kind: "error" });
	});

	it("la suggestion est demandée HORS du cœur caché : un échec du cœur ne l'appelle pas", async () => {
		mockFuzzySearchProductIds.mockRejectedValue(new Error("DB down"));

		await quickSearchProducts("bague");

		expect(mockGetSpellSuggestion).not.toHaveBeenCalled();
	});
});

describe("buildSearchConditions — dégradation exacte complète quand le fuzzy jette", () => {
	it("retombe sur la recherche exacte COMPLÈTE (titre + description + champs liés)", async () => {
		mockFuzzySearchProductIds.mockRejectedValue(new Error("Fuzzy search timeout"));

		const result = await buildSearchConditions("bague");

		expect(result.fuzzyIds).toBeNull();
		expect(result.exactConditions.length).toBeGreaterThan(0);
		// La condition dégradée doit couvrir titre/description (recherche exacte
		// complète), pas seulement les champs liés — même repli que le chemin
		// rate-limited de get-products.
		const serialized = JSON.stringify(result.exactConditions);
		expect(serialized).toContain('"title"');
		expect(serialized).toContain('"description"');
	});
});
