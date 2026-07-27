import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetStoreStatus } = vi.hoisted(() => ({
	mockGetStoreStatus: vi.fn(),
}));

vi.mock("../../data/get-store-status", () => ({
	getStoreStatus: mockGetStoreStatus,
}));

import { assertStoreOpen } from "../store-closure-guard";

// ============================================================================
// TESTS
// ============================================================================

describe("assertStoreOpen", () => {
	beforeEach(() => {
		vi.resetAllMocks();
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
