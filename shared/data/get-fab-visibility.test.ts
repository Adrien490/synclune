import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCookieStore } = vi.hoisted(() => ({
	mockCookieStore: {
		get: vi.fn(),
	},
}));

vi.mock("next/headers", () => ({
	cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { getFabVisibility } from "./get-fab-visibility";

describe("getFabVisibility", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns true when cookie value is 'true'", async () => {
		mockCookieStore.get.mockReturnValue({ value: "true" });

		const result = await getFabVisibility("storefront");

		expect(result).toBe(true);
		expect(mockCookieStore.get).toHaveBeenCalledWith("fab-hidden-storefront");
	});

	it("returns false when cookie does not exist", async () => {
		mockCookieStore.get.mockReturnValue(undefined);

		const result = await getFabVisibility("storefront");

		expect(result).toBe(false);
	});

	it("returns false when cookie has a non-true value", async () => {
		mockCookieStore.get.mockReturnValue({ value: "false" });

		const result = await getFabVisibility("admin-speed-dial");

		expect(result).toBe(false);
	});
});
