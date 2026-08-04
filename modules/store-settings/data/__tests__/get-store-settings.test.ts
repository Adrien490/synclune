import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockLogger, mockCacheStoreSettings } = vi.hoisted(() => ({
	mockPrisma: { storeSettings: { findUnique: vi.fn() } },
	mockLogger: { error: vi.fn() },
	mockCacheStoreSettings: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../../constants/cache", () => ({
	STORE_SETTINGS_SINGLETON_ID: "store-settings-singleton",
	cacheStoreSettings: mockCacheStoreSettings,
}));

import { getStoreSettings } from "../get-store-settings";

// ============================================================================
// HELPERS
// ============================================================================

const MOCK_SETTINGS = {
	id: "store-settings-singleton",
	isClosed: false,
	closureMessage: null,
	reopensAt: null,
	closedAt: null,
	closedBy: null,
	updatedAt: new Date("2026-03-14T10:00:00Z"),
};

// ============================================================================
// TESTS
// ============================================================================

describe("getStoreSettings", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPrisma.storeSettings.findUnique.mockResolvedValue(MOCK_SETTINGS);
	});

	// ─── Cache ────────────────────────────────────────────────────────────

	it("configures cache via cacheStoreSettings", async () => {
		await getStoreSettings();
		expect(mockCacheStoreSettings).toHaveBeenCalled();
	});

	// ─── Query ────────────────────────────────────────────────────────────

	it("queries singleton by ID with admin-level select", async () => {
		await getStoreSettings();
		expect(mockPrisma.storeSettings.findUnique).toHaveBeenCalledWith({
			where: { id: "store-settings-singleton" },
			select: {
				id: true,
				isClosed: true,
				closureMessage: true,
				reopensAt: true,
				closedAt: true,
				closedBy: true,
				updatedAt: true,
			},
		});
	});

	// ─── Success ──────────────────────────────────────────────────────────

	it("returns full settings for admin", async () => {
		const result = await getStoreSettings();
		expect(result).toEqual(MOCK_SETTINGS);
	});

	it("returns closed settings with all closure fields", async () => {
		const closedSettings = {
			...MOCK_SETTINGS,
			isClosed: true,
			closureMessage: "Maintenance",
			closedAt: new Date("2026-03-14T08:00:00Z"),
			closedBy: "Admin",
			reopensAt: new Date("2026-03-15T10:00:00Z"),
		};
		mockPrisma.storeSettings.findUnique.mockResolvedValue(closedSettings);
		const result = await getStoreSettings();
		expect(result).toEqual(closedSettings);
	});

	// ─── Error handling ───────────────────────────────────────────────────

	it("returns null when singleton does not exist", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(null);
		const result = await getStoreSettings();
		expect(result).toBeNull();
	});

	it("returns null on database error", async () => {
		mockPrisma.storeSettings.findUnique.mockRejectedValue(new Error("DB error"));
		const result = await getStoreSettings();
		expect(result).toBeNull();
	});

	it("logs error on database failure", async () => {
		const error = new Error("Connection refused");
		mockPrisma.storeSettings.findUnique.mockRejectedValue(error);
		await getStoreSettings();
		expect(mockLogger.error).toHaveBeenCalledWith("Failed to fetch store settings", error, {
			service: "getStoreSettings",
		});
	});
});
