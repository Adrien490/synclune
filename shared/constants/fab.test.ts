import { describe, expect, it } from "vitest";
import {
	FAB_KEYS,
	FAB_COOKIE_PREFIX,
	FAB_COOKIE_MAX_AGE,
	getFabCookieName,
} from "./fab";

describe("FAB constants", () => {
	it("defines expected FAB keys", () => {
		expect(FAB_KEYS.ADMIN_SPEED_DIAL).toBe("admin-speed-dial");
		expect(FAB_KEYS.STOREFRONT).toBe("storefront");
		expect(FAB_KEYS.ADMIN_DASHBOARD).toBe("admin-dashboard");
	});

	it("has cookie prefix", () => {
		expect(FAB_COOKIE_PREFIX).toBe("fab-hidden-");
	});

	it("sets max age to 1 year in seconds", () => {
		expect(FAB_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
	});
});

describe("getFabCookieName", () => {
	it("generates cookie name from key", () => {
		expect(getFabCookieName("storefront")).toBe("fab-hidden-storefront");
	});

	it("generates cookie name for admin key", () => {
		expect(getFabCookieName("admin-speed-dial")).toBe(
			"fab-hidden-admin-speed-dial"
		);
	});
});
