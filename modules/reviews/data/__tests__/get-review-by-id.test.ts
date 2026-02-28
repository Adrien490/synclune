import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockStripDeletedResponse } = vi.hoisted(() => ({
	mockPrisma: {
		productReview: { findFirst: vi.fn() },
	},
	mockStripDeletedResponse: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("../../constants/cache", () => ({
	REVIEWS_CACHE_TAGS: {
		DETAIL: (id: string) => `review-${id}`,
		ADMIN_DETAIL: (id: string) => `review-admin-${id}`,
	},
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_PUBLIC_SELECT: {},
	REVIEW_ADMIN_SELECT: {},
}));
vi.mock("../../utils/strip-deleted-response", () => ({
	stripDeletedResponse: mockStripDeletedResponse,
}));

import { getReviewById, getReviewByIdAdmin } from "../get-review-by-id";

// ============================================================================
// FACTORIES
// ============================================================================

function createReview(overrides: Record<string, unknown> = {}) {
	return {
		id: "rev-1",
		rating: 5,
		title: "Super produit",
		content: "Tres beau bracelet",
		createdAt: new Date(),
		user: { name: "Marie", image: null },
		medias: [],
		response: null,
		...overrides,
	};
}

// ============================================================================
// getReviewById (public)
// ============================================================================

describe("getReviewById", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return the review after stripping deleted response", async () => {
		const review = createReview();
		mockPrisma.productReview.findFirst.mockResolvedValue(review);
		mockStripDeletedResponse.mockReturnValue(review);

		const result = await getReviewById("rev-1");

		expect(result).toBe(review);
		expect(mockStripDeletedResponse).toHaveBeenCalledWith(review);
	});

	it("should return null when review not found", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(null);

		const result = await getReviewById("rev-nonexistent");

		expect(result).toBeNull();
		expect(mockStripDeletedResponse).not.toHaveBeenCalled();
	});

	it("should query with PUBLISHED status and notDeleted filter", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(null);

		await getReviewById("rev-1");

		expect(mockPrisma.productReview.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: "rev-1",
					status: "PUBLISHED",
					deletedAt: null,
				}),
			}),
		);
	});
});

// ============================================================================
// getReviewByIdAdmin
// ============================================================================

describe("getReviewByIdAdmin", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return admin review including hidden ones", async () => {
		const review = createReview({ status: "HIDDEN" });
		mockPrisma.productReview.findFirst.mockResolvedValue(review);
		mockStripDeletedResponse.mockReturnValue(review);

		const result = await getReviewByIdAdmin("rev-1");

		expect(result).toBe(review);
	});

	it("should query without status filter (all statuses)", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(null);

		await getReviewByIdAdmin("rev-1");

		const call = mockPrisma.productReview.findFirst.mock.calls[0]![0];
		expect(call.where.status).toBeUndefined();
		expect(call.where.deletedAt).toBe(null);
	});

	it("should return null when review not found", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(null);

		const result = await getReviewByIdAdmin("rev-nonexistent");

		expect(result).toBeNull();
	});
});
