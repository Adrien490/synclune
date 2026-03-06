import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GetProductSkusParams } from "../../types/skus.types";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockIsAdmin, mockFetchProductSkus, mockGetProductSkusSchema, mockRedirect } = vi.hoisted(
	() => ({
		mockIsAdmin: vi.fn(),
		mockFetchProductSkus: vi.fn(),
		mockGetProductSkusSchema: {
			safeParse: vi.fn(),
		},
		mockRedirect: vi.fn(),
	}),
);

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("../fetch-skus", () => ({
	fetchProductSkus: mockFetchProductSkus,
}));

vi.mock("../../schemas/get-skus.schemas", () => ({
	getProductSkusSchema: mockGetProductSkusSchema,
}));

vi.mock("../../constants/sku.constants", () => ({
	GET_PRODUCT_SKUS_DEFAULT_SORT_BY: "created-descending",
	GET_PRODUCT_SKUS_ADMIN_FALLBACK_SORT_BY: "created-descending",
}));

vi.mock("next/navigation", () => ({
	redirect: mockRedirect,
}));

import { getProductSkus } from "../get-skus";

// ============================================================================
// Helpers
// ============================================================================

const EMPTY_PAGINATION = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
};

function makeValidatedParams(overrides: Partial<GetProductSkusParams> = {}): GetProductSkusParams {
	return {
		cursor: undefined,
		direction: "forward",
		perPage: 20,
		sortBy: "created-descending",
		search: undefined,
		filters: undefined,
		...overrides,
	};
}

function makeDefaultInput(): GetProductSkusParams {
	return {
		cursor: undefined,
		direction: "forward",
		perPage: 20,
		sortBy: "created-descending",
		search: undefined,
		filters: undefined,
	};
}

function setupDefaults() {
	mockIsAdmin.mockResolvedValue(true);
	mockRedirect.mockImplementation(() => {
		throw new Error("NEXT_REDIRECT");
	});
	mockGetProductSkusSchema.safeParse.mockReturnValue({
		success: true,
		data: makeValidatedParams(),
	});
	mockFetchProductSkus.mockResolvedValue({
		productSkus: [],
		pagination: EMPTY_PAGINATION,
	});
}

// ============================================================================
// Tests: auth guard
// ============================================================================

describe("getProductSkus – auth guard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("redirects to /connexion when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getProductSkus(makeDefaultInput())).rejects.toThrow("NEXT_REDIRECT");
		expect(mockRedirect).toHaveBeenCalledWith("/connexion");
	});

	it("does not query DB when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getProductSkus(makeDefaultInput())).rejects.toThrow();
		expect(mockFetchProductSkus).not.toHaveBeenCalled();
	});

	it("checks admin access before validating params", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getProductSkus(makeDefaultInput())).rejects.toThrow();
		expect(mockGetProductSkusSchema.safeParse).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Tests: validation
// ============================================================================

describe("getProductSkus – validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns empty productSkus when schema validation fails", async () => {
		mockGetProductSkusSchema.safeParse.mockReturnValue({
			success: false,
			error: { errors: [{ message: "invalid" }] },
		});

		const result = await getProductSkus(makeDefaultInput());
		expect(result).toEqual({ productSkus: [], pagination: EMPTY_PAGINATION });
	});

	it("does not call fetchProductSkus when validation fails", async () => {
		mockGetProductSkusSchema.safeParse.mockReturnValue({ success: false, error: {} });

		await getProductSkus(makeDefaultInput());
		expect(mockFetchProductSkus).not.toHaveBeenCalled();
	});

	it("calls safeParse with the input params", async () => {
		const input = makeDefaultInput();
		await getProductSkus(input);

		expect(mockGetProductSkusSchema.safeParse).toHaveBeenCalledWith(input);
	});
});

// ============================================================================
// Tests: admin sort fallback
// ============================================================================

describe("getProductSkus – admin sort fallback", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("applies admin fallback sort when sortBy is the default and caller did not specify sortBy", async () => {
		mockGetProductSkusSchema.safeParse.mockReturnValue({
			success: true,
			data: makeValidatedParams({ sortBy: "created-descending" }),
		});

		await getProductSkus({
			...makeDefaultInput(),
			sortBy: undefined as unknown as GetProductSkusParams["sortBy"],
		});

		expect(mockFetchProductSkus).toHaveBeenCalledWith(
			expect.objectContaining({ sortBy: "created-descending" }),
		);
	});

	it("preserves explicitly provided sortBy even if it matches the default value", async () => {
		mockGetProductSkusSchema.safeParse.mockReturnValue({
			success: true,
			data: makeValidatedParams({ sortBy: "price-ascending" }),
		});

		await getProductSkus({ ...makeDefaultInput(), sortBy: "price-ascending" });

		expect(mockFetchProductSkus).toHaveBeenCalledWith(
			expect.objectContaining({ sortBy: "price-ascending" }),
		);
	});
});

// ============================================================================
// Tests: delegation and return value
// ============================================================================

describe("getProductSkus – delegation and return value", () => {
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

		const result = await getProductSkus(makeDefaultInput());

		expect(result).toEqual(mockResult);
	});

	it("calls fetchProductSkus exactly once", async () => {
		await getProductSkus(makeDefaultInput());

		expect(mockFetchProductSkus).toHaveBeenCalledOnce();
	});

	it("passes validated params to fetchProductSkus", async () => {
		const validatedData = makeValidatedParams({ search: "silver", perPage: 50 });
		mockGetProductSkusSchema.safeParse.mockReturnValue({ success: true, data: validatedData });

		await getProductSkus({ ...makeDefaultInput(), search: "silver", perPage: 50 });

		expect(mockFetchProductSkus).toHaveBeenCalledWith(
			expect.objectContaining({ search: "silver", perPage: 50 }),
		);
	});
});

// ============================================================================
// Tests: error handling
// ============================================================================

describe("getProductSkus – error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("re-throws errors from fetchProductSkus", async () => {
		mockFetchProductSkus.mockRejectedValue(new Error("DB down"));

		await expect(getProductSkus(makeDefaultInput())).rejects.toThrow("DB down");
	});

	it("redirects when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getProductSkus(makeDefaultInput())).rejects.toThrow("NEXT_REDIRECT");
		expect(mockRedirect).toHaveBeenCalledWith("/connexion");
	});
});
