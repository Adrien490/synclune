import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockUpdateTag } = vi.hoisted(() => ({
	mockPrisma: {
		discount: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
	},
	mockUpdateTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/modules/discounts/constants/cache", () => ({
	DISCOUNT_CACHE_TAGS: {
		LIST: "discounts-list",
		DETAIL: (id: string) => `discount-${id}`,
		USAGE: (id: string) => `discount-usage-${id}`,
	},
}));

import { processScheduledDiscounts } from "../process-scheduled-discounts.service";

describe("processScheduledDiscounts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-09T12:00:00Z"));
	});

	it("should return zero counts when no discounts need changes", async () => {
		mockPrisma.discount.findMany
			.mockResolvedValueOnce([]) // activation candidates
			.mockResolvedValueOnce([]); // deactivation candidates

		const result = await processScheduledDiscounts();

		expect(result).toEqual({ activated: 0, deactivated: 0, hasMore: false });
	});

	it("should not invalidate cache when no changes are made", async () => {
		mockPrisma.discount.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

		await processScheduledDiscounts();

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should activate discounts whose start date has passed", async () => {
		const now = new Date("2026-02-09T12:00:00Z");

		// DB returns only eligible candidates (manuallyDeactivated: false already filtered)
		mockPrisma.discount.findMany
			.mockResolvedValueOnce([{ id: "disc-1" }, { id: "disc-2" }])
			.mockResolvedValueOnce([]); // deactivation candidates
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 2 }); // activation

		const result = await processScheduledDiscounts();

		// Verify findMany WHERE clause includes manuallyDeactivated: false (DB-level filter)
		const findCall = mockPrisma.discount.findMany.mock.calls[0]![0];
		expect(findCall.where.isActive).toBe(false);
		expect(findCall.where.manuallyDeactivated).toBe(false);
		expect(findCall.where.deletedAt).toBe(null);
		expect(findCall.where.startsAt.lte).toEqual(now);
		expect(findCall.where.OR).toEqual([{ endsAt: null }, { endsAt: { gte: now } }]);
		expect(findCall.select).toEqual({ id: true });
		expect(findCall.take).toBe(1000);

		// Verify updateMany includes manuallyDeactivated: false reset
		const updateCall = mockPrisma.discount.updateMany.mock.calls[0]![0];
		expect(updateCall.where.id.in).toEqual(["disc-1", "disc-2"]);
		expect(updateCall.data.isActive).toBe(true);
		expect(updateCall.data.manuallyDeactivated).toBe(false);

		expect(result.activated).toBe(2);
	});

	it("should skip manually deactivated discounts via DB-level WHERE clause", async () => {
		// DB filters out manuallyDeactivated=true entries; returns only 1 eligible
		mockPrisma.discount.findMany
			.mockResolvedValueOnce([{ id: "disc-1" }]) // disc-2 filtered by DB
			.mockResolvedValueOnce([]); // deactivation candidates
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 1 });

		const result = await processScheduledDiscounts();

		// manuallyDeactivated: false must be in the WHERE clause
		const findCall = mockPrisma.discount.findMany.mock.calls[0]![0];
		expect(findCall.where.manuallyDeactivated).toBe(false);

		const updateCall = mockPrisma.discount.updateMany.mock.calls[0]![0];
		expect(updateCall.where.id.in).toEqual(["disc-1"]);
		expect(result.activated).toBe(1);
	});

	it("should not call updateMany when DB returns no activation candidates", async () => {
		// DB returns empty (all discounts have manuallyDeactivated=true or none match)
		mockPrisma.discount.findMany
			.mockResolvedValueOnce([]) // no eligible candidates
			.mockResolvedValueOnce([]); // deactivation candidates

		const result = await processScheduledDiscounts();

		expect(mockPrisma.discount.updateMany).not.toHaveBeenCalled();
		expect(result.activated).toBe(0);
	});

	it("should deactivate expired discounts", async () => {
		const now = new Date("2026-02-09T12:00:00Z");

		mockPrisma.discount.findMany
			.mockResolvedValueOnce([]) // activation candidates
			.mockResolvedValueOnce([{ id: "exp-1" }, { id: "exp-2" }, { id: "exp-3" }]); // deactivation candidates
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 3 }); // deactivation

		const result = await processScheduledDiscounts();

		// Verify deactivation findMany query
		const deactivationFindCall = mockPrisma.discount.findMany.mock.calls[1]![0];
		expect(deactivationFindCall.where.isActive).toBe(true);
		expect(deactivationFindCall.where.deletedAt).toBe(null);
		expect(deactivationFindCall.where.endsAt.lt).toEqual(now);
		expect(deactivationFindCall.take).toBe(1000);

		// Verify deactivation updateMany query
		const deactivationCall = mockPrisma.discount.updateMany.mock.calls[0]![0];
		expect(deactivationCall.where.id.in).toEqual(["exp-1", "exp-2", "exp-3"]);
		expect(deactivationCall.data.isActive).toBe(false);
		expect(result.deactivated).toBe(3);
	});

	it("should invalidate cache when discounts are activated", async () => {
		mockPrisma.discount.findMany
			.mockResolvedValueOnce([{ id: "disc-1" }])
			.mockResolvedValueOnce([]); // deactivation candidates
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 1 });

		await processScheduledDiscounts();

		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
	});

	it("should invalidate cache when discounts are deactivated", async () => {
		mockPrisma.discount.findMany
			.mockResolvedValueOnce([]) // activation candidates
			.mockResolvedValueOnce([{ id: "exp-1" }, { id: "exp-2" }]); // deactivation candidates
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 2 });

		await processScheduledDiscounts();

		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
	});

	it("should handle both activation and deactivation in same run", async () => {
		mockPrisma.discount.findMany
			.mockResolvedValueOnce([{ id: "disc-1" }])
			.mockResolvedValueOnce([{ id: "exp-1" }, { id: "exp-2" }]); // deactivation candidates
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 1 }) // 1 activated
			.mockResolvedValueOnce({ count: 2 }); // 2 deactivated

		const result = await processScheduledDiscounts();

		expect(result).toEqual({ activated: 1, deactivated: 2, hasMore: false });
		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
		expect(mockUpdateTag).toHaveBeenCalledTimes(1);
	});

	it("should include deletedAt: null in findMany query", async () => {
		mockPrisma.discount.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

		await processScheduledDiscounts();

		const findCall = mockPrisma.discount.findMany.mock.calls[0]![0];
		expect(findCall.where.deletedAt).toBe(null);
	});

	it("should include deletedAt: null in deactivation findMany query", async () => {
		mockPrisma.discount.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

		await processScheduledDiscounts();

		const deactivationFindCall = mockPrisma.discount.findMany.mock.calls[1]![0];
		expect(deactivationFindCall.where.deletedAt).toBe(null);
	});

	it("should handle discounts with null endsAt in activation candidates", async () => {
		const now = new Date("2026-02-09T12:00:00Z");

		mockPrisma.discount.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

		await processScheduledDiscounts();

		// findMany query should include OR for null endsAt (no expiry) or future endsAt
		const findCall = mockPrisma.discount.findMany.mock.calls[0]![0];
		expect(findCall.where.OR).toEqual([{ endsAt: null }, { endsAt: { gte: now } }]);
	});

	it("should use CLEANUP_DELETE_LIMIT (take) on both findMany queries", async () => {
		mockPrisma.discount.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

		await processScheduledDiscounts();

		expect(mockPrisma.discount.findMany.mock.calls[0]![0].take).toBe(1000);
		expect(mockPrisma.discount.findMany.mock.calls[1]![0].take).toBe(1000);
	});

	it("should return hasMore true when activation candidates hit the limit", async () => {
		const candidates = Array.from({ length: 1000 }, (_, i) => ({ id: `disc-${i}` }));
		mockPrisma.discount.findMany.mockResolvedValueOnce(candidates).mockResolvedValueOnce([]);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 1000 });

		const result = await processScheduledDiscounts();

		expect(result.hasMore).toBe(true);
	});

	it("should return hasMore true when deactivation candidates hit the limit", async () => {
		const expired = Array.from({ length: 1000 }, (_, i) => ({
			id: `exp-${i}`,
		}));
		mockPrisma.discount.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(expired);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 1000 });

		const result = await processScheduledDiscounts();

		expect(result.hasMore).toBe(true);
	});

	it("should return hasMore false when both are under limit", async () => {
		mockPrisma.discount.findMany
			.mockResolvedValueOnce([
				{
					id: "disc-1",
					startsAt: new Date("2026-02-09T00:00:00Z"),
					updatedAt: new Date("2026-02-09T00:00:00Z"),
				},
			])
			.mockResolvedValueOnce([{ id: "exp-1" }]);
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 1 });

		const result = await processScheduledDiscounts();

		expect(result.hasMore).toBe(false);
	});
});
