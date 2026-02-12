import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCookieStore } = vi.hoisted(() => ({
	mockCookieStore: {
		set: vi.fn(),
		delete: vi.fn(),
	},
}));

vi.mock("next/headers", () => ({
	cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { toggleFabVisibility } from "./toggle-fab-visibility";

describe("toggleFabVisibility", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sets cookie when hiding a FAB", async () => {
		const result = await toggleFabVisibility("storefront", true);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			"fab-hidden-storefront",
			"true",
			expect.objectContaining({
				path: "/",
				httpOnly: true,
				sameSite: "strict",
			})
		);
		expect(mockCookieStore.delete).not.toHaveBeenCalled();
		expect(result).toEqual({ success: true, isHidden: true });
	});

	it("deletes cookie when showing a FAB", async () => {
		const result = await toggleFabVisibility("storefront", false);

		expect(mockCookieStore.delete).toHaveBeenCalledWith(
			"fab-hidden-storefront"
		);
		expect(mockCookieStore.set).not.toHaveBeenCalled();
		expect(result).toEqual({ success: true, isHidden: false });
	});

	it("sets secure:false in test environment", async () => {
		await toggleFabVisibility("storefront", true);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			"fab-hidden-storefront",
			"true",
			expect.objectContaining({ secure: false })
		);
	});

	it("uses correct cookie name for different keys", async () => {
		await toggleFabVisibility("admin-speed-dial", true);

		expect(mockCookieStore.set).toHaveBeenCalledWith(
			"fab-hidden-admin-speed-dial",
			"true",
			expect.any(Object)
		);
	});
});
