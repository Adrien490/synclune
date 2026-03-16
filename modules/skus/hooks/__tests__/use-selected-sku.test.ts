import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockSearchParams, mockFindSkuByVariants, mockFilterCompatibleSkus } = vi.hoisted(() => ({
	mockSearchParams: new Map<string, string>(),
	mockFindSkuByVariants: vi.fn(),
	mockFilterCompatibleSkus: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useSearchParams: () => ({
		get: (key: string) => mockSearchParams.get(key) ?? null,
	}),
}));

vi.mock("@/modules/skus/services/sku-variant-finder.service", () => ({
	findSkuByVariants: mockFindSkuByVariants,
}));

vi.mock("@/modules/skus/services/sku-filter.service", () => ({
	filterCompatibleSkus: mockFilterCompatibleSkus,
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useSelectedSku } from "../use-selected-sku";
import type { GetProductReturn, ProductSku } from "@/modules/products/types/product.types";

// ============================================================================
// Helpers / Fixtures
// ============================================================================

/**
 * Builds a minimal ProductSku fixture.
 */
function makeSku(overrides: Partial<ProductSku> = {}): ProductSku {
	return {
		id: "sku-1",
		isActive: true,
		inventory: 10,
		priceInclTax: 5000,
		compareAtPrice: null,
		isDefault: false,
		color: null,
		material: null,
		size: null,
		...overrides,
	} as unknown as ProductSku;
}

/**
 * Builds a minimal GetProductReturn fixture.
 */
function makeProduct(skus: ProductSku[] = []): GetProductReturn {
	return {
		id: "prod-1",
		title: "Test Product",
		slug: "test-product",
		skus,
	} as unknown as GetProductReturn;
}

const SKU_AVAILABLE = makeSku({ id: "sku-available", isActive: true, inventory: 5 });
const SKU_OUT_OF_STOCK = makeSku({ id: "sku-out", isActive: true, inventory: 0 });
const SKU_INACTIVE = makeSku({ id: "sku-inactive", isActive: false, inventory: 10 });
const SKU_DEFAULT = makeSku({ id: "sku-default", isActive: true, inventory: 3, isDefault: true });

// ============================================================================
// Tests
// ============================================================================

describe("useSelectedSku", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams.clear();
		mockFindSkuByVariants.mockReturnValue(null);
		mockFilterCompatibleSkus.mockReturnValue([]);
	});

	// --------------------------------------------------------------------------
	// Return shape
	// --------------------------------------------------------------------------

	describe("return shape", () => {
		it("returns an object with selectedSku", () => {
			const product = makeProduct([SKU_AVAILABLE]);
			const { result } = renderHook(() => useSelectedSku({ product }));
			expect(result.current).toHaveProperty("selectedSku");
		});
	});

	// --------------------------------------------------------------------------
	// No URL params — default SKU selection
	// --------------------------------------------------------------------------

	describe("no URL params", () => {
		it("returns the defaultSku when it is available and no URL params are set", () => {
			const product = makeProduct([SKU_AVAILABLE, SKU_DEFAULT]);
			const { result } = renderHook(() => useSelectedSku({ product, defaultSku: SKU_DEFAULT }));
			expect(result.current.selectedSku?.id).toBe("sku-default");
		});

		it("returns the first available sku when defaultSku is not available (out of stock)", () => {
			const outOfStockDefault = makeSku({ id: "sku-def", isActive: true, inventory: 0 });
			const product = makeProduct([outOfStockDefault, SKU_AVAILABLE]);
			const { result } = renderHook(() =>
				useSelectedSku({ product, defaultSku: outOfStockDefault }),
			);
			// defaultSku has inventory 0, so it is not available; first available is SKU_AVAILABLE
			expect(result.current.selectedSku?.id).toBe("sku-available");
		});

		it("returns the first available sku when defaultSku is inactive", () => {
			const product = makeProduct([SKU_INACTIVE, SKU_AVAILABLE]);
			const { result } = renderHook(() => useSelectedSku({ product, defaultSku: SKU_INACTIVE }));
			expect(result.current.selectedSku?.id).toBe("sku-available");
		});

		it("falls back to defaultSku when no sku is available", () => {
			const product = makeProduct([SKU_OUT_OF_STOCK, SKU_INACTIVE]);
			const { result } = renderHook(() =>
				useSelectedSku({ product, defaultSku: SKU_OUT_OF_STOCK }),
			);
			expect(result.current.selectedSku?.id).toBe("sku-out");
		});

		it("falls back to first sku in product when no defaultSku and no available sku", () => {
			const product = makeProduct([SKU_OUT_OF_STOCK, SKU_INACTIVE]);
			const { result } = renderHook(() => useSelectedSku({ product }));
			expect(result.current.selectedSku?.id).toBe("sku-out");
		});

		it("returns null when product has no skus and no defaultSku", () => {
			const product = makeProduct([]);
			const { result } = renderHook(() => useSelectedSku({ product }));
			expect(result.current.selectedSku).toBeNull();
		});
	});

	// --------------------------------------------------------------------------
	// URL params — exact SKU match via findSkuByVariants
	// --------------------------------------------------------------------------

	describe("URL params — exact match", () => {
		it("returns the exact sku when findSkuByVariants resolves a match", () => {
			mockSearchParams.set("color", "or-rose");
			const exactSku = makeSku({ id: "sku-exact" });
			mockFindSkuByVariants.mockReturnValue(exactSku);

			const product = makeProduct([SKU_AVAILABLE, exactSku]);
			const { result } = renderHook(() => useSelectedSku({ product }));

			expect(result.current.selectedSku?.id).toBe("sku-exact");
		});

		it("calls findSkuByVariants with the correct urlVariants from search params", () => {
			mockSearchParams.set("color", "argent");
			mockSearchParams.set("material", "argent-925");
			mockSearchParams.set("size", "52");

			const exactSku = makeSku({ id: "sku-exact" });
			mockFindSkuByVariants.mockReturnValue(exactSku);

			const product = makeProduct([exactSku]);
			renderHook(() => useSelectedSku({ product }));

			expect(mockFindSkuByVariants).toHaveBeenCalledWith(product, {
				colorSlug: "argent",
				materialSlug: "argent-925",
				size: "52",
			});
		});

		it("passes undefined for URL params that are not set", () => {
			mockSearchParams.set("color", "or-rose");
			// material and size are not set

			mockFindSkuByVariants.mockReturnValue(makeSku({ id: "sku-exact" }));
			const product = makeProduct([SKU_AVAILABLE]);
			renderHook(() => useSelectedSku({ product }));

			expect(mockFindSkuByVariants).toHaveBeenCalledWith(product, {
				colorSlug: "or-rose",
				materialSlug: undefined,
				size: undefined,
			});
		});
	});

	// --------------------------------------------------------------------------
	// URL params — no exact match, compatible SKU fallback
	// --------------------------------------------------------------------------

	describe("URL params — compatible SKU fallback", () => {
		beforeEach(() => {
			mockSearchParams.set("color", "or-rose");
			mockFindSkuByVariants.mockReturnValue(null); // no exact match
		});

		it("returns first available compatible sku when no exact match", () => {
			const compatible = makeSku({ id: "sku-compatible", isActive: true, inventory: 2 });
			mockFilterCompatibleSkus.mockReturnValue([compatible]);

			const product = makeProduct([compatible]);
			const { result } = renderHook(() => useSelectedSku({ product }));

			expect(result.current.selectedSku?.id).toBe("sku-compatible");
		});

		it("returns first compatible sku even if out of stock (to show OOS state)", () => {
			const outOfStockCompat = makeSku({ id: "sku-oos-compat", isActive: true, inventory: 0 });
			mockFilterCompatibleSkus.mockReturnValue([outOfStockCompat]);

			const product = makeProduct([outOfStockCompat]);
			const { result } = renderHook(() => useSelectedSku({ product }));

			// filterCompatibleSkus requires active + in-stock, so this scenario means the hook
			// would fall through to defaultSku/first sku. Since filterCompatibleSkus returns
			// the oos sku here (mocked), the hook picks the first available from that list.
			// But isSkuAvailable checks inventory > 0, so findFirstAvailableSku returns null,
			// then it falls to compatibleSkus[0].
			expect(result.current.selectedSku?.id).toBe("sku-oos-compat");
		});

		it("prefers an available compatible sku over an unavailable one", () => {
			const unavailableCompat = makeSku({ id: "sku-unavail", isActive: true, inventory: 0 });
			const availableCompat = makeSku({ id: "sku-avail", isActive: true, inventory: 5 });
			mockFilterCompatibleSkus.mockReturnValue([unavailableCompat, availableCompat]);

			const product = makeProduct([unavailableCompat, availableCompat]);
			const { result } = renderHook(() => useSelectedSku({ product }));

			expect(result.current.selectedSku?.id).toBe("sku-avail");
		});

		it("calls filterCompatibleSkus when no exact match is found", () => {
			mockFilterCompatibleSkus.mockReturnValue([]);
			const product = makeProduct([SKU_AVAILABLE]);
			renderHook(() => useSelectedSku({ product }));

			expect(mockFilterCompatibleSkus).toHaveBeenCalledWith(product, {
				colorSlug: "or-rose",
				materialSlug: undefined,
				size: undefined,
			});
		});

		it("falls back to defaultSku when no compatible skus found", () => {
			mockFilterCompatibleSkus.mockReturnValue([]);
			const product = makeProduct([SKU_OUT_OF_STOCK]);
			const { result } = renderHook(() => useSelectedSku({ product, defaultSku: SKU_DEFAULT }));
			expect(result.current.selectedSku?.id).toBe("sku-default");
		});

		it("falls back to first product sku when no compatible skus and no defaultSku", () => {
			mockFilterCompatibleSkus.mockReturnValue([]);
			const product = makeProduct([SKU_OUT_OF_STOCK, SKU_INACTIVE]);
			const { result } = renderHook(() => useSelectedSku({ product }));
			expect(result.current.selectedSku?.id).toBe("sku-out");
		});

		it("returns null when no compatible skus and product has no skus", () => {
			mockFilterCompatibleSkus.mockReturnValue([]);
			const product = makeProduct([]);
			const { result } = renderHook(() => useSelectedSku({ product }));
			expect(result.current.selectedSku).toBeNull();
		});
	});

	// --------------------------------------------------------------------------
	// Reactivity to URL param changes
	// --------------------------------------------------------------------------

	describe("reactivity to URL params", () => {
		it("does not call findSkuByVariants when no URL params are present", () => {
			// No params set
			const product = makeProduct([SKU_AVAILABLE]);
			renderHook(() => useSelectedSku({ product }));

			expect(mockFindSkuByVariants).not.toHaveBeenCalled();
			expect(mockFilterCompatibleSkus).not.toHaveBeenCalled();
		});

		it("uses findSkuByVariants when at least one URL param is set", () => {
			mockSearchParams.set("size", "52");
			mockFindSkuByVariants.mockReturnValue(SKU_AVAILABLE);

			const product = makeProduct([SKU_AVAILABLE]);
			renderHook(() => useSelectedSku({ product }));

			expect(mockFindSkuByVariants).toHaveBeenCalled();
		});

		it("handles only material param in URL", () => {
			mockSearchParams.set("material", "argent-925");
			mockFindSkuByVariants.mockReturnValue(null);
			mockFilterCompatibleSkus.mockReturnValue([SKU_AVAILABLE]);

			const product = makeProduct([SKU_AVAILABLE]);
			const { result } = renderHook(() => useSelectedSku({ product }));

			expect(mockFindSkuByVariants).toHaveBeenCalledWith(product, {
				colorSlug: undefined,
				materialSlug: "argent-925",
				size: undefined,
			});
			expect(result.current.selectedSku?.id).toBe("sku-available");
		});
	});

	// --------------------------------------------------------------------------
	// isSkuAvailable logic
	// --------------------------------------------------------------------------

	describe("isSkuAvailable logic", () => {
		it("treats a sku with inventory=0 as unavailable even if isActive=true", () => {
			const skuZeroStock = makeSku({ id: "sku-zero", isActive: true, inventory: 0 });
			const product = makeProduct([skuZeroStock, SKU_AVAILABLE]);
			const { result } = renderHook(() => useSelectedSku({ product, defaultSku: skuZeroStock }));
			// defaultSku is not available → falls through to first available
			expect(result.current.selectedSku?.id).toBe("sku-available");
		});

		it("treats an inactive sku as unavailable even if inventory > 0", () => {
			const skuInactive = makeSku({ id: "sku-inactive2", isActive: false, inventory: 10 });
			const product = makeProduct([skuInactive, SKU_AVAILABLE]);
			const { result } = renderHook(() => useSelectedSku({ product, defaultSku: skuInactive }));
			expect(result.current.selectedSku?.id).toBe("sku-available");
		});

		it("treats a sku as available when isActive=true and inventory > 0", () => {
			const product = makeProduct([SKU_AVAILABLE]);
			const { result } = renderHook(() => useSelectedSku({ product, defaultSku: SKU_AVAILABLE }));
			expect(result.current.selectedSku?.id).toBe("sku-available");
		});
	});
});
