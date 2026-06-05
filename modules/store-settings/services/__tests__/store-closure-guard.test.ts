import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetStoreStatus, mockOrdersFlag } = vi.hoisted(() => ({
	mockGetStoreStatus: vi.fn(),
	// Default: orders open (operational). The pre-launch pause gate is tested explicitly below.
	mockOrdersFlag: { available: true },
}));

vi.mock("../../data/get-store-status", () => ({
	getStoreStatus: mockGetStoreStatus,
}));

vi.mock("@/shared/constants/orders-availability", () => ({
	get ORDERS_AVAILABLE() {
		return mockOrdersFlag.available;
	},
	ORDERS_PAUSED_SHORT_MESSAGE: "Les commandes ne sont pas encore ouvertes.",
}));

import { assertStoreOpen } from "../store-closure-guard";

// ============================================================================
// TESTS
// ============================================================================

describe("assertStoreOpen", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockOrdersFlag.available = true;
	});

	// ─── Pré-lancement : commandes en pause ───────────────────────────────

	it("returns closed (pause message) when ORDERS_AVAILABLE is false, before consulting store status", async () => {
		mockOrdersFlag.available = false;
		const result = await assertStoreOpen();
		expect(result).toEqual({
			closed: true,
			message: "Les commandes ne sont pas encore ouvertes.",
		});
		// Short-circuits: store status is irrelevant while orders are paused.
		expect(mockGetStoreStatus).not.toHaveBeenCalled();
	});

	// ─── Store open ───────────────────────────────────────────────────────

	it("returns null when store is open", async () => {
		mockGetStoreStatus.mockResolvedValue({
			isClosed: false,
			closureMessage: null,
			reopensAt: null,
		});
		const result = await assertStoreOpen();
		expect(result).toBeNull();
	});

	// ─── Store closed ─────────────────────────────────────────────────────

	it("returns closed result with message when store is closed", async () => {
		mockGetStoreStatus.mockResolvedValue({
			isClosed: true,
			closureMessage: "En maintenance",
			reopensAt: null,
		});
		const result = await assertStoreOpen();
		expect(result).toEqual({
			closed: true,
			message: "En maintenance",
		});
	});

	it("uses default message when closureMessage is null", async () => {
		mockGetStoreStatus.mockResolvedValue({
			isClosed: true,
			closureMessage: null,
			reopensAt: null,
		});
		const result = await assertStoreOpen();
		expect(result).toEqual({
			closed: true,
			message: "La boutique est temporairement fermée.",
		});
	});

	it("always returns closed: true when store is closed", async () => {
		mockGetStoreStatus.mockResolvedValue({
			isClosed: true,
			closureMessage: "Vacances",
			reopensAt: new Date("2026-04-01"),
		});
		const result = await assertStoreOpen();
		expect(result?.closed).toBe(true);
	});
});
