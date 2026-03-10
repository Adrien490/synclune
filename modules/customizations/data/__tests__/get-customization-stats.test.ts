import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockRequireAdmin, mockCacheLife, mockCacheTag, mockSentry } = vi.hoisted(
	() => ({
		mockPrisma: {
			customizationRequest: { groupBy: vi.fn(), count: vi.fn() },
		},
		mockRequireAdmin: vi.fn(),
		mockCacheLife: vi.fn(),
		mockCacheTag: vi.fn(),
		mockSentry: { captureException: vi.fn() },
	}),
);

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => mockSentry);

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../constants/cache", () => ({
	cacheCustomizationStats: () => {
		mockCacheLife("dashboard");
		mockCacheTag("customization-requests-stats");
	},
	CUSTOMIZATION_CACHE_TAGS: {
		STATS: "customization-requests-stats",
	},
}));

vi.mock("../constants/status.constants", () => ({
	OPEN_STATUSES: ["PENDING", "IN_PROGRESS"],
	CLOSED_STATUSES: ["COMPLETED", "CANCELLED"],
}));

import { getCustomizationStats } from "../get-customization-stats";

// ============================================================================
// Factories
// ============================================================================

const EMPTY_STATS = {
	total: 0,
	pending: 0,
	inProgress: 0,
	completed: 0,
	open: 0,
	closed: 0,
	thisMonth: 0,
};

function setupGroupByMock(statusCounts: Record<string, number>) {
	mockPrisma.customizationRequest.groupBy.mockResolvedValue(
		Object.entries(statusCounts).map(([status, count]) => ({
			status,
			_count: count,
		})),
	);
}

function setupDefaults() {
	mockRequireAdmin.mockResolvedValue({ admin: true });
	setupGroupByMock({});
	mockPrisma.customizationRequest.count.mockResolvedValue(0);
}

// ============================================================================
// Tests: getCustomizationStats
// ============================================================================

describe("getCustomizationStats", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns empty stats when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "FORBIDDEN", message: "Non autorisé" },
		});

		const result = await getCustomizationStats();

		expect(result).toEqual(EMPTY_STATS);
		expect(mockPrisma.customizationRequest.groupBy).not.toHaveBeenCalled();
		expect(mockPrisma.customizationRequest.count).not.toHaveBeenCalled();
	});

	it("returns populated stats for admin user", async () => {
		setupGroupByMock({
			PENDING: 10,
			IN_PROGRESS: 5,
			COMPLETED: 30,
			CANCELLED: 5,
		});
		mockPrisma.customizationRequest.count.mockResolvedValue(8);

		const result = await getCustomizationStats();

		expect(result).toEqual({
			total: 50,
			pending: 10,
			inProgress: 5,
			completed: 30,
			open: 15,
			closed: 35,
			thisMonth: 8,
		});
	});

	it("excludes soft-deleted records via groupBy where clause", async () => {
		await getCustomizationStats();

		expect(mockPrisma.customizationRequest.groupBy).toHaveBeenCalledWith(
			expect.objectContaining({
				by: ["status"],
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("computes per-status counts from groupBy results", async () => {
		setupGroupByMock({
			PENDING: 3,
			IN_PROGRESS: 4,
			COMPLETED: 6,
			CANCELLED: 2,
		});
		mockPrisma.customizationRequest.count.mockResolvedValue(0);

		const result = await getCustomizationStats();

		expect(result.pending).toBe(3);
		expect(result.inProgress).toBe(4);
		expect(result.completed).toBe(6);
	});

	it("computes open count from OPEN_STATUSES", async () => {
		setupGroupByMock({
			PENDING: 3,
			IN_PROGRESS: 4,
			COMPLETED: 6,
			CANCELLED: 2,
		});
		mockPrisma.customizationRequest.count.mockResolvedValue(0);

		const result = await getCustomizationStats();

		expect(result.open).toBe(7); // PENDING + IN_PROGRESS
	});

	it("computes closed count from CLOSED_STATUSES", async () => {
		setupGroupByMock({
			PENDING: 3,
			IN_PROGRESS: 4,
			COMPLETED: 6,
			CANCELLED: 2,
		});
		mockPrisma.customizationRequest.count.mockResolvedValue(0);

		const result = await getCustomizationStats();

		expect(result.closed).toBe(8); // COMPLETED + CANCELLED
	});

	it("computes total as open + closed", async () => {
		setupGroupByMock({
			PENDING: 3,
			IN_PROGRESS: 4,
			COMPLETED: 6,
			CANCELLED: 2,
		});
		mockPrisma.customizationRequest.count.mockResolvedValue(0);

		const result = await getCustomizationStats();

		expect(result.total).toBe(15); // 7 open + 8 closed
	});

	it("filters thisMonth count using a start-of-month date", async () => {
		mockPrisma.customizationRequest.count.mockResolvedValue(2);

		await getCustomizationStats();

		expect(mockPrisma.customizationRequest.count).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					deletedAt: null,
					createdAt: { gte: expect.any(Date) },
				}),
			}),
		);

		const countCall = mockPrisma.customizationRequest.count.mock.calls[0]![0];
		const startOfMonth = countCall.where.createdAt.gte as Date;
		expect(startOfMonth.getDate()).toBe(1);
		expect(startOfMonth.getHours()).toBe(0);
		expect(startOfMonth.getMinutes()).toBe(0);
	});

	it("uses groupBy + count instead of 7 separate count calls", async () => {
		setupGroupByMock({ PENDING: 1 });
		mockPrisma.customizationRequest.count.mockResolvedValue(1);

		await getCustomizationStats();

		expect(mockPrisma.customizationRequest.groupBy).toHaveBeenCalledTimes(1);
		expect(mockPrisma.customizationRequest.count).toHaveBeenCalledTimes(1);
	});

	it("handles missing statuses in groupBy results gracefully", async () => {
		// Only PENDING exists, other statuses should default to 0
		setupGroupByMock({ PENDING: 5 });
		mockPrisma.customizationRequest.count.mockResolvedValue(0);

		const result = await getCustomizationStats();

		expect(result.pending).toBe(5);
		expect(result.inProgress).toBe(0);
		expect(result.completed).toBe(0);
		expect(result.open).toBe(5);
		expect(result.closed).toBe(0);
		expect(result.total).toBe(5);
	});

	it("returns empty stats on DB error without throwing", async () => {
		mockPrisma.customizationRequest.groupBy.mockRejectedValue(new Error("DB unavailable"));

		const result = await getCustomizationStats();

		expect(result).toEqual(EMPTY_STATS);
	});

	it("calls Sentry.captureException on DB error", async () => {
		const dbError = new Error("DB unavailable");
		mockPrisma.customizationRequest.groupBy.mockRejectedValue(dbError);

		await getCustomizationStats();

		expect(mockSentry.captureException).toHaveBeenCalledWith(dbError);
	});

	it("calls cacheLife with dashboard profile", async () => {
		await getCustomizationStats();

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with stats tag", async () => {
		await getCustomizationStats();

		expect(mockCacheTag).toHaveBeenCalledWith("customization-requests-stats");
	});

	it("does not call cache functions when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: "FORBIDDEN", message: "Non autorisé" },
		});

		await getCustomizationStats();

		expect(mockCacheLife).not.toHaveBeenCalled();
		expect(mockCacheTag).not.toHaveBeenCalled();
	});
});
