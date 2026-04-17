import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockUpdateTag, mockLogAudit } = vi.hoisted(() => ({
	mockPrisma: {
		storeSettings: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
	},
	mockUpdateTag: vi.fn(),
	mockLogAudit: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));

vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: mockLogAudit,
}));

vi.mock("@/modules/store-settings/constants/cache", () => ({
	STORE_SETTINGS_SINGLETON_ID: "store-settings-singleton",
	getStoreSettingsInvalidationTags: () => ["store-status", "store-settings"],
}));

import { processScheduledClosure } from "../process-scheduled-closure.service";

describe("processScheduledClosure", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-01T12:00:00Z"));
	});

	// ─── Skip paths ────────────────────────────────────────────────────────

	it("returns closed: false when store settings not found", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce(null);

		const result = await processScheduledClosure();

		expect(result).toEqual({ closed: false });
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("returns closed: false when store is already closed", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: true,
			scheduledCloseAt: new Date("2026-07-01T10:00:00Z"),
			closureMessage: "X",
			reopensAt: null,
		});

		const result = await processScheduledClosure();

		expect(result).toEqual({ closed: false });
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});

	it("returns closed: false when no scheduledCloseAt is set", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: false,
			scheduledCloseAt: null,
			closureMessage: null,
			reopensAt: null,
		});

		const result = await processScheduledClosure();

		expect(result).toEqual({ closed: false });
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});

	it("returns closed: false when scheduledCloseAt is in the future", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: false,
			scheduledCloseAt: new Date("2026-07-02T12:00:00Z"),
			closureMessage: "Future",
			reopensAt: null,
		});

		const result = await processScheduledClosure();

		expect(result).toEqual({ closed: false });
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});

	// ─── Closure path ──────────────────────────────────────────────────────

	it("closes store when scheduledCloseAt is in the past", async () => {
		const scheduledCloseAt = new Date("2026-07-01T10:00:00Z");
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: false,
			scheduledCloseAt,
			closureMessage: "Vacances",
			reopensAt: null,
		});
		mockPrisma.storeSettings.update.mockResolvedValueOnce({});

		const result = await processScheduledClosure();

		expect(result).toEqual({ closed: true });
		expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith({
			where: { id: "store-settings-singleton" },
			data: {
				isClosed: true,
				closedAt: new Date("2026-07-01T12:00:00Z"),
				closedBy: "Cron auto-close",
				scheduledCloseAt: null,
			},
		});
	});

	it("closes store when scheduledCloseAt is exactly now", async () => {
		const scheduledCloseAt = new Date("2026-07-01T12:00:00Z");
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: false,
			scheduledCloseAt,
			closureMessage: "Maintenance",
			reopensAt: null,
		});
		mockPrisma.storeSettings.update.mockResolvedValueOnce({});

		const result = await processScheduledClosure();

		expect(result).toEqual({ closed: true });
	});

	// ─── Cache + audit ─────────────────────────────────────────────────────

	it("invalidates all store settings cache tags on closure", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: false,
			scheduledCloseAt: new Date("2026-07-01T10:00:00Z"),
			closureMessage: "Vacances",
			reopensAt: null,
		});
		mockPrisma.storeSettings.update.mockResolvedValueOnce({});

		await processScheduledClosure();

		expect(mockUpdateTag).toHaveBeenCalledWith("store-status");
		expect(mockUpdateTag).toHaveBeenCalledWith("store-settings");
		expect(mockUpdateTag).toHaveBeenCalledTimes(2);
	});

	it("does not invalidate cache when store is not closed", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: false,
			scheduledCloseAt: null,
			closureMessage: null,
			reopensAt: null,
		});

		await processScheduledClosure();

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("logs audit with store.auto-close action and full metadata", async () => {
		const scheduledCloseAt = new Date("2026-07-01T10:00:00Z");
		const reopensAt = new Date("2026-07-15T10:00:00Z");
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: false,
			scheduledCloseAt,
			closureMessage: "Vacances",
			reopensAt,
		});
		mockPrisma.storeSettings.update.mockResolvedValueOnce({});

		await processScheduledClosure();

		expect(mockLogAudit).toHaveBeenCalledWith({
			adminId: "system",
			adminName: "Cron auto-close",
			action: "store.auto-close",
			targetType: "storeSettings",
			targetId: "store-settings-singleton",
			metadata: {
				scheduledCloseAt: scheduledCloseAt.toISOString(),
				closureMessage: "Vacances",
				reopensAt: reopensAt.toISOString(),
			},
		});
	});

	it("encodes null reopensAt in audit metadata when unset", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: false,
			scheduledCloseAt: new Date("2026-07-01T10:00:00Z"),
			closureMessage: "Vacances",
			reopensAt: null,
		});
		mockPrisma.storeSettings.update.mockResolvedValueOnce({});

		await processScheduledClosure();

		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({ reopensAt: null }),
			}),
		);
	});

	it("does not log audit when store is not closed", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: false,
			scheduledCloseAt: null,
			closureMessage: null,
			reopensAt: null,
		});

		await processScheduledClosure();

		expect(mockLogAudit).not.toHaveBeenCalled();
	});

	it("queries the singleton with required fields", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce(null);

		await processScheduledClosure();

		expect(mockPrisma.storeSettings.findUnique).toHaveBeenCalledWith({
			where: { id: "store-settings-singleton" },
			select: {
				isClosed: true,
				scheduledCloseAt: true,
				closureMessage: true,
				reopensAt: true,
			},
		});
	});
});
