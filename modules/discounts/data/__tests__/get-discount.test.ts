import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockCacheLife, mockCacheTag, mockCacheDiscountDetail } = vi.hoisted(() => ({
	mockPrisma: {
		discount: { findUnique: vi.fn() },
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
	GET_DISCOUNT_SELECT: {
		id: true,
		code: true,
		type: true,
		value: true,
		isActive: true,
		usageCount: true,
		createdAt: true,
		updatedAt: true,
		_count: { select: { usages: true } },
	},
}));

vi.mock("../../schemas/discount.schemas", () => ({
	getDiscountSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: {
				id: (data as { id?: string }).id ?? "discount-cuid-001",
			},
		})),
	},
}));

import { getDiscountById } from "../get-discount";
import { getDiscountSchema } from "../../schemas/discount.schemas";

const mockSchema = getDiscountSchema as unknown as { safeParse: ReturnType<typeof vi.fn> };

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
		maxUsageCount: 100,
		maxUsagePerUser: 1,
		usageCount: 42,
		isActive: true,
		startsAt: null,
		endsAt: null,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-10"),
		_count: { usages: 42 },
		...overrides,
	};
}

function setupDefaults() {
	mockPrisma.discount.findUnique.mockResolvedValue(makeDiscount());
	mockSchema.safeParse.mockReturnValue({
		success: true,
		data: { id: "discount-cuid-001" },
	});
}

// ============================================================================
// Tests: getDiscountById
// ============================================================================

describe("getDiscountById", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when validation fails", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: false,
			error: { errors: [{ message: "id invalide" }] },
		});

		const result = await getDiscountById({});

		expect(result).toBeNull();
		expect(mockPrisma.discount.findUnique).not.toHaveBeenCalled();
	});

	it("returns discount when id is valid", async () => {
		const discount = makeDiscount();
		mockPrisma.discount.findUnique.mockResolvedValue(discount);

		const result = await getDiscountById({ id: "discount-cuid-001" });

		expect(result).toEqual(discount);
	});

	it("returns null when discount does not exist", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(null);

		const result = await getDiscountById({ id: "discount-cuid-001" });

		expect(result).toBeNull();
	});

	it("queries by id in where clause", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { id: "discount-cuid-999" },
		});

		await getDiscountById({ id: "discount-cuid-999" });

		expect(mockPrisma.discount.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: "discount-cuid-999" }),
			}),
		);
	});

	it("includes notDeleted filter in where clause", async () => {
		await getDiscountById({ id: "discount-cuid-001" });

		expect(mockPrisma.discount.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("uses GET_DISCOUNT_SELECT for the DB query", async () => {
		await getDiscountById({ id: "discount-cuid-001" });

		expect(mockPrisma.discount.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					id: true,
					code: true,
					type: true,
					value: true,
					isActive: true,
				}),
			}),
		);
	});

	it("calls cacheDiscountDetail with the discount id", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { id: "discount-cuid-42" },
		});

		await getDiscountById({ id: "discount-cuid-42" });

		expect(mockCacheDiscountDetail).toHaveBeenCalledWith("discount-cuid-42");
	});

	it("returns null on DB error", async () => {
		mockPrisma.discount.findUnique.mockRejectedValue(new Error("DB connection failed"));

		const result = await getDiscountById({ id: "discount-cuid-001" });

		expect(result).toBeNull();
	});

	it("does not require authentication (public function)", async () => {
		// No auth mock is involved — simply verifies the function executes without it
		const result = await getDiscountById({ id: "discount-cuid-001" });

		expect(result).toEqual(makeDiscount());
	});
});
