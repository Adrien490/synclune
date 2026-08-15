import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
	GetProductVariantsParams,
	GetProductVariantsReturn,
} from "../../types/variants.types";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockRequireAdmin, mockFetchProductVariants, mockGetProductVariantsSchema, mockForbidden } =
	vi.hoisted(() => ({
		mockRequireAdmin: vi.fn(),
		mockFetchProductVariants: vi.fn(),
		mockGetProductVariantsSchema: {
			safeParse: vi.fn(),
		},
		mockForbidden: vi.fn(() => {
			throw new Error("NEXT_HTTP_ERROR_FALLBACK;403");
		}),
	}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mockRequireAdmin,
}));

vi.mock("../fetch-variants", () => ({
	fetchProductVariants: mockFetchProductVariants,
}));

vi.mock("../../schemas/get-variants.schemas", () => ({
	getProductVariantsSchema: mockGetProductVariantsSchema,
}));

vi.mock("../../constants/variant.constants", () => ({
	GET_PRODUCT_VARIANTS_DEFAULT_SORT_BY: "created-descending",
	GET_PRODUCT_VARIANTS_ADMIN_FALLBACK_SORT_BY: "created-descending",
}));

vi.mock("next/navigation", () => ({
	forbidden: mockForbidden,
}));

import { getProductVariants } from "../get-variants-list";

// ============================================================================
// Helpers
// ============================================================================

const EMPTY_PAGINATION = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
};

function makeValidatedParams(
	overrides: Partial<GetProductVariantsParams> = {},
): GetProductVariantsParams {
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

function makeDefaultInput(): GetProductVariantsParams {
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
	mockGetProductVariantsSchema.safeParse.mockReturnValue({
		success: true,
		data: makeValidatedParams(),
	});
	mockFetchProductVariants.mockResolvedValue({
		productVariants: [],
		pagination: EMPTY_PAGINATION,
	});
}

// ============================================================================
// Tests: auth guard
// ============================================================================

describe("getProductVariants – auth guard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("calls forbidden() when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "error", message: "Accès non autorisé. Droits administrateur requis." },
		});

		await expect(getProductVariants(makeDefaultInput())).rejects.toThrow(/403/);
		expect(mockForbidden).toHaveBeenCalled();
	});

	it("does not query DB when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "error", message: "Accès non autorisé. Droits administrateur requis." },
		});

		await expect(getProductVariants(makeDefaultInput())).rejects.toThrow();
		expect(mockFetchProductVariants).not.toHaveBeenCalled();
	});

	it("checks admin access before validating params", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "error", message: "Accès non autorisé. Droits administrateur requis." },
		});

		await expect(getProductVariants(makeDefaultInput())).rejects.toThrow();
		expect(mockGetProductVariantsSchema.safeParse).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Tests: validation
// ============================================================================

describe("getProductVariants – validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns empty productVariants when schema validation fails", async () => {
		mockGetProductVariantsSchema.safeParse.mockReturnValue({
			success: false,
			error: { errors: [{ message: "invalid" }] },
		});

		const result = await getProductVariants(makeDefaultInput());
		expect(result).toEqual({
			productVariants: [],
			representativeVariantId: null,
			pagination: EMPTY_PAGINATION,
		});
	});

	it("does not call fetchProductVariants when validation fails", async () => {
		mockGetProductVariantsSchema.safeParse.mockReturnValue({ success: false, error: {} });

		await getProductVariants(makeDefaultInput());
		expect(mockFetchProductVariants).not.toHaveBeenCalled();
	});

	it("calls safeParse with the input params", async () => {
		const input = makeDefaultInput();
		await getProductVariants(input);

		expect(mockGetProductVariantsSchema.safeParse).toHaveBeenCalledWith(input);
	});
});

// ============================================================================
// Tests: admin sort fallback
// ============================================================================

describe("getProductVariants – admin sort fallback", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("applies admin fallback sort when sortBy is the default and caller did not specify sortBy", async () => {
		mockGetProductVariantsSchema.safeParse.mockReturnValue({
			success: true,
			data: makeValidatedParams({ sortBy: "created-descending" }),
		});

		await getProductVariants({
			...makeDefaultInput(),
			sortBy: undefined as unknown as GetProductVariantsParams["sortBy"],
		});

		expect(mockFetchProductVariants).toHaveBeenCalledWith(
			expect.objectContaining({ sortBy: "created-descending" }),
		);
	});

	it("preserves explicitly provided sortBy even if it matches the default value", async () => {
		mockGetProductVariantsSchema.safeParse.mockReturnValue({
			success: true,
			data: makeValidatedParams({ sortBy: "price-ascending" }),
		});

		await getProductVariants({ ...makeDefaultInput(), sortBy: "price-ascending" });

		expect(mockFetchProductVariants).toHaveBeenCalledWith(
			expect.objectContaining({ sortBy: "price-ascending" }),
		);
	});
});

