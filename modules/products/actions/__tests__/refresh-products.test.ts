import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSuccess,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_REFRESH_LIMIT: "admin-product-refresh",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));
// ⚠️ Ces mocks de SSOT de tags doivent rester COMPLETS pour les clés que l'action lit.
// Un mock partiel rend le tag `undefined`, `updateTag(undefined)` jette, et l'action
// repart en `handleActionError` — le test échoue alors sur un symptôme (« 0 tag appelé »,
// « status error ») qui ne dit rien du vrai problème. C'est ce qui est arrivé en ajoutant
// les 5 tags globaux manquants. Toute clé ajoutée dans l'action doit l'être ici aussi.
vi.mock("../../constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: {
		LIST: "products-list",
		COUNTS: "product-counts",
		MAX_PRICE: "max-product-price",
		SKUS_LIST: "skus-list",
		RELATED_PUBLIC: "related-products-public",
	},
	RECENT_PRODUCTS_CACHE_TAGS: {
		LIST: "recent-products-list",
	},
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
		ADMIN_INVENTORY_LIST: "admin-inventory-list",
		SITEMAP_IMAGES: "sitemap-images",
		PRODUCT_TYPES_LIST: "product-types-list",
	},
}));

import { refreshProducts } from "../refresh-products";

// ============================================================================
// HELPERS
// ============================================================================

const emptyFormData = createMockFormData({});

// ============================================================================
// TESTS
// ============================================================================

describe("refreshProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@synclune.fr" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });
		const result = await refreshProducts(undefined, emptyFormData);
		expect(result).toEqual(authError);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await refreshProducts(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should invalidate all product cache tags", async () => {
		await refreshProducts(undefined, emptyFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("products-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("product-counts");
		expect(mockUpdateTag).toHaveBeenCalledWith("max-product-price");
		expect(mockUpdateTag).toHaveBeenCalledWith("skus-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		// Les 5 tags globaux qui manquaient : le bouton annonçait « Produits rafraîchis »
		// en laissant l'inventaire admin, le sitemap images, les produits similaires, les
		// « Vus récemment » et la liste des types de bijoux périmés.
		expect(mockUpdateTag).toHaveBeenCalledWith("related-products-public");
		expect(mockUpdateTag).toHaveBeenCalledWith("recent-products-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("product-types-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-inventory-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("sitemap-images");
	});

	it("should invalidate exactly 10 cache tags", async () => {
		await refreshProducts(undefined, emptyFormData);
		expect(mockUpdateTag).toHaveBeenCalledTimes(10);
	});

	// Les tags PAR-SLUG (`product-<slug>`, `related-products-contextual-<slug>`) sont hors
	// de portée d'un rafraîchissement global, qui n'a pas de slug. Assertion explicite
	// pour que ce ne soit pas relu comme un oubli.
	it("n'émet aucun tag par-slug (impossible sans slug sur un refresh global)", async () => {
		await refreshProducts(undefined, emptyFormData);
		const tags = mockUpdateTag.mock.calls.flat() as string[];
		expect(tags.some((t) => t.startsWith("product-") && t.endsWith("-skus"))).toBe(false);
		expect(tags.some((t) => t.startsWith("related-products-contextual-"))).toBe(false);
	});

	it("should invalidate each cache tag exactly once", async () => {
		await refreshProducts(undefined, emptyFormData);
		const calls = mockUpdateTag.mock.calls.flat();
		const unique = new Set(calls);
		expect(unique.size).toBe(calls.length);
	});

	// Les deux tests « audit log » qui vivaient ici n'avaient AUCUNE assertion : ils
	// appelaient l'action et s'arrêtaient là. Ils décrivaient un journal d'audit qui
	// n'existe pas dans le code (l'étape `// 8. Audit log` est un commentaire sans
	// implémentation, comme dans create-product / delete-product / toggle-product-status).
	// Un test sans assertion est pire qu'aucun test : il gonfle le compte et laisse croire
	// à une couverture. Retirés. Si le journal d'audit est un jour implémenté, écrire de
	// vraies assertions plutôt que ressusciter ces coquilles.

	it("should return success with confirmation message", async () => {
		const result = await refreshProducts(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Produits rafraîchis");
	});

	it("should handle unexpected error via handleActionError", async () => {
		mockUpdateTag.mockImplementation(() => {
			throw new Error("cache crash");
		});
		const result = await refreshProducts(undefined, emptyFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalled();
	});
});
