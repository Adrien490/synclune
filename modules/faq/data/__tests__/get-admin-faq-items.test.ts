import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		faqItem: { findMany: vi.fn() },
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));
vi.mock("../../constants/cache", () => ({
	cacheFaqList: () => {
		mockCacheLife("dashboard");
		mockCacheTag("faq-items-list");
	},
}));

import { getAdminFaqItems } from "../get-admin-faq-items";

// ============================================================================
// FACTORIES
// ============================================================================

function makeAdminFaqItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "faq-1",
		question: "Comment commander ?",
		answer: "Ajoutez au panier.",
		links: null,
		position: 0,
		isActive: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("getAdminFaqItems", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.faqItem.findMany.mockResolvedValue([]);
	});

	it("returns all FAQ items for admin", async () => {
		const items = [
			makeAdminFaqItem({ id: "faq-1", isActive: true }),
			makeAdminFaqItem({ id: "faq-2", isActive: false }),
		];
		mockPrisma.faqItem.findMany.mockResolvedValue(items);

		const result = await getAdminFaqItems();

		expect(result).toHaveLength(2);
	});

	it("queries all items without isActive filter", async () => {
		await getAdminFaqItems();

		expect(mockPrisma.faqItem.findMany).toHaveBeenCalledWith(
			expect.not.objectContaining({
				where: expect.anything(),
			}),
		);
	});

	it("orders by position ascending", async () => {
		await getAdminFaqItems();

		expect(mockPrisma.faqItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { position: "asc" },
			}),
		);
	});

	it("selects all admin fields", async () => {
		await getAdminFaqItems();

		expect(mockPrisma.faqItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					id: true,
					question: true,
					answer: true,
					links: true,
					position: true,
					isActive: true,
					createdAt: true,
					updatedAt: true,
				},
			}),
		);
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getAdminFaqItems();

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with faq-items-list tag", async () => {
		await getAdminFaqItems();

		expect(mockCacheTag).toHaveBeenCalledWith("faq-items-list");
	});

	it("returns empty array on database error", async () => {
		mockPrisma.faqItem.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getAdminFaqItems();

		expect(result).toEqual([]);
	});
});