// ============================================================================
// Tests: delegation and return value
// ============================================================================

describe("getProductVariants – delegation and return value", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("delegates to fetchProductVariants and returns its result", async () => {
		const mockResult = {
			productVariants: [{ id: "variant-1", variant: "VARIANT-001" }],
			pagination: { ...EMPTY_PAGINATION, hasNextPage: true },
		};
		mockFetchProductVariants.mockResolvedValue(mockResult);

		const result = await getProductVariants(makeDefaultInput());

		expect(result).toEqual(mockResult);
	});

	it("calls fetchProductVariants exactly once", async () => {
		await getProductVariants(makeDefaultInput());

		expect(mockFetchProductVariants).toHaveBeenCalledOnce();
	});

	it("passes validated params to fetchProductVariants", async () => {
		const validatedData = makeValidatedParams({ search: "silver", perPage: 50 });
		mockGetProductVariantsSchema.safeParse.mockReturnValue({ success: true, data: validatedData });

		await getProductVariants({ ...makeDefaultInput(), search: "silver", perPage: 50 });

		expect(mockFetchProductVariants).toHaveBeenCalledWith(
			expect.objectContaining({ search: "silver", perPage: 50 }),
		);
	});
});

// ============================================================================
// Tests: error handling
// ============================================================================

describe("getProductVariants – error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	// Contrat INVERSÉ volontairement : ce wrapper ne re-lève plus, il replie.
	// Avant, `fetchProductVariants` rattrapait l'erreur elle-même — mais son catch était
	// DANS le scope `"use cache"`, donc la page vide était mise en cache pour toute la
	// fenêtre du profil `user`. Le repli a migré ici, hors du cache : l'erreur n'est
	// plus jamais mémoïsée, et l'appelant reçoit une page vide + un champ `error`.
	it("replie sur une page vide (sans re-lever) quand fetchProductVariants échoue", async () => {
		mockFetchProductVariants.mockRejectedValue(new Error("DB down"));

		const result = await getProductVariants(makeDefaultInput());

		expect(result.productVariants).toEqual([]);
		expect(result.pagination).toEqual(EMPTY_PAGINATION);
	});

	it("throws forbidden when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "error", message: "Accès non autorisé. Droits administrateur requis." },
		});

		await expect(getProductVariants(makeDefaultInput())).rejects.toThrow(/403/);
		expect(mockForbidden).toHaveBeenCalled();
	});
});

/**
 * Le repli sur erreur a été DÉPLACÉ de `fetchProductVariants` (scope `"use cache"`) vers
 * ce wrapper : à l'intérieur du scope, une panne DB transitoire mettait la page vide
 * en cache pour toute la fenêtre du profil `user`, et l'admin continuait de voir
 * « aucune variante » après le rétablissement. Ces cas se testent donc ici.
 */
describe("getProductVariants – error handling (repli HORS du scope de cache)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns empty productVariants and pagination when Prisma throws", async () => {
		mockFetchProductVariants.mockRejectedValue(new Error("DB failure"));

		const result = await getProductVariants(makeDefaultInput());

		expect(result.productVariants).toEqual([]);
		expect(result.pagination).toEqual(EMPTY_PAGINATION);
	});

	it("includes specific error message in dev mode", async () => {
		vi.stubEnv("NODE_ENV", "development");
		mockFetchProductVariants.mockRejectedValue(new Error("Connection refused"));

		const result = (await getProductVariants(makeDefaultInput())) as GetProductVariantsReturn & {
			error?: string;
		};

		expect(result.error).toBe("Connection refused");
		vi.unstubAllEnvs();
	});

	it("returns generic error message in production", async () => {
		vi.stubEnv("NODE_ENV", "production");
		mockFetchProductVariants.mockRejectedValue(new Error("Connection refused"));

		const result = (await getProductVariants(makeDefaultInput())) as GetProductVariantsReturn & {
			error?: string;
		};

		expect(result.error).toBe("Failed to fetch product VARIANTs");
		vi.unstubAllEnvs();
	});

	it("handles non-Error objects thrown by Prisma in dev mode", async () => {
		vi.stubEnv("NODE_ENV", "development");
		mockFetchProductVariants.mockRejectedValue("string error");

		const result = (await getProductVariants(makeDefaultInput())) as GetProductVariantsReturn & {
			error?: string;
		};

		expect(result.error).toBe("Unknown error");
		vi.unstubAllEnvs();
	});
});
