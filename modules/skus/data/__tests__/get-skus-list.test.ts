import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GetProductSkusParams, GetProductSkusReturn } from "../../types/skus.types";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockRequireAdmin, mockFetchProductSkus, mockGetProductSkusSchema, mockForbidden } =
	vi.hoisted(() => ({
		mockRequireAdmin: vi.fn(),
		mockFetchProductSkus: vi.fn(),
		mockGetProductSkusSchema: {
			safeParse: vi.fn(),
		},
		mockForbidden: vi.fn(() => {
			throw new Error("NEXT_HTTP_ERROR_FALLBACK;403");
		}),
	}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mockRequireAdmin,
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
	forbidden: mockForbidden,
}));

import { getProductSkus } from "../get-skus-list";

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
	mockRequireAdmin.mockResolvedValue({ admin: true });
	mockForbidden.mockImplementation(() => {
		throw new Error("NEXT_HTTP_ERROR_FALLBACK;403");
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

	it("calls forbidden() when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "error", message: "Accès non autorisé. Droits administrateur requis." },
		});

		await expect(getProductSkus(makeDefaultInput())).rejects.toThrow(/403/);
		expect(mockForbidden).toHaveBeenCalled();
	});

	it("does not query DB when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "error", message: "Accès non autorisé. Droits administrateur requis." },
		});

		await expect(getProductSkus(makeDefaultInput())).rejects.toThrow();
		expect(mockFetchProductSkus).not.toHaveBeenCalled();
	});

	it("checks admin access before validating params", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "error", message: "Accès non autorisé. Droits administrateur requis." },
		});

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
		expect(result).toEqual({
			productSkus: [],
			representativeSkuId: null,
			pagination: EMPTY_PAGINATION,
		});
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

	// Contrat INVERSÉ volontairement : ce wrapper ne re-lève plus, il replie.
	// Avant, `fetchProductSkus` rattrapait l'erreur elle-même — mais son catch était
	// DANS le scope `"use cache"`, donc la page vide était mise en cache pour toute la
	// fenêtre du profil `user`. Le repli a migré ici, hors du cache : l'erreur n'est
	// plus jamais mémoïsée, et l'appelant reçoit une page vide + un champ `error`.
	it("replie sur une page vide (sans re-lever) quand fetchProductSkus échoue", async () => {
		mockFetchProductSkus.mockRejectedValue(new Error("DB down"));

		const result = await getProductSkus(makeDefaultInput());

		expect(result.productSkus).toEqual([]);
		expect(result.pagination).toEqual(EMPTY_PAGINATION);
	});

	it("throws forbidden when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "error", message: "Accès non autorisé. Droits administrateur requis." },
		});

		await expect(getProductSkus(makeDefaultInput())).rejects.toThrow(/403/);
		expect(mockForbidden).toHaveBeenCalled();
	});
});

/**
 * Le repli sur erreur a été DÉPLACÉ de `fetchProductSkus` (scope `"use cache"`) vers
 * ce wrapper : à l'intérieur du scope, une panne DB transitoire mettait la page vide
 * en cache pour toute la fenêtre du profil `user`, et l'admin continuait de voir
 * « aucune variante » après le rétablissement. Ces cas se testent donc ici.
 */
describe("getProductSkus – error handling (repli HORS du scope de cache)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns empty productSkus and pagination when Prisma throws", async () => {
		mockFetchProductSkus.mockRejectedValue(new Error("DB failure"));

		const result = await getProductSkus(makeDefaultInput());

		expect(result.productSkus).toEqual([]);
		expect(result.pagination).toEqual(EMPTY_PAGINATION);
	});

	it("includes specific error message in dev mode", async () => {
		vi.stubEnv("NODE_ENV", "development");
		mockFetchProductSkus.mockRejectedValue(new Error("Connection refused"));

		const result = (await getProductSkus(makeDefaultInput())) as GetProductSkusReturn & {
			error?: string;
		};

		expect(result.error).toBe("Connection refused");
		vi.unstubAllEnvs();
	});

	it("returns generic error message in production", async () => {
		vi.stubEnv("NODE_ENV", "production");
		mockFetchProductSkus.mockRejectedValue(new Error("Connection refused"));

		const result = (await getProductSkus(makeDefaultInput())) as GetProductSkusReturn & {
			error?: string;
		};

		expect(result.error).toBe("Failed to fetch product SKUs");
		vi.unstubAllEnvs();
	});

	it("handles non-Error objects thrown by Prisma in dev mode", async () => {
		vi.stubEnv("NODE_ENV", "development");
		mockFetchProductSkus.mockRejectedValue("string error");

		const result = (await getProductSkus(makeDefaultInput())) as GetProductSkusReturn & {
			error?: string;
		};

		expect(result.error).toBe("Unknown error");
		vi.unstubAllEnvs();
	});
});
