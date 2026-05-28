import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockRefreshCustomerRouting, mockLogger } = vi.hoisted(() => ({
	mockPrisma: { user: { findMany: vi.fn() } },
	mockRefreshCustomerRouting: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("@/modules/users/services/refresh-customer-routing.service", () => ({
	refreshCustomerRouting: mockRefreshCustomerRouting,
}));

import { refreshStaleDirectoryEntries } from "../refresh-stale-directory-entries.service";

describe("refreshStaleDirectoryEntries (OPS-AUDIT-002)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.user.findMany.mockResolvedValue([]);
	});

	it("returns zeros when no stale B2B/B2G users", async () => {
		const result = await refreshStaleDirectoryEntries();
		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 0 });
		expect(mockRefreshCustomerRouting).not.toHaveBeenCalled();
	});

	it("filters customerType IN (B2B,B2G) + companySiret NOT NULL + recent orders + stale or null directoryLastCheckedAt", async () => {
		await refreshStaleDirectoryEntries();
		const args = mockPrisma.user.findMany.mock.calls[0]?.[0];
		expect(args?.where).toMatchObject({
			customerType: { in: ["B2B", "B2G"] },
			companySiret: { not: null },
			deletedAt: null,
		});
		expect(args?.where?.OR).toEqual([
			{ directoryLastCheckedAt: null },
			{ directoryLastCheckedAt: { lt: expect.any(Date) } },
		]);
		const directoryCutoff = args?.where?.OR?.[1]?.directoryLastCheckedAt?.lt as Date;
		const expectedMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
		expect(Math.abs(directoryCutoff.getTime() - expectedMs)).toBeLessThan(2000);
	});

	it("scopes orders relation to last 90 days (anti-scan of dormant users)", async () => {
		await refreshStaleDirectoryEntries();
		const args = mockPrisma.user.findMany.mock.calls[0]?.[0];
		const recentOrderCutoff = args?.where?.orders?.some?.createdAt?.gte as Date;
		const expectedMs = Date.now() - 90 * 24 * 60 * 60 * 1000;
		expect(Math.abs(recentOrderCutoff.getTime() - expectedMs)).toBeLessThan(2000);
	});

	it("counts REFRESHED as processed", async () => {
		mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "user-1" }, { id: "user-2" }]);
		mockRefreshCustomerRouting
			.mockResolvedValueOnce({ status: "REFRESHED", platformId: "pf-1" })
			.mockResolvedValueOnce({ status: "REFRESHED", platformId: "pf-2" });

		const result = await refreshStaleDirectoryEntries();
		expect(result.processed).toBe(2);
		expect(result.errored).toBe(0);
		expect(result.skipped).toBe(0);
	});

	it("counts UNAVAILABLE as skipped (annuaire down, retry next run)", async () => {
		mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "user-1" }]);
		mockRefreshCustomerRouting.mockResolvedValueOnce({ status: "UNAVAILABLE", platformId: null });

		const result = await refreshStaleDirectoryEntries();
		expect(result.skipped).toBe(1);
		expect(result.processed).toBe(0);
	});

	it("counts CACHE_HIT / NOT_B2B / USER_NOT_FOUND as skipped (no work needed)", async () => {
		mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "u1" }, { id: "u2" }, { id: "u3" }]);
		mockRefreshCustomerRouting
			.mockResolvedValueOnce({ status: "CACHE_HIT" })
			.mockResolvedValueOnce({ status: "NOT_B2B" })
			.mockResolvedValueOnce({ status: "USER_NOT_FOUND" });

		const result = await refreshStaleDirectoryEntries();
		expect(result.skipped).toBe(3);
		expect(result.processed).toBe(0);
		expect(result.errored).toBe(0);
	});

	it("counts errored on throw and continues batch", async () => {
		mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "u1" }, { id: "u2" }]);
		mockRefreshCustomerRouting
			.mockRejectedValueOnce(new Error("network timeout"))
			.mockResolvedValueOnce({ status: "REFRESHED", platformId: "pf-2" });

		const result = await refreshStaleDirectoryEntries();
		expect(result.errored).toBe(1);
		expect(result.processed).toBe(1);
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("propagates hasMore=true when batch is saturated", async () => {
		const fullBatch = Array.from({ length: 25 }, (_, i) => ({ id: `u${i}` }));
		mockPrisma.user.findMany.mockResolvedValueOnce(fullBatch);
		mockRefreshCustomerRouting.mockResolvedValue({ status: "REFRESHED", platformId: "x" });

		const result = await refreshStaleDirectoryEntries();
		expect(result.hasMore).toBe(true);
	});
});
