import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_CUID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetProducts, mockEnforceRateLimit, mockLoggerError } = vi.hoisted(() => ({
	mockGetProducts: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockLoggerError: vi.fn(),
}));

vi.mock("../../data/get-products", () => ({ getProducts: mockGetProducts }));
vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ PRODUCT_LOAD_MORE_LIMIT: "product-load-more" }));
vi.mock("@/shared/lib/logger", () => ({
	logger: { error: mockLoggerError, warn: vi.fn(), info: vi.fn() },
}));

import { loadMoreProducts } from "../load-more-products";
import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	GET_PRODUCTS_DEFAULT_SORT_BY,
} from "../../constants/product.constants";

const EMPTY_RESULT = { products: [], nextCursor: null, hasMore: false };

beforeEach(() => {
	vi.clearAllMocks();
	mockEnforceRateLimit.mockResolvedValue({ success: true });
	mockGetProducts.mockResolvedValue({
		products: [{ id: "p1" }],
		pagination: { nextCursor: "cursor-next", hasNextPage: true },
	});
});

describe("loadMoreProducts — validation", () => {
	it("rejette un curseur qui n'est pas un cuid2", async () => {
		const result = await loadMoreProducts({ cursor: "not-a-cuid" });

		expect(result).toEqual({ ...EMPTY_RESULT, error: "Paramètres invalides" });
		expect(mockGetProducts).not.toHaveBeenCalled();
		// Rejeter AVANT le rate limit : une entrée malformée ne doit pas consommer
		// le quota du visiteur.
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
	});

	it("rejette une recherche au-delà de 200 caractères", async () => {
		const result = await loadMoreProducts({ cursor: VALID_CUID, search: "a".repeat(201) });

		expect(result.error).toBe("Paramètres invalides");
		expect(mockGetProducts).not.toHaveBeenCalled();
	});

	it("accepte une recherche de 200 caractères exactement", async () => {
		const result = await loadMoreProducts({ cursor: VALID_CUID, search: "a".repeat(200) });

		expect(result.error).toBeUndefined();
		expect(mockGetProducts).toHaveBeenCalled();
	});
});

describe("loadMoreProducts — rate limiting", () => {
	it("renvoie un message dédié quand le quota est dépassé", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: "error", message: "429" } });

		const result = await loadMoreProducts({ cursor: VALID_CUID });

		expect(result).toEqual({ ...EMPTY_RESULT, error: "Trop de requêtes. Patiente un instant." });
		expect(mockGetProducts).not.toHaveBeenCalled();
	});
});

describe("loadMoreProducts — délégation", () => {
	it("pagine vers l'avant depuis le curseur fourni", async () => {
		await loadMoreProducts({ cursor: VALID_CUID });

		expect(mockGetProducts).toHaveBeenCalledWith({
			cursor: VALID_CUID,
			perPage: GET_PRODUCTS_DEFAULT_PER_PAGE,
			direction: "forward",
			sortBy: GET_PRODUCTS_DEFAULT_SORT_BY,
			search: undefined,
			filters: {},
		});
	});

	it("propage tri, recherche et filtres", async () => {
		// La page suivante doit respecter les mêmes contraintes que la page initiale
		// rendue côté serveur, sinon la liste devient incohérente au scroll.
		await loadMoreProducts({
			cursor: VALID_CUID,
			sortBy: "price-ascending",
			search: "collier",
			filters: { status: ["PUBLIC"] },
		});

		expect(mockGetProducts).toHaveBeenCalledWith(
			expect.objectContaining({
				sortBy: "price-ascending",
				search: "collier",
				filters: { status: ["PUBLIC"] },
			}),
		);
	});

	it("renvoie produits, curseur suivant et hasMore", async () => {
		const result = await loadMoreProducts({ cursor: VALID_CUID });

		expect(result).toEqual({
			products: [{ id: "p1" }],
			nextCursor: "cursor-next",
			hasMore: true,
		});
	});

	it("reflète la fin de liste", async () => {
		mockGetProducts.mockResolvedValue({
			products: [],
			pagination: { nextCursor: null, hasNextPage: false },
		});

		const result = await loadMoreProducts({ cursor: VALID_CUID });

		expect(result).toEqual(EMPTY_RESULT);
		expect(result.error).toBeUndefined();
	});
});

describe("loadMoreProducts — erreurs", () => {
	it("journalise et renvoie un message générique en cas d'échec DB", async () => {
		mockGetProducts.mockRejectedValue(new Error("DB down"));

		const result = await loadMoreProducts({ cursor: VALID_CUID });

		expect(result).toEqual({
			...EMPTY_RESULT,
			error: "Impossible de charger plus de produits",
		});
		expect(mockLoggerError).toHaveBeenCalledWith(
			"Failed to load more products",
			expect.any(Error),
			expect.objectContaining({ action: "loadMoreProducts" }),
		);
	});
});
