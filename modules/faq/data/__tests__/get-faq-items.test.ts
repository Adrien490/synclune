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
	cacheFaqPublic: () => {
		mockCacheLife("reference");
		mockCacheTag("faq-items");
	},
}));
vi.mock("../../schemas/faq.schemas", async () => {
	const { z } = await import("zod");
	return {
		faqLinkSchema: z.object({
			text: z.string().min(1).max(100),
			href: z
				.string()
				.min(1)
				.max(2048)
				.refine((val) => val.startsWith("/") || val.startsWith("https://")),
		}),
	};
});

import { getFaqItems } from "../get-faq-items";

// ============================================================================
// FACTORIES
// ============================================================================

function makeFaqItem(overrides: Record<string, unknown> = {}) {
	return {
		question: "Comment commander ?",
		answer: "Ajoutez au panier.",
		links: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("getFaqItems", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.faqItem.findMany.mockResolvedValue([]);
	});

	it("returns active FAQ items ordered by position", async () => {
		const items = [makeFaqItem({ question: "Q1" }), makeFaqItem({ question: "Q2" })];
		mockPrisma.faqItem.findMany.mockResolvedValue(items);

		const result = await getFaqItems();

		expect(result).toHaveLength(2);
		expect(result[0]!.question).toBe("Q1");
	});

	it("queries only active items", async () => {
		await getFaqItems();

		expect(mockPrisma.faqItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { isActive: true },
			}),
		);
	});

	it("orders by position ascending", async () => {
		await getFaqItems();

		expect(mockPrisma.faqItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { position: "asc" },
			}),
		);
	});

	it("selects only question, answer, and links", async () => {
		await getFaqItems();

		expect(mockPrisma.faqItem.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { question: true, answer: true, links: true },
			}),
		);
	});

	it("calls cacheLife with reference profile", async () => {
		await getFaqItems();

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("calls cacheTag with faq-items tag", async () => {
		await getFaqItems();

		expect(mockCacheTag).toHaveBeenCalledWith("faq-items");
	});

	it("validates links with Zod and returns null for invalid links", async () => {
		mockPrisma.faqItem.findMany.mockResolvedValue([
			makeFaqItem({ links: [{ text: "ok", href: "/page" }] }),
			makeFaqItem({ links: [{ text: "", href: "bad" }] }),
		]);

		const result = await getFaqItems();

		expect(result[0]!.links).toEqual([{ text: "ok", href: "/page" }]);
		expect(result[1]!.links).toBeNull();
	});

	it("returns empty array on database error", async () => {
		mockPrisma.faqItem.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getFaqItems();

		expect(result).toEqual([]);
	});

	it("does not require authentication", async () => {
		mockPrisma.faqItem.findMany.mockResolvedValue([makeFaqItem()]);

		const result = await getFaqItems();

		expect(result).toHaveLength(1);
	});
});
