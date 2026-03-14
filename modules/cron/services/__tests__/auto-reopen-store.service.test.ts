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

import { autoReopenStore } from "../auto-reopen-store.service";

describe("autoReopenStore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));
	});

	it("should return reopened: false when store settings not found", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce(null);

		const result = await autoReopenStore();

		expect(result).toEqual({ reopened: false });
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should return reopened: false when store is not closed", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: false,
			reopensAt: null,
		});

		const result = await autoReopenStore();

		expect(result).toEqual({ reopened: false });
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});

	it("should return reopened: false when store is closed but has no reopensAt", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: true,
			reopensAt: null,
		});

		const result = await autoReopenStore();

		expect(result).toEqual({ reopened: false });
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});

	it("should return reopened: false when reopensAt is in the future", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: true,
			reopensAt: new Date("2026-03-15T12:00:00Z"),
		});

		const result = await autoReopenStore();

		expect(result).toEqual({ reopened: false });
		expect(mockPrisma.storeSettings.update).not.toHaveBeenCalled();
	});

	it("should reopen store when reopensAt is in the past", async () => {
		const reopensAt = new Date("2026-03-14T10:00:00Z");
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: true,
			reopensAt,
		});
		mockPrisma.storeSettings.update.mockResolvedValueOnce({});

		const result = await autoReopenStore();

		expect(result).toEqual({ reopened: true });
		expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith({
			where: { id: "store-settings-singleton" },
			data: {
				isClosed: false,
				closureMessage: null,
				reopensAt: null,
				closedAt: null,
				closedBy: null,
			},
		});
	});

	it("should reopen store when reopensAt is exactly now", async () => {
		const reopensAt = new Date("2026-03-14T12:00:00Z");
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: true,
			reopensAt,
		});
		mockPrisma.storeSettings.update.mockResolvedValueOnce({});

		const result = await autoReopenStore();

		expect(result).toEqual({ reopened: true });
	});

	it("should invalidate all store settings cache tags on reopen", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: true,
			reopensAt: new Date("2026-03-14T10:00:00Z"),
		});
		mockPrisma.storeSettings.update.mockResolvedValueOnce({});

		await autoReopenStore();

		expect(mockUpdateTag).toHaveBeenCalledWith("store-status");
		expect(mockUpdateTag).toHaveBeenCalledWith("store-settings");
		expect(mockUpdateTag).toHaveBeenCalledTimes(2);
	});

	it("should not invalidate cache when store is not reopened", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: false,
			reopensAt: null,
		});

		await autoReopenStore();

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should log audit with store.auto-reopen action on reopen", async () => {
		const reopensAt = new Date("2026-03-14T10:00:00Z");
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: true,
			reopensAt,
		});
		mockPrisma.storeSettings.update.mockResolvedValueOnce({});

		await autoReopenStore();

		expect(mockLogAudit).toHaveBeenCalledWith({
			adminId: "system",
			adminName: "Cron auto-reopen",
			action: "store.auto-reopen",
			targetType: "storeSettings",
			targetId: "store-settings-singleton",
			metadata: { reopensAt: reopensAt.toISOString() },
		});
	});

	it("should not log audit when store is not reopened", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce({
			isClosed: false,
			reopensAt: null,
		});

		await autoReopenStore();

		expect(mockLogAudit).not.toHaveBeenCalled();
	});

	it("should query the singleton store settings", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValueOnce(null);

		await autoReopenStore();

		expect(mockPrisma.storeSettings.findUnique).toHaveBeenCalledWith({
			where: { id: "store-settings-singleton" },
			select: { isClosed: true, reopensAt: true },
		});
	});
});
