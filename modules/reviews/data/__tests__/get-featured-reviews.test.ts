import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockStripDeletedResponses } = vi.hoisted(() => ({
	mockPrisma: {
		productReview: { findMany: vi.fn() },
	},
	mockStripDeletedResponses: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("../../constants/cache", () => ({
	cacheHomepageReviews: vi.fn(),
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_HOMEPAGE_SELECT: {},
}));
vi.mock("../../utils/strip-deleted-response", () => ({
	stripDeletedResponses: mockStripDeletedResponses,
}));

import { getFeaturedReviews } from "../get-featured-reviews";

// ============================================================================
// FACTORIES
// ============================================================================

function createHomepageReview(id: string, content: string) {
	return {
		id,
		rating: 5,
		title: "Great",
		content,
		createdAt: new Date(),
		user: { name: "Marie", image: null },
		medias: [],
		response: null,
		product: {
			title: "Bracelet",
			slug: "bracelet",
			skus: [{ images: [{ url: "https://img.test/1.jpg", blurDataUrl: null, altText: null }] }],
		},
	};
}

const LONG_CONTENT = "A".repeat(50);
const SHORT_CONTENT = "A".repeat(10);

// ============================================================================
// TESTS
// ============================================================================

describe("getFeaturedReviews", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockStripDeletedResponses.mockImplementation((items: unknown[]) => items);
	});

	it("should return up to 6 quality reviews (>= 50 chars)", async () => {
		const reviews = Array.from({ length: 8 }, (_, i) =>
			createHomepageReview(`rev-${i}`, LONG_CONTENT),
		);
		mockPrisma.productReview.findMany.mockResolvedValue(reviews);

		const result = await getFeaturedReviews();

		expect(result).toHaveLength(6);
	});

	it("should filter reviews shorter than 50 chars when enough quality reviews", async () => {
		const quality = Array.from({ length: 4 }, (_, i) =>
			createHomepageReview(`rev-q-${i}`, LONG_CONTENT),
		);
		const short = [createHomepageReview("rev-s-1", SHORT_CONTENT)];
		mockPrisma.productReview.findMany.mockResolvedValue([...quality, ...short]);

		const result = await getFeaturedReviews();

		expect(result).toHaveLength(4);
		expect(result.every((r: { content: string }) => r.content.length >= 50)).toBe(true);
	});

	it("should fallback to unfiltered when fewer than 3 quality reviews", async () => {
		const quality = [createHomepageReview("rev-q-1", LONG_CONTENT)];
		const short = Array.from({ length: 5 }, (_, i) =>
			createHomepageReview(`rev-s-${i}`, SHORT_CONTENT),
		);
		mockPrisma.productReview.findMany.mockResolvedValue([quality[0], ...short]);

		const result = await getFeaturedReviews();

		expect(result).toHaveLength(6);
		expect(result.some((r: { content: string }) => r.content.length < 50)).toBe(true);
	});

	it("should return empty array when no reviews", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([]);

		const result = await getFeaturedReviews();

		expect(result).toEqual([]);
	});

	it("should query with PUBLISHED status and PUBLIC product filter", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([]);

		await getFeaturedReviews();

		expect(mockPrisma.productReview.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					status: "PUBLISHED",
					product: expect.objectContaining({ status: "PUBLIC" }),
				}),
				take: 12,
			}),
		);
	});
});
