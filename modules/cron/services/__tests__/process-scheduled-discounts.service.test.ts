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
		mockPrisma.discount.findMany.mockResolvedValueOnce([]); // no candidates
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 0 }); // deactivation

		const result = await processScheduledDiscounts();

		expect(result).toEqual({ activated: 0, deactivated: 0 });
	});

	it("should not invalidate cache when no changes are made", async () => {
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 0 });

		await processScheduledDiscounts();

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should activate discounts whose start date has passed", async () => {
		const now = new Date("2026-02-09T12:00:00Z");
		const startsAt = new Date("2026-02-09T00:00:00Z");

		// Mock candidates where updatedAt <= startsAt (eligible for activation)
		mockPrisma.discount.findMany.mockResolvedValueOnce([
			{ id: "disc-1", startsAt, updatedAt: startsAt },
			{ id: "disc-2", startsAt, updatedAt: new Date("2026-02-08T23:00:00Z") },
		]);
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 2 }) // activation
			.mockResolvedValueOnce({ count: 0 }); // deactivation

		const result = await processScheduledDiscounts();

		// Verify findMany query
		const findCall = mockPrisma.discount.findMany.mock.calls[0][0];
		expect(findCall.where.isActive).toBe(false);
		expect(findCall.where.deletedAt).toBe(null);
		expect(findCall.where.startsAt.lte).toEqual(now);
		expect(findCall.where.OR).toEqual([
			{ endsAt: null },
			{ endsAt: { gte: now } },
		]);
		expect(findCall.select).toEqual({
			id: true,
			startsAt: true,
			updatedAt: true,
		});

		// Verify updateMany query
		const updateCall = mockPrisma.discount.updateMany.mock.calls[0][0];
		expect(updateCall.where.id.in).toEqual(["disc-1", "disc-2"]);
		expect(updateCall.data.isActive).toBe(true);

		expect(result.activated).toBe(2);
	});

	it("should skip discounts where updatedAt > startsAt (manually deactivated)", async () => {
		const startsAt = new Date("2026-02-09T00:00:00Z");
		const manuallyDeactivated = new Date("2026-02-09T10:00:00Z");

		// One eligible, one manually deactivated
		mockPrisma.discount.findMany.mockResolvedValueOnce([
			{ id: "disc-1", startsAt, updatedAt: startsAt }, // eligible
			{ id: "disc-2", startsAt, updatedAt: manuallyDeactivated }, // skipped
		]);
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 1 }) // only one activated
			.mockResolvedValueOnce({ count: 0 });

		const result = await processScheduledDiscounts();

		// Verify only disc-1 was updated
		const updateCall = mockPrisma.discount.updateMany.mock.calls[0][0];
		expect(updateCall.where.id.in).toEqual(["disc-1"]);
		expect(result.activated).toBe(1);
	});

	it("should filter out all candidates if all manually deactivated", async () => {
		const startsAt = new Date("2026-02-09T00:00:00Z");
		const manuallyDeactivated = new Date("2026-02-09T10:00:00Z");

		// All candidates have updatedAt > startsAt
		mockPrisma.discount.findMany.mockResolvedValueOnce([
			{ id: "disc-1", startsAt, updatedAt: manuallyDeactivated },
			{ id: "disc-2", startsAt, updatedAt: manuallyDeactivated },
		]);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 0 }); // deactivation only

		const result = await processScheduledDiscounts();

		// Verify no activation call was made (only deactivation)
		expect(mockPrisma.discount.updateMany).toHaveBeenCalledTimes(1);
		expect(result.activated).toBe(0);
	});

	it("should deactivate expired discounts", async () => {
		const now = new Date("2026-02-09T12:00:00Z");

		mockPrisma.discount.findMany.mockResolvedValueOnce([]);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 3 }); // 3 deactivated

		const result = await processScheduledDiscounts();

		// Verify deactivation query
		const deactivationCall = mockPrisma.discount.updateMany.mock.calls[0][0];
		expect(deactivationCall.where.isActive).toBe(true);
		expect(deactivationCall.where.deletedAt).toBe(null);
		expect(deactivationCall.where.endsAt.lt).toEqual(now);
		expect(deactivationCall.data.isActive).toBe(false);
		expect(result.deactivated).toBe(3);
	});

	it("should invalidate cache when discounts are activated", async () => {
		mockPrisma.discount.findMany.mockResolvedValueOnce([
			{
				id: "disc-1",
				startsAt: new Date("2026-02-09T00:00:00Z"),
				updatedAt: new Date("2026-02-09T00:00:00Z"),
			},
		]);
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 0 });

		await processScheduledDiscounts();

		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
	});

	it("should invalidate cache when discounts are deactivated", async () => {
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 2 });

		await processScheduledDiscounts();

		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
	});

	it("should handle both activation and deactivation in same run", async () => {
		mockPrisma.discount.findMany.mockResolvedValueOnce([
			{
				id: "disc-1",
				startsAt: new Date("2026-02-09T00:00:00Z"),
				updatedAt: new Date("2026-02-09T00:00:00Z"),
			},
		]);
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 1 }) // 1 activated
			.mockResolvedValueOnce({ count: 2 }); // 2 deactivated

		const result = await processScheduledDiscounts();

		expect(result).toEqual({ activated: 1, deactivated: 2 });
		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
		expect(mockUpdateTag).toHaveBeenCalledTimes(1);
	});

	it("should include deletedAt: null in findMany query", async () => {
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 0 });

		await processScheduledDiscounts();

		const findCall = mockPrisma.discount.findMany.mock.calls[0][0];
		expect(findCall.where.deletedAt).toBe(null);
	});

	it("should include deletedAt: null in deactivation query", async () => {
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 1 });

		await processScheduledDiscounts();

		const deactivationCall = mockPrisma.discount.updateMany.mock.calls[0][0];
		expect(deactivationCall.where.deletedAt).toBe(null);
	});

	it("should handle discounts with null endsAt in activation candidates", async () => {
		const now = new Date("2026-02-09T12:00:00Z");

		mockPrisma.discount.findMany.mockResolvedValueOnce([]);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 0 });

		await processScheduledDiscounts();

		// findMany query should include OR for null endsAt (no expiry) or future endsAt
		const findCall = mockPrisma.discount.findMany.mock.calls[0][0];
		expect(findCall.where.OR).toEqual([
			{ endsAt: null },
			{ endsAt: { gte: now } },
		]);
	});
});
