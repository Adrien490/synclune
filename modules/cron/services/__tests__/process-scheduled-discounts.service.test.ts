import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockUpdateTag } = vi.hoisted(() => ({
	mockPrisma: {
		discount: { updateMany: vi.fn() },
	},
	mockUpdateTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
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
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 0 }) // activation
			.mockResolvedValueOnce({ count: 0 }); // deactivation

		const result = await processScheduledDiscounts();

		expect(result).toEqual({ activated: 0, deactivated: 0 });
	});

	it("should not invalidate cache when no changes are made", async () => {
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 0 });

		await processScheduledDiscounts();

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should activate discounts whose start date has passed", async () => {
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 2 }) // 2 activated
			.mockResolvedValueOnce({ count: 0 });

		const result = await processScheduledDiscounts();

		// Verify activation query
		const activationCall = mockPrisma.discount.updateMany.mock.calls[0][0];
		expect(activationCall.where.isActive).toBe(false);
		expect(activationCall.where.startsAt.lte).toBeInstanceOf(Date);
		expect(activationCall.data.isActive).toBe(true);
		expect(result.activated).toBe(2);
	});

	it("should deactivate expired discounts", async () => {
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 3 }); // 3 deactivated

		const result = await processScheduledDiscounts();

		// Verify deactivation query
		const deactivationCall = mockPrisma.discount.updateMany.mock.calls[1][0];
		expect(deactivationCall.where.isActive).toBe(true);
		expect(deactivationCall.where.endsAt.lt).toBeInstanceOf(Date);
		expect(deactivationCall.data.isActive).toBe(false);
		expect(result.deactivated).toBe(3);
	});

	it("should invalidate cache when discounts are activated", async () => {
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 0 });

		await processScheduledDiscounts();

		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
	});

	it("should invalidate cache when discounts are deactivated", async () => {
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 0 })
			.mockResolvedValueOnce({ count: 2 });

		await processScheduledDiscounts();

		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
	});

	it("should handle both activation and deactivation in same run", async () => {
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 1 }) // 1 activated
			.mockResolvedValueOnce({ count: 2 }); // 2 deactivated

		const result = await processScheduledDiscounts();

		expect(result).toEqual({ activated: 1, deactivated: 2 });
		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
		expect(mockUpdateTag).toHaveBeenCalledTimes(1);
	});

	it("should handle discounts with null endsAt in activation query", async () => {
		mockPrisma.discount.updateMany
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 0 });

		await processScheduledDiscounts();

		// Activation query should include OR for null endsAt (no expiry) or future endsAt
		const activationCall = mockPrisma.discount.updateMany.mock.calls[0][0];
		expect(activationCall.where.OR).toEqual([
			{ endsAt: null },
			{ endsAt: { gte: expect.any(Date) } },
		]);
	});
});
