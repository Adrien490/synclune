import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockRequireAdmin, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		customizationRequest: { count: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

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

function setupCountMocks(values: {
	total: number;
	pending: number;
	inProgress: number;
	completed: number;
	open: number;
	closed: number;
	thisMonth: number;
}) {
	mockPrisma.customizationRequest.count
		.mockResolvedValueOnce(values.total)
		.mockResolvedValueOnce(values.pending)
		.mockResolvedValueOnce(values.inProgress)
		.mockResolvedValueOnce(values.completed)
		.mockResolvedValueOnce(values.open)
		.mockResolvedValueOnce(values.closed)
		.mockResolvedValueOnce(values.thisMonth);
}

function setupDefaults() {
	mockRequireAdmin.mockResolvedValue({ admin: true });
	// Use mockResolvedValue (not Once) so it returns 0 as a stable default
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
		mockRequireAdmin.mockResolvedValue({ error: { status: "FORBIDDEN", message: "Non autorisé" } });

		const result = await getCustomizationStats();

		expect(result).toEqual(EMPTY_STATS);
		expect(mockPrisma.customizationRequest.count).not.toHaveBeenCalled();
	});

	it("returns populated stats for admin user", async () => {
		mockRequireAdmin.mockResolvedValue({ admin: true });
		setupCountMocks({
			total: 50,
			pending: 10,
			inProgress: 5,
			completed: 30,
			open: 15,
			closed: 35,
			thisMonth: 8,
		});

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

	it("excludes soft-deleted records from total count", async () => {
		mockRequireAdmin.mockResolvedValue({ admin: true });
		setupCountMocks({
			total: 10,
			pending: 0,
			inProgress: 0,
			completed: 0,
			open: 0,
			closed: 0,
			thisMonth: 0,
		});

		await getCustomizationStats();

		expect(mockPrisma.customizationRequest.count).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
		);
	});

	it("filters pending count by PENDING status", async () => {
		mockRequireAdmin.mockResolvedValue({ admin: true });
		setupCountMocks({
			total: 10,
			pending: 3,
			inProgress: 0,
			completed: 0,
			open: 0,
			closed: 0,
			thisMonth: 0,
		});

		await getCustomizationStats();

		const calls = mockPrisma.customizationRequest.count.mock.calls;
		const pendingCall = calls[1]![0];
		expect(pendingCall.where).toMatchObject({ status: "PENDING", deletedAt: null });
	});

	it("filters inProgress count by IN_PROGRESS status", async () => {
		mockRequireAdmin.mockResolvedValue({ admin: true });
		setupCountMocks({
			total: 10,
			pending: 0,
			inProgress: 4,
			completed: 0,
			open: 0,
			closed: 0,
			thisMonth: 0,
		});

		await getCustomizationStats();

		const calls = mockPrisma.customizationRequest.count.mock.calls;
		const inProgressCall = calls[2]![0];
		expect(inProgressCall.where).toMatchObject({ status: "IN_PROGRESS", deletedAt: null });
	});

	it("filters completed count by COMPLETED status", async () => {
		mockRequireAdmin.mockResolvedValue({ admin: true });
		setupCountMocks({
			total: 10,
			pending: 0,
			inProgress: 0,
			completed: 6,
			open: 0,
			closed: 0,
			thisMonth: 0,
		});

		await getCustomizationStats();

		const calls = mockPrisma.customizationRequest.count.mock.calls;
		const completedCall = calls[3]![0];
		expect(completedCall.where).toMatchObject({ status: "COMPLETED", deletedAt: null });
	});

	it("filters open count using OPEN_STATUSES array", async () => {
		mockRequireAdmin.mockResolvedValue({ admin: true });
		setupCountMocks({
			total: 10,
			pending: 0,
			inProgress: 0,
			completed: 0,
			open: 7,
			closed: 0,
			thisMonth: 0,
		});

		await getCustomizationStats();

		const calls = mockPrisma.customizationRequest.count.mock.calls;
		const openCall = calls[4]![0];
		expect(openCall.where).toMatchObject({
			status: { in: ["PENDING", "IN_PROGRESS"] },
			deletedAt: null,
		});
	});

	it("filters closed count using CLOSED_STATUSES array", async () => {
		mockRequireAdmin.mockResolvedValue({ admin: true });
		setupCountMocks({
			total: 10,
			pending: 0,
			inProgress: 0,
			completed: 0,
			open: 0,
			closed: 7,
			thisMonth: 0,
		});

		await getCustomizationStats();

		const calls = mockPrisma.customizationRequest.count.mock.calls;
		const closedCall = calls[5]![0];
		expect(closedCall.where).toMatchObject({
			status: { in: ["COMPLETED", "CANCELLED"] },
			deletedAt: null,
		});
	});

	it("filters thisMonth count using a start-of-month date", async () => {
		mockRequireAdmin.mockResolvedValue({ admin: true });
		setupCountMocks({
			total: 10,
			pending: 0,
			inProgress: 0,
			completed: 0,
			open: 0,
			closed: 0,
			thisMonth: 2,
		});

		await getCustomizationStats();

		const calls = mockPrisma.customizationRequest.count.mock.calls;
		const thisMonthCall = calls[6]![0];
		expect(thisMonthCall.where).toMatchObject({
			deletedAt: null,
			createdAt: { gte: expect.any(Date) },
		});

		const startOfMonth = thisMonthCall.where.createdAt.gte as Date;
		expect(startOfMonth.getDate()).toBe(1);
		expect(startOfMonth.getHours()).toBe(0);
		expect(startOfMonth.getMinutes()).toBe(0);
	});

	it("runs all 7 counts in a single Promise.all call", async () => {
		mockRequireAdmin.mockResolvedValue({ admin: true });
		setupCountMocks({
			total: 5,
			pending: 1,
			inProgress: 1,
			completed: 1,
			open: 2,
			closed: 3,
			thisMonth: 1,
		});

		await getCustomizationStats();

		expect(mockPrisma.customizationRequest.count).toHaveBeenCalledTimes(7);
	});

	it("returns empty stats on DB error without throwing", async () => {
		mockRequireAdmin.mockResolvedValue({ admin: true });
		mockPrisma.customizationRequest.count.mockRejectedValue(new Error("DB unavailable"));

		const result = await getCustomizationStats();

		expect(result).toEqual(EMPTY_STATS);
	});

	it("calls cacheLife with dashboard profile", async () => {
		mockRequireAdmin.mockResolvedValue({ admin: true });
		setupCountMocks({
			total: 0,
			pending: 0,
			inProgress: 0,
			completed: 0,
			open: 0,
			closed: 0,
			thisMonth: 0,
		});

		await getCustomizationStats();

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with stats tag", async () => {
		mockRequireAdmin.mockResolvedValue({ admin: true });
		setupCountMocks({
			total: 0,
			pending: 0,
			inProgress: 0,
			completed: 0,
			open: 0,
			closed: 0,
			thisMonth: 0,
		});

		await getCustomizationStats();

		expect(mockCacheTag).toHaveBeenCalledWith("customization-requests-stats");
	});

	it("does not call cache functions when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: "FORBIDDEN", message: "Non autorisé" } });

		await getCustomizationStats();

		expect(mockCacheLife).not.toHaveBeenCalled();
		expect(mockCacheTag).not.toHaveBeenCalled();
	});
});
