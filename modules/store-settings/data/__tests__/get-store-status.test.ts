import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockLogger, mockCacheStoreStatus } = vi.hoisted(() => ({
	mockPrisma: { storeSettings: { findUnique: vi.fn() } },
	mockLogger: { error: vi.fn() },
	mockCacheStoreStatus: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../../constants/cache", () => ({
	STORE_SETTINGS_SINGLETON_ID: "store-settings-singleton",
	cacheStoreStatus: mockCacheStoreStatus,
}));

import { getStoreStatus } from "../get-store-status";

// ============================================================================
// HELPERS
// ============================================================================

const OPEN_STATUS = { isClosed: false, closureMessage: null, reopensAt: null };
const CLOSED_STATUS = {
	isClosed: true,
	closureMessage: "Maintenance en cours",
	reopensAt: new Date("2026-04-01T10:00:00Z"),
};

// ============================================================================
// TESTS
// ============================================================================

describe("getStoreStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPrisma.storeSettings.findUnique.mockResolvedValue(OPEN_STATUS);
	});

	// ─── Cache ────────────────────────────────────────────────────────────

	it("configures cache via cacheStoreStatus", async () => {
		await getStoreStatus();
		expect(mockCacheStoreStatus).toHaveBeenCalled();
	});

	// ─── Query ────────────────────────────────────────────────────────────

	it("queries singleton by ID with correct select", async () => {
		await getStoreStatus();
		expect(mockPrisma.storeSettings.findUnique).toHaveBeenCalledWith({
			where: { id: "store-settings-singleton" },
			select: {
				isClosed: true,
				closureMessage: true,
				reopensAt: true,
			},
		});
	});

	// ─── Success ──────────────────────────────────────────────────────────

	it("returns open status when store is open", async () => {
		const result = await getStoreStatus();
		expect(result).toEqual(OPEN_STATUS);
	});

	it("returns closed status with message and reopensAt", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(CLOSED_STATUS);
		const result = await getStoreStatus();
		expect(result).toEqual(CLOSED_STATUS);
	});

	// ─── Fail-open ────────────────────────────────────────────────────────

	it("returns open status when singleton does not exist (fail-open)", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(null);
		const result = await getStoreStatus();
		expect(result).toEqual({ isClosed: false, closureMessage: null, reopensAt: null });
	});

	it("returns open status on database error (fail-open)", async () => {
		mockPrisma.storeSettings.findUnique.mockRejectedValue(new Error("Connection lost"));
		const result = await getStoreStatus();
		expect(result).toEqual({ isClosed: false, closureMessage: null, reopensAt: null });
	});

	it("logs error on database failure", async () => {
		const error = new Error("Connection lost");
		mockPrisma.storeSettings.findUnique.mockRejectedValue(error);
		await getStoreStatus();
		expect(mockLogger.error).toHaveBeenCalledWith("Failed to fetch store status", error, {
			service: "getStoreStatus",
		});
	});

	it("does not log error when singleton is simply missing", async () => {
		mockPrisma.storeSettings.findUnique.mockResolvedValue(null);
		await getStoreStatus();
		expect(mockLogger.error).not.toHaveBeenCalled();
	});
});
