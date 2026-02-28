import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockIsAdmin, mockRedirect, mockFetchProductSkus, mockGetProductSkusSchema } = vi.hoisted(
	() => ({
		mockIsAdmin: vi.fn(),
		mockRedirect: vi.fn(),
		mockFetchProductSkus: vi.fn(),
		mockGetProductSkusSchema: {
			safeParse: vi.fn(),
		},
	}),
);

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("next/navigation", () => ({
	redirect: mockRedirect,
}));

vi.mock("../fetch-skus", () => ({
	fetchProductSkus: mockFetchProductSkus,
}));

vi.mock("../../schemas/get-skus.schemas", () => ({
	getProductSkusSchema: mockGetProductSkusSchema,
}));

vi.mock("../../constants/sku.constants", () => ({
	GET_PRODUCT_SKUS_DEFAULT_PER_PAGE: 20,
	GET_PRODUCT_SKUS_DEFAULT_SORT_BY: "created-descending",
	GET_PRODUCT_SKUS_ADMIN_FALLBACK_SORT_BY: "created-descending",
}));

import { getInventory } from "../get-inventory";

// ============================================================================
// Helpers
// ============================================================================

const EMPTY_PAGINATION = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
};

function makeValidationResult(overrides: Record<string, unknown> = {}) {
	return {
		success: true,
		data: {
			cursor: undefined,
			direction: "forward",
			perPage: 20,
			sortBy: "created-descending",
			search: undefined,
			filters: undefined,
			...overrides,
		},
	};
}

function setupDefaults() {
	mockIsAdmin.mockResolvedValue(true);
	mockGetProductSkusSchema.safeParse.mockReturnValue(makeValidationResult());
	mockFetchProductSkus.mockResolvedValue({
		productSkus: [],
		pagination: EMPTY_PAGINATION,
	});
}

// ============================================================================
// Tests: auth guard
// ============================================================================

describe("getInventory – auth guard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("calls redirect to /connexion when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		// redirect() throws in Next.js so we must catch
		mockRedirect.mockImplementation(() => {
			throw new Error("NEXT_REDIRECT");
		});

		await expect(getInventory()).rejects.toThrow("NEXT_REDIRECT");
		expect(mockRedirect).toHaveBeenCalledWith("/connexion");
	});

	it("does not redirect when user is admin", async () => {
		await getInventory();

		expect(mockRedirect).not.toHaveBeenCalled();
	});

	it("checks admin before building params", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockRedirect.mockImplementation(() => {
			throw new Error("NEXT_REDIRECT");
		});

		await expect(getInventory()).rejects.toThrow();
		expect(mockFetchProductSkus).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Tests: default params
// ============================================================================

describe("getInventory – default params", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("uses default perPage of 20 when not specified", async () => {
		await getInventory();

		const parsed = mockGetProductSkusSchema.safeParse.mock.calls[0]![0];
		expect(parsed.perPage).toBe(20);
	});

	it("uses default direction 'forward' when not specified", async () => {
		await getInventory();

		const parsed = mockGetProductSkusSchema.safeParse.mock.calls[0]![0];
		expect(parsed.direction).toBe("forward");
	});

	it("uses default sortBy when not specified", async () => {
		await getInventory();

		const parsed = mockGetProductSkusSchema.safeParse.mock.calls[0]![0];
		expect(parsed.sortBy).toBe("created-descending");
	});

	it("passes explicit params through", async () => {
		await getInventory({ perPage: 50, search: "gold", direction: "backward" });

		const parsed = mockGetProductSkusSchema.safeParse.mock.calls[0]![0];
		expect(parsed.perPage).toBe(50);
		expect(parsed.search).toBe("gold");
		expect(parsed.direction).toBe("backward");
	});
});

// ============================================================================
// Tests: validation failure
// ============================================================================

describe("getInventory – validation failure", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns empty result when schema validation fails", async () => {
		mockGetProductSkusSchema.safeParse.mockReturnValue({ success: false, error: {} });

		const result = await getInventory();

		expect(result).toEqual({
			productSkus: [],
			pagination: EMPTY_PAGINATION,
		});
		expect(mockFetchProductSkus).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Tests: admin sort fallback
// ============================================================================

describe("getInventory – admin sort fallback", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("applies admin fallback sort when sortBy equals default and no sortBy param given", async () => {
		mockGetProductSkusSchema.safeParse.mockReturnValue(
			makeValidationResult({ sortBy: "created-descending" }),
		);

		await getInventory({});

		expect(mockFetchProductSkus).toHaveBeenCalledWith(
			expect.objectContaining({ sortBy: "created-descending" }),
		);
	});

	it("preserves explicit sortBy when caller provides it", async () => {
		mockGetProductSkusSchema.safeParse.mockReturnValue(
			makeValidationResult({ sortBy: "price-ascending" }),
		);

		await getInventory({ sortBy: "price-ascending" });

		expect(mockFetchProductSkus).toHaveBeenCalledWith(
			expect.objectContaining({ sortBy: "price-ascending" }),
		);
	});
});

// ============================================================================
// Tests: delegation to fetchProductSkus
// ============================================================================

describe("getInventory – delegation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("delegates to fetchProductSkus and returns its result", async () => {
		const mockResult = {
			productSkus: [{ id: "sku-1", sku: "SKU-001" }],
			pagination: { ...EMPTY_PAGINATION, hasNextPage: true },
		};
		mockFetchProductSkus.mockResolvedValue(mockResult);

		const result = await getInventory();

		expect(result).toEqual(mockResult);
	});

	it("calls fetchProductSkus exactly once", async () => {
		await getInventory();

		expect(mockFetchProductSkus).toHaveBeenCalledOnce();
	});
});
