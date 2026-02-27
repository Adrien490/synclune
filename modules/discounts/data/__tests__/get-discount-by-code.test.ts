import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockCacheLife,
	mockCacheTag,
	mockCacheDiscountDetail,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: { findFirst: vi.fn() },
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockCacheDiscountDetail: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	cacheDiscountDetail: mockCacheDiscountDetail,
}));

vi.mock("../../constants/discount.constants", () => ({
	GET_DISCOUNT_VALIDATION_SELECT: {
		id: true,
		code: true,
		type: true,
		value: true,
		isActive: true,
		usageCount: true,
	},
}));

vi.mock("../../schemas/discount.schemas", () => ({
	getDiscountByCodeSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: {
				code: (data as { code?: string }).code ?? "PROMO10",
			},
		})),
	},
}));

import { getDiscountByCode } from "../get-discount-by-code";
import { getDiscountByCodeSchema } from "../../schemas/discount.schemas";

const mockSchema = getDiscountByCodeSchema as unknown as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

function makeDiscount(overrides: Record<string, unknown> = {}) {
	return {
		id: "discount-cuid-001",
		code: "PROMO10",
		type: "PERCENTAGE",
		value: 10,
		minOrderAmount: null,
		maxUsageCount: null,
		maxUsagePerUser: null,
		usageCount: 5,
		isActive: true,
		startsAt: null,
		endsAt: null,
		...overrides,
	};
}

function setupDefaults() {
	mockPrisma.discount.findFirst.mockResolvedValue(makeDiscount());
	mockSchema.safeParse.mockReturnValue({
		success: true,
		data: { code: "PROMO10" },
	});
}

// ============================================================================
// Tests: getDiscountByCode
// ============================================================================

describe("getDiscountByCode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when validation fails", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: false,
			error: { errors: [{ message: "code invalide" }] },
		});

		const result = await getDiscountByCode({});

		expect(result).toBeNull();
		expect(mockPrisma.discount.findFirst).not.toHaveBeenCalled();
	});

	it("returns discount when code is valid", async () => {
		const discount = makeDiscount();
		mockPrisma.discount.findFirst.mockResolvedValue(discount);

		const result = await getDiscountByCode({ code: "PROMO10" });

		expect(result).toEqual(discount);
	});

	it("returns null when discount code does not exist", async () => {
		mockPrisma.discount.findFirst.mockResolvedValue(null);

		const result = await getDiscountByCode({ code: "NOTFOUND" });

		expect(result).toBeNull();
	});

	it("queries by code in where clause", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { code: "SUMMER20" },
		});

		await getDiscountByCode({ code: "SUMMER20" });

		expect(mockPrisma.discount.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ code: "SUMMER20" }),
			})
		);
	});

	it("includes notDeleted filter in where clause", async () => {
		await getDiscountByCode({ code: "PROMO10" });

		expect(mockPrisma.discount.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			})
		);
	});

	it("uses GET_DISCOUNT_VALIDATION_SELECT for the DB query", async () => {
		await getDiscountByCode({ code: "PROMO10" });

		expect(mockPrisma.discount.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, code: true, type: true, value: true, isActive: true, usageCount: true },
			})
		);
	});

	it("calls cacheDiscountDetail with the discount code", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { code: "BLACKFRIDAY" },
		});

		await getDiscountByCode({ code: "BLACKFRIDAY" });

		expect(mockCacheDiscountDetail).toHaveBeenCalledWith("BLACKFRIDAY");
	});

	it("returns null on DB error", async () => {
		mockPrisma.discount.findFirst.mockRejectedValue(new Error("DB connection failed"));

		const result = await getDiscountByCode({ code: "PROMO10" });

		expect(result).toBeNull();
	});

	it("does not require authentication (public function)", async () => {
		// No auth mock is involved — simply verifies the function executes without it
		const result = await getDiscountByCode({ code: "PROMO10" });

		expect(result).toEqual(makeDiscount());
	});
});
