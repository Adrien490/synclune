import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockFindUnique,
	mockCacheProductDetail,
	mockGetProductSchema,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockFindUnique: vi.fn(),
	mockCacheProductDetail: vi.fn(),
	mockGetProductSchema: { safeParse: vi.fn() },
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		product: { findUnique: mockFindUnique },
	},
}));

vi.mock("../../utils/cache.utils", () => ({
	cacheProductDetail: mockCacheProductDetail,
}));

vi.mock("../../constants/product.constants", () => ({
	GET_PRODUCT_SELECT: { id: true, title: true, status: true },
}));

vi.mock("../../schemas/product.schemas", () => ({
	getProductSchema: mockGetProductSchema,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

import { getProductBySlug } from "../get-product";

// ============================================================================
// HELPERS
// ============================================================================

function makeProduct(overrides: Record<string, unknown> = {}) {
	return {
		id: "prod-1",
		title: "Bracelet Lune",
		status: "PUBLIC",
		deletedAt: null,
		...overrides,
	};
}

function validationSuccess(data: Record<string, unknown>) {
	return { success: true as const, data };
}

function validationFailure() {
	return {
		success: false as const,
		error: { errors: [{ message: "Format slug invalide" }] },
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("getProductBySlug", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockGetProductSchema.safeParse.mockReturnValue(
			validationSuccess({ slug: "bracelet-lune", includeDraft: false }),
		);

		mockFindUnique.mockResolvedValue(makeProduct());
	});

	// ─── Validation ─────────────────────────────────────────────────────────

	it("returns null when params fail schema validation", async () => {
		mockGetProductSchema.safeParse.mockReturnValue(validationFailure());

		const result = await getProductBySlug({ slug: "INVALID SLUG" });

		expect(result).toBeNull();
		expect(mockFindUnique).not.toHaveBeenCalled();
	});

	it("returns null when params object is empty and schema rejects it", async () => {
		mockGetProductSchema.safeParse.mockReturnValue(validationFailure());

		const result = await getProductBySlug({});

		expect(result).toBeNull();
	});

	it("calls safeParse with the provided params", async () => {
		const params = { slug: "bracelet-lune", includeDraft: false };
		await getProductBySlug(params);

		expect(mockGetProductSchema.safeParse).toHaveBeenCalledWith(params);
	});

	// ─── Database queries ────────────────────────────────────────────────────

	it("returns product for valid slug when product is PUBLIC", async () => {
		const product = makeProduct({ slug: "bracelet-lune", status: "PUBLIC" });
		mockFindUnique.mockResolvedValue(product);

		const result = await getProductBySlug({ slug: "bracelet-lune" });

		expect(result).toEqual(product);
	});

	it("calls prisma.product.findUnique with the validated slug", async () => {
		mockGetProductSchema.safeParse.mockReturnValue(
			validationSuccess({ slug: "bracelet-lune", includeDraft: false }),
		);

		await getProductBySlug({ slug: "bracelet-lune" });

		expect(mockFindUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { slug: "bracelet-lune" },
			}),
		);
	});

	it("includes deletedAt in the select query", async () => {
		await getProductBySlug({ slug: "bracelet-lune" });

		expect(mockFindUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({ deletedAt: true }),
			}),
		);
	});

	// ─── Not found / deleted ─────────────────────────────────────────────────

	it("returns null when product is not found in DB", async () => {
		mockFindUnique.mockResolvedValue(null);

		const result = await getProductBySlug({ slug: "bracelet-lune" });

		expect(result).toBeNull();
	});

	it("returns null when product has a deletedAt date set", async () => {
		mockFindUnique.mockResolvedValue(makeProduct({ deletedAt: new Date("2024-01-01") }));

		const result = await getProductBySlug({ slug: "bracelet-lune" });

		expect(result).toBeNull();
	});

	// ─── Draft / visibility ──────────────────────────────────────────────────

	it("returns null when product is DRAFT and includeDraft is false", async () => {
		mockGetProductSchema.safeParse.mockReturnValue(
			validationSuccess({ slug: "bracelet-lune", includeDraft: false }),
		);
		mockFindUnique.mockResolvedValue(makeProduct({ status: "DRAFT" }));

		const result = await getProductBySlug({ slug: "bracelet-lune" });

		expect(result).toBeNull();
	});

	it("returns null when product is ARCHIVED and includeDraft is false", async () => {
		mockGetProductSchema.safeParse.mockReturnValue(
			validationSuccess({ slug: "bracelet-lune", includeDraft: false }),
		);
		mockFindUnique.mockResolvedValue(makeProduct({ status: "ARCHIVED" }));

		const result = await getProductBySlug({ slug: "bracelet-lune" });

		expect(result).toBeNull();
	});

	it("returns product when status is DRAFT and includeDraft is true", async () => {
		mockGetProductSchema.safeParse.mockReturnValue(
			validationSuccess({ slug: "bracelet-lune", includeDraft: true }),
		);
		const product = makeProduct({ status: "DRAFT", deletedAt: null });
		mockFindUnique.mockResolvedValue(product);

		const result = await getProductBySlug({ slug: "bracelet-lune", includeDraft: true });

		expect(result).toEqual(product);
	});

	it("returns product when status is ARCHIVED and includeDraft is true", async () => {
		mockGetProductSchema.safeParse.mockReturnValue(
			validationSuccess({ slug: "bracelet-lune", includeDraft: true }),
		);
		const product = makeProduct({ status: "ARCHIVED", deletedAt: null });
		mockFindUnique.mockResolvedValue(product);

		const result = await getProductBySlug({ slug: "bracelet-lune", includeDraft: true });

		expect(result).toEqual(product);
	});

	// ─── Cache ───────────────────────────────────────────────────────────────

	it("calls cacheProductDetail with the validated slug", async () => {
		mockGetProductSchema.safeParse.mockReturnValue(
			validationSuccess({ slug: "bracelet-lune", includeDraft: false }),
		);

		await getProductBySlug({ slug: "bracelet-lune" });

		expect(mockCacheProductDetail).toHaveBeenCalledWith("bracelet-lune");
	});

	it("does not call cacheProductDetail when validation fails", async () => {
		mockGetProductSchema.safeParse.mockReturnValue(validationFailure());

		await getProductBySlug({ slug: "INVALID" });

		expect(mockCacheProductDetail).not.toHaveBeenCalled();
	});

	// ─── Error handling ──────────────────────────────────────────────────────

	it("returns null when prisma throws an error", async () => {
		mockFindUnique.mockRejectedValue(new Error("DB connection failed"));

		const result = await getProductBySlug({ slug: "bracelet-lune" });

		expect(result).toBeNull();
	});

	it("returns null when prisma throws a non-Error exception", async () => {
		mockFindUnique.mockRejectedValue("unexpected string error");

		const result = await getProductBySlug({ slug: "bracelet-lune" });

		expect(result).toBeNull();
	});
});
