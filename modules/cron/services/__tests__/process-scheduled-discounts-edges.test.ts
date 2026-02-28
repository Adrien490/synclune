import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

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
	DISCOUNT_CACHE_TAGS: { LIST: "discounts-list" },
}));

vi.mock("@/modules/cron/constants/limits", () => ({
	BATCH_DEADLINE_MS: 50_000,
	CLEANUP_DELETE_LIMIT: 1_000,
}));

import { processScheduledDiscounts } from "../process-scheduled-discounts.service";

// ============================================================================
// processScheduledDiscounts — edge cases
// ============================================================================

describe("processScheduledDiscounts — edge cases", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
	});

	it("should activate discount whose startsAt is in the past and endsAt is future", async () => {
		const candidate = {
			id: "disc-1",
			startsAt: new Date("2026-06-01"),
			// updatedAt <= startsAt means NOT manually deactivated
			updatedAt: new Date("2026-05-30"),
		};

		// First findMany: activation candidates
		mockPrisma.discount.findMany.mockResolvedValueOnce([candidate]);
		// updateMany for activation
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 1 });
		// Second findMany: deactivation candidates
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);

		const result = await processScheduledDiscounts();

		expect(result.activated).toBe(1);
		expect(result.deactivated).toBe(0);
		expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["disc-1"] } },
			data: { isActive: true },
		});
	});

	it("should deactivate discount whose endsAt has passed", async () => {
		// No activation candidates
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);
		// Deactivation candidates: expired discount
		mockPrisma.discount.findMany.mockResolvedValueOnce([{ id: "disc-2" }]);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 1 });

		const result = await processScheduledDiscounts();

		expect(result.activated).toBe(0);
		expect(result.deactivated).toBe(1);
		expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["disc-2"] } },
			data: { isActive: false },
		});
	});

	it("should handle zero eligible discounts gracefully", async () => {
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);

		const result = await processScheduledDiscounts();

		expect(result).toEqual({ activated: 0, deactivated: 0, hasMore: false });
		expect(mockPrisma.discount.updateMany).not.toHaveBeenCalled();
		// No cache invalidation when nothing changed
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should NOT reactivate manually deactivated discounts (updatedAt > startsAt)", async () => {
		const manuallyDeactivated = {
			id: "disc-manual",
			startsAt: new Date("2026-06-01"),
			// updatedAt > startsAt = admin manually deactivated this after startsAt
			updatedAt: new Date("2026-06-10"),
		};

		const autoCandidate = {
			id: "disc-auto",
			startsAt: new Date("2026-06-14"),
			updatedAt: new Date("2026-06-13"),
		};

		mockPrisma.discount.findMany.mockResolvedValueOnce([manuallyDeactivated, autoCandidate]);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 1 });
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);

		const result = await processScheduledDiscounts();

		// Only autoCandidate should be activated; manuallyDeactivated is filtered out
		expect(result.activated).toBe(1);
		expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["disc-auto"] } },
			data: { isActive: true },
		});
	});

	it("should activate and deactivate discounts in the same run", async () => {
		const toActivate = {
			id: "disc-activate",
			startsAt: new Date("2026-06-10"),
			updatedAt: new Date("2026-06-09"),
		};

		mockPrisma.discount.findMany.mockResolvedValueOnce([toActivate]);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 1 });
		mockPrisma.discount.findMany.mockResolvedValueOnce([{ id: "disc-deactivate" }]);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 1 });

		const result = await processScheduledDiscounts();

		expect(result).toEqual({ activated: 1, deactivated: 1, hasMore: false });
		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
	});

	it("should invalidate cache only when changes were made", async () => {
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);

		await processScheduledDiscounts();

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should report hasMore=true when activation candidates hit batch limit", async () => {
		const candidates = Array.from({ length: 1000 }, (_, i) => ({
			id: `disc-${i}`,
			startsAt: new Date("2026-06-10"),
			updatedAt: new Date("2026-06-09"),
		}));

		mockPrisma.discount.findMany.mockResolvedValueOnce(candidates);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 1000 });
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);

		const result = await processScheduledDiscounts();

		expect(result.hasMore).toBe(true);
	});

	it("should report hasMore=true when deactivation candidates hit batch limit", async () => {
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);
		const expired = Array.from({ length: 1000 }, (_, i) => ({ id: `disc-exp-${i}` }));
		mockPrisma.discount.findMany.mockResolvedValueOnce(expired);
		mockPrisma.discount.updateMany.mockResolvedValueOnce({ count: 1000 });

		const result = await processScheduledDiscounts();

		expect(result.hasMore).toBe(true);
	});

	it("should skip all candidates if all are manually deactivated", async () => {
		const allManual = [
			{
				id: "disc-1",
				startsAt: new Date("2026-06-01"),
				updatedAt: new Date("2026-06-05"),
			},
			{
				id: "disc-2",
				startsAt: new Date("2026-06-01"),
				updatedAt: new Date("2026-06-10"),
			},
		];

		mockPrisma.discount.findMany.mockResolvedValueOnce(allManual);
		mockPrisma.discount.findMany.mockResolvedValueOnce([]);

		const result = await processScheduledDiscounts();

		expect(result.activated).toBe(0);
		expect(mockPrisma.discount.updateMany).not.toHaveBeenCalled();
	});
});
