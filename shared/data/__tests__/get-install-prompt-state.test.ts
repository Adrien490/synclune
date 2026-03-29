import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockCookies } = vi.hoisted(() => ({
	mockCookies: {
		get: vi.fn(),
	},
}));

vi.mock("next/headers", () => ({
	cookies: () => Promise.resolve(mockCookies),
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { getInstallPromptState } from "../get-install-prompt-state";

// ============================================================================
// Tests
// ============================================================================

const DEFAULT_STATE = {
	visitCount: 0,
	dismissCount: 0,
	permanentlyDismissed: false,
};

describe("getInstallPromptState", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns default state when cookie is absent", async () => {
		mockCookies.get.mockReturnValue(undefined);

		const result = await getInstallPromptState();
		expect(result).toEqual(DEFAULT_STATE);
	});

	it("returns default state when cookie value is empty", async () => {
		mockCookies.get.mockReturnValue({ value: "" });

		const result = await getInstallPromptState();
		expect(result).toEqual(DEFAULT_STATE);
	});

	it("parses valid cookie value", async () => {
		mockCookies.get.mockReturnValue({
			value: JSON.stringify({ v: 5, d: 2, p: false }),
		});

		const result = await getInstallPromptState();
		expect(result).toEqual({
			visitCount: 5,
			dismissCount: 2,
			permanentlyDismissed: false,
		});
	});

	it("returns permanently dismissed state", async () => {
		mockCookies.get.mockReturnValue({
			value: JSON.stringify({ v: 10, d: 3, p: true }),
		});

		const result = await getInstallPromptState();
		expect(result).toEqual({
			visitCount: 10,
			dismissCount: 3,
			permanentlyDismissed: true,
		});
	});

	it("returns default state when cookie is invalid JSON", async () => {
		mockCookies.get.mockReturnValue({ value: "not-json" });

		const result = await getInstallPromptState();
		expect(result).toEqual(DEFAULT_STATE);
	});

	it("returns default state when cookie has wrong schema", async () => {
		mockCookies.get.mockReturnValue({
			value: JSON.stringify({ v: "not-a-number", d: 0, p: false }),
		});

		const result = await getInstallPromptState();
		expect(result).toEqual(DEFAULT_STATE);
	});

	it("returns default state when cookie is missing fields", async () => {
		mockCookies.get.mockReturnValue({
			value: JSON.stringify({ v: 1 }),
		});

		const result = await getInstallPromptState();
		expect(result).toEqual(DEFAULT_STATE);
	});

	it("returns default state when cookie has negative numbers", async () => {
		mockCookies.get.mockReturnValue({
			value: JSON.stringify({ v: -1, d: 0, p: false }),
		});

		const result = await getInstallPromptState();
		expect(result).toEqual(DEFAULT_STATE);
	});
});
