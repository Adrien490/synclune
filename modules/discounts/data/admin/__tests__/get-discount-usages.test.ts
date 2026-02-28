import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockRequireAdmin, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		discountUsage: { findMany: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	DISCOUNT_CACHE_TAGS: {
		LIST: "discounts-list",
		DETAIL: (idOrCode: string) => `discount-${idOrCode}`,
		USAGE: (discountId: string) => `discount-usage-${discountId}`,
	},
	cacheDiscountDetail: vi.fn(),
	cacheDiscounts: vi.fn(),
}));

import { getDiscountUsages } from "../get-discount-usages";

// ============================================================================
// Factories
// ============================================================================

function makeUsage(overrides: Record<string, unknown> = {}) {
	return {
		id: "usage-cuid-001",
		createdAt: new Date("2024-03-01"),
		amountApplied: 990,
		user: {
			id: "user-001",
			name: "Jane Doe",
			email: "jane@example.com",
		},
		order: {
			id: "order-cuid-001",
			orderNumber: "ORD-001",
			total: 9900,
		},
		...overrides,
	};
}

function setupDefaults() {
	mockRequireAdmin.mockResolvedValue({ admin: true });
	mockPrisma.discountUsage.findMany.mockResolvedValue([makeUsage()]);
}

// ============================================================================
// Tests: getDiscountUsages
// ============================================================================

describe("getDiscountUsages", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns error when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: {
				status: "FORBIDDEN",
				message: "Accès non autorisé. Droits administrateur requis.",
			},
		});

		const result = await getDiscountUsages("discount-cuid-001");

		expect(result).toHaveProperty("error");
		expect(mockPrisma.discountUsage.findMany).not.toHaveBeenCalled();
	});

	it("returns usages for admin user", async () => {
		const usage = makeUsage();
		mockPrisma.discountUsage.findMany.mockResolvedValue([usage]);

		const result = await getDiscountUsages("discount-cuid-001");

		expect("usages" in result && result.usages).toEqual([usage]);
	});

	it("returns empty usages when discount has no usage history", async () => {
		mockPrisma.discountUsage.findMany.mockResolvedValue([]);

		const result = await getDiscountUsages("discount-cuid-001");

		expect("usages" in result && result.usages).toEqual([]);
	});

	it("queries discountUsage by discountId", async () => {
		await getDiscountUsages("discount-cuid-999");

		expect(mockPrisma.discountUsage.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { discountId: "discount-cuid-999" },
			}),
		);
	});

	it("orders usages by createdAt descending", async () => {
		await getDiscountUsages("discount-cuid-001");

		expect(mockPrisma.discountUsage.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { createdAt: "desc" },
			}),
		);
	});

	it("selects user and order relation fields", async () => {
		await getDiscountUsages("discount-cuid-001");

		expect(mockPrisma.discountUsage.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					user: expect.objectContaining({
						select: expect.objectContaining({
							id: true,
							name: true,
							email: true,
						}),
					}),
					order: expect.objectContaining({
						select: expect.objectContaining({
							id: true,
							orderNumber: true,
							total: true,
						}),
					}),
				}),
			}),
		);
	});

	it("computes totalAmount as sum of amountApplied across all usages", async () => {
		mockPrisma.discountUsage.findMany.mockResolvedValue([
			makeUsage({ amountApplied: 500 }),
			makeUsage({ id: "usage-cuid-002", amountApplied: 300 }),
			makeUsage({ id: "usage-cuid-003", amountApplied: 200 }),
		]);

		const result = await getDiscountUsages("discount-cuid-001");

		expect("totalAmount" in result && result.totalAmount).toBe(1000);
	});

	it("returns totalAmount of 0 when no usages exist", async () => {
		mockPrisma.discountUsage.findMany.mockResolvedValue([]);

		const result = await getDiscountUsages("discount-cuid-001");

		expect("totalAmount" in result && result.totalAmount).toBe(0);
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getDiscountUsages("discount-cuid-001");

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with discount detail tag for the given discountId", async () => {
		await getDiscountUsages("discount-cuid-001");

		expect(mockCacheTag).toHaveBeenCalledWith("discount-discount-cuid-001");
	});

	it("includes guest usages (user is null) in the result", async () => {
		const guestUsage = makeUsage({ user: null });
		mockPrisma.discountUsage.findMany.mockResolvedValue([guestUsage]);

		const result = await getDiscountUsages("discount-cuid-001");

		expect("usages" in result && result.usages[0]!.user).toBeNull();
	});
});
