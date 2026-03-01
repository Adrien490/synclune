import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import type { CookieConsentStore } from "../cookie-consent-store";
import type { StoreApi } from "zustand/vanilla";

// Mock localStorage for persist middleware
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		get length() {
			return Object.keys(store).length;
		},
		key: (index: number) => Object.keys(store)[index] ?? null,
	};
})();

vi.stubGlobal("localStorage", localStorageMock);

describe("createCookieConsentStore", () => {
	let store: StoreApi<CookieConsentStore>;
	let CURRENT_POLICY_VERSION: number;
	let defaultInitState: {
		accepted: boolean | null;
		bannerVisible: boolean;
		consentDate: string | null;
		policyVersion: number;
		_hasHydrated: boolean;
	};

	beforeEach(async () => {
		localStorageMock.clear();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-25T12:00:00.000Z"));

		// Dynamic import to pick up fresh localStorage mock
		const mod = await import("../cookie-consent-store");
		store = mod.createCookieConsentStore();
		CURRENT_POLICY_VERSION = mod.CURRENT_POLICY_VERSION;
		defaultInitState = mod.defaultInitState;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("initial state", () => {
		it("should have accepted = null", () => {
			expect(store.getState().accepted).toBeNull();
		});

		it("should have bannerVisible = true", () => {
			expect(store.getState().bannerVisible).toBe(true);
		});

		it("should have consentDate = null", () => {
			expect(store.getState().consentDate).toBeNull();
		});

		it("should have policyVersion = 0", () => {
			expect(store.getState().policyVersion).toBe(0);
		});

		it("should hydrate from localStorage", () => {
			// _hasHydrated is set to true by onRehydrateStorage when localStorage is available
			expect(store.getState()._hasHydrated).toBe(true);
		});

		it("should use default init state", () => {
			expect(store.getState().accepted).toBe(defaultInitState.accepted);
			expect(store.getState().bannerVisible).toBe(defaultInitState.bannerVisible);
		});
	});

	describe("acceptCookies", () => {
		it("should set accepted to true", () => {
			store.getState().acceptCookies();
			expect(store.getState().accepted).toBe(true);
		});

		it("should hide the banner", () => {
			store.getState().acceptCookies();
			expect(store.getState().bannerVisible).toBe(false);
		});

		it("should record consent date", () => {
			store.getState().acceptCookies();
			expect(store.getState().consentDate).toBe("2026-02-25T12:00:00.000Z");
		});

		it("should set current policy version", () => {
			store.getState().acceptCookies();
			expect(store.getState().policyVersion).toBe(CURRENT_POLICY_VERSION);
		});
	});

	describe("rejectCookies", () => {
		it("should set accepted to false", () => {
			store.getState().rejectCookies();
			expect(store.getState().accepted).toBe(false);
		});

		it("should hide the banner", () => {
			store.getState().rejectCookies();
			expect(store.getState().bannerVisible).toBe(false);
		});

		it("should record consent date", () => {
			store.getState().rejectCookies();
			expect(store.getState().consentDate).toBe("2026-02-25T12:00:00.000Z");
		});

		it("should set current policy version", () => {
			store.getState().rejectCookies();
			expect(store.getState().policyVersion).toBe(CURRENT_POLICY_VERSION);
		});
	});

	describe("showBanner", () => {
		it("should set bannerVisible to true", () => {
			store.getState().acceptCookies(); // hides banner
			store.getState().showBanner();
			expect(store.getState().bannerVisible).toBe(true);
		});
	});

	describe("hideBanner", () => {
		it("should set bannerVisible to false", () => {
			store.getState().hideBanner();
			expect(store.getState().bannerVisible).toBe(false);
		});
	});

	describe("resetConsent", () => {
		it("should reset all consent state", () => {
			store.getState().acceptCookies();
			store.getState().resetConsent();

			expect(store.getState().accepted).toBeNull();
			expect(store.getState().bannerVisible).toBe(true);
			expect(store.getState().consentDate).toBeNull();
			expect(store.getState().policyVersion).toBe(0);
		});
	});

	describe("CURRENT_POLICY_VERSION", () => {
		it("should be a positive integer", () => {
			expect(CURRENT_POLICY_VERSION).toBeGreaterThanOrEqual(1);
			expect(Number.isInteger(CURRENT_POLICY_VERSION)).toBe(true);
		});
	});
});
