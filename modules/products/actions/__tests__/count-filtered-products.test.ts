import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockEnforceRateLimit, mockCountPublicProducts } = vi.hoisted(() => ({
	mockEnforceRateLimit: vi.fn().mockResolvedValue({ success: true }),
	mockCountPublicProducts: vi.fn().mockResolvedValue(9),
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("../../data/count-products", () => ({
	countPublicProducts: mockCountPublicProducts,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), warn: vi.fn() },
}));

import { countFilteredProducts } from "../count-filtered-products";

// ============================================================================
// FIXTURES
// ============================================================================

const validInput = {
	colors: ["or"],
	materials: [],
	productTypes: [],
	priceRange: [0, 500] as [number, number],
	maxPriceInEuros: 500,
	inStockOnly: false,
	onSale: false,
};

afterEach(() => {
	vi.clearAllMocks();
	mockEnforceRateLimit.mockResolvedValue({ success: true });
	mockCountPublicProducts.mockResolvedValue(9);
});

// ============================================================================
// TESTS
// ============================================================================

describe("countFilteredProducts", () => {
	it("rejette un input malformé AVANT tout travail (kind: error)", async () => {
		const result = await countFilteredProducts({ colors: "pas-un-tableau" });
		expect(result).toEqual({ kind: "error" });
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
		expect(mockCountPublicProducts).not.toHaveBeenCalled();
	});

	it("rejette un input non-objet", async () => {
		expect(await countFilteredProducts("x")).toEqual({ kind: "error" });
		expect(await countFilteredProducts(null)).toEqual({ kind: "error" });
	});

	it("renvoie kind: rate-limited quand le quota est atteint, sans compter", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: "error" } });
		const result = await countFilteredProducts(validInput);
		expect(result).toEqual({ kind: "rate-limited" });
		expect(mockCountPublicProducts).not.toHaveBeenCalled();
	});

	it("renvoie le count pour un input valide (1 seule requête)", async () => {
		const result = await countFilteredProducts(validInput);
		expect(result).toEqual({ kind: "success", count: 9 });
		expect(mockCountPublicProducts).toHaveBeenCalledTimes(1);
	});

	it("convertit les valeurs de formulaire en ProductFilters (euros → centimes)", async () => {
		await countFilteredProducts({
			...validInput,
			colors: ["rose", "or"],
			priceRange: [10, 60],
			inStockOnly: true,
		});
		expect(mockCountPublicProducts).toHaveBeenCalledWith({
			filters: {
				color: ["or", "rose"],
				priceMin: 1000,
				priceMax: 6000,
				stockStatus: "in_stock",
			},
			search: undefined,
		});
	});

	it("transmet le terme de recherche actif au count", async () => {
		await countFilteredProducts({ ...validInput, search: "papilloux" });
		expect(mockCountPublicProducts).toHaveBeenCalledWith(
			expect.objectContaining({ search: "papilloux" }),
		);
	});

	it("à 0 résultat avec lastChangedGroup, recompte UNE fois sans ce groupe", async () => {
		mockCountPublicProducts.mockResolvedValueOnce(0).mockResolvedValueOnce(24);
		const result = await countFilteredProducts({
			...validInput,
			lastChangedGroup: "colors",
		});
		expect(result).toEqual({
			kind: "success",
			count: 0,
			relaxed: { group: "colors", count: 24 },
		});
		expect(mockCountPublicProducts).toHaveBeenCalledTimes(2);
		// Le second count ne porte plus le groupe relaxé.
		expect(mockCountPublicProducts).toHaveBeenLastCalledWith(
			expect.objectContaining({
				filters: expect.not.objectContaining({ color: expect.anything() }),
			}),
		);
	});

	it("à 0 résultat sans lastChangedGroup, ne recompte PAS", async () => {
		mockCountPublicProducts.mockResolvedValue(0);
		const result = await countFilteredProducts(validInput);
		expect(result).toEqual({ kind: "success", count: 0 });
		expect(mockCountPublicProducts).toHaveBeenCalledTimes(1);
	});

	it("à 0 résultat même relaxé, omet relaxed (copie sans chiffre côté client)", async () => {
		mockCountPublicProducts.mockResolvedValue(0);
		const result = await countFilteredProducts({ ...validInput, lastChangedGroup: "colors" });
		expect(result).toEqual({ kind: "success", count: 0 });
	});

	it("renvoie kind: error si le count jette (jamais de throw vers le client)", async () => {
		mockCountPublicProducts.mockRejectedValue(new Error("db down"));
		expect(await countFilteredProducts(validInput)).toEqual({ kind: "error" });
	});
});
