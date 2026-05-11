import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockUpdateTag, mockGetInvalidationTags, mockLogger } = vi.hoisted(() => ({
	mockPrisma: { storeSettings: { updateMany: vi.fn() } },
	mockUpdateTag: vi.fn(),
	mockGetInvalidationTags: vi.fn(),
	mockLogger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("../../constants/cache", () => ({
	STORE_SETTINGS_SINGLETON_ID: "store-settings-singleton",
	getStoreSettingsInvalidationTags: mockGetInvalidationTags,
}));

import { autoReopenIfDue } from "../auto-reopen.service";

// ============================================================================
// TESTS
// ============================================================================

const SINGLETON_ID = "store-settings-singleton";

describe("autoReopenIfDue", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockGetInvalidationTags.mockReturnValue(["store-status", "store-settings"]);
	});

	it("no-ops when store is open (updateMany matches 0 rows)", async () => {
		mockPrisma.storeSettings.updateMany.mockResolvedValue({ count: 0 });

		const result = await autoReopenIfDue();

		expect(result.reopened).toBe(false);
		expect(result.processed).toBe(0);
		expect(result.skipped).toBe(1);
		expect(result.errored).toBe(0);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("no-ops when store is closed but reopensAt is in the future", async () => {
		// Even if a future reopensAt is set, updateMany WHERE clause filters it out.
		mockPrisma.storeSettings.updateMany.mockResolvedValue({ count: 0 });

		const result = await autoReopenIfDue(new Date("2026-05-11T10:00:00Z"));

		expect(result.reopened).toBe(false);
		expect(mockPrisma.storeSettings.updateMany).toHaveBeenCalledWith({
			where: {
				id: SINGLETON_ID,
				isClosed: true,
				reopensAt: { lte: new Date("2026-05-11T10:00:00Z"), not: null },
			},
			data: {
				isClosed: false,
				closureMessage: null,
				closedAt: null,
				closedBy: null,
				reopensAt: null,
			},
		});
	});

	it("reopens store atomically when reopensAt has passed and invalidates cache tags", async () => {
		mockPrisma.storeSettings.updateMany.mockResolvedValue({ count: 1 });
		const now = new Date("2026-05-11T10:00:00Z");

		const result = await autoReopenIfDue(now);

		expect(result.reopened).toBe(true);
		expect(result.processed).toBe(1);
		expect(result.errored).toBe(0);
		expect(result.skipped).toBe(0);
		expect(mockUpdateTag).toHaveBeenCalledWith("store-status");
		expect(mockUpdateTag).toHaveBeenCalledWith("store-settings");
		expect(mockLogger.info).toHaveBeenCalledWith(
			expect.stringContaining("auto-reopened"),
			expect.objectContaining({ cronJob: "reopen-store" }),
		);
	});

	it("returns errored=1 and logs when DB throws", async () => {
		mockPrisma.storeSettings.updateMany.mockRejectedValue(new Error("DB crash"));

		const result = await autoReopenIfDue();

		expect(result.reopened).toBe(false);
		expect(result.errored).toBe(1);
		expect(result.processed).toBe(0);
		expect(mockLogger.error).toHaveBeenCalledWith(
			"auto-reopen failed",
			expect.any(Error),
			expect.objectContaining({ cronJob: "reopen-store" }),
		);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("includes durationMs in result", async () => {
		mockPrisma.storeSettings.updateMany.mockResolvedValue({ count: 1 });
		const result = await autoReopenIfDue();
		expect(typeof result.durationMs).toBe("number");
		expect(result.durationMs).toBeGreaterThanOrEqual(0);
	});
});
