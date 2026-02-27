import { describe, it, expect, beforeEach, vi } from "vitest";

import type { InstallPromptStore } from "../install-prompt-store";
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

describe("createInstallPromptStore", () => {
	let store: StoreApi<InstallPromptStore>;
	let defaultInitState: InstallPromptStore extends infer _T
		? {
				visitCount: number;
				dismissCount: number;
				permanentlyDismissed: boolean;
				bannerVisible: boolean;
				_hasHydrated: boolean;
			}
		: never;

	beforeEach(async () => {
		localStorageMock.clear();

		const mod = await import("../install-prompt-store");
		store = mod.createInstallPromptStore();
		defaultInitState = mod.defaultInitState;
	});

	describe("initial state", () => {
		it("should have visitCount = 0", () => {
			expect(store.getState().visitCount).toBe(0);
		});

		it("should have dismissCount = 0", () => {
			expect(store.getState().dismissCount).toBe(0);
		});

		it("should not be permanently dismissed", () => {
			expect(store.getState().permanentlyDismissed).toBe(false);
		});

		it("should have bannerVisible = false", () => {
			expect(store.getState().bannerVisible).toBe(false);
		});

		it("should hydrate from localStorage", () => {
			// _hasHydrated is set to true by onRehydrateStorage when localStorage is available
			expect(store.getState()._hasHydrated).toBe(true);
		});

		it("should use default init state", () => {
			expect(store.getState().visitCount).toBe(defaultInitState.visitCount);
			expect(store.getState().permanentlyDismissed).toBe(defaultInitState.permanentlyDismissed);
		});

		it("should accept custom init state", async () => {
			const mod = await import("../install-prompt-store");
			const customStore = mod.createInstallPromptStore({
				visitCount: 5,
				dismissCount: 1,
				permanentlyDismissed: false,
				bannerVisible: true,
				_hasHydrated: true,
			});
			expect(customStore.getState().visitCount).toBe(5);
			expect(customStore.getState().bannerVisible).toBe(true);
		});
	});

	describe("recordVisit", () => {
		it("should increment visitCount", () => {
			store.getState().recordVisit();
			expect(store.getState().visitCount).toBe(1);
		});

		it("should not show banner on first visit", () => {
			store.getState().recordVisit();
			expect(store.getState().bannerVisible).toBe(false);
		});

		it("should show banner on second visit", () => {
			store.getState().recordVisit();
			store.getState().recordVisit();
			expect(store.getState().visitCount).toBe(2);
			expect(store.getState().bannerVisible).toBe(true);
		});

		it("should show banner on third visit and beyond", () => {
			store.getState().recordVisit();
			store.getState().recordVisit();
			store.getState().recordVisit();
			expect(store.getState().visitCount).toBe(3);
			expect(store.getState().bannerVisible).toBe(true);
		});

		it("should not show banner if permanently dismissed", () => {
			store.getState().markInstalled();
			store.getState().recordVisit();
			store.getState().recordVisit();
			expect(store.getState().visitCount).toBe(2);
			expect(store.getState().bannerVisible).toBe(false);
		});
	});

	describe("dismissForSession", () => {
		it("should increment dismissCount", () => {
			store.getState().dismissForSession();
			expect(store.getState().dismissCount).toBe(1);
		});

		it("should hide the banner", () => {
			store.getState().recordVisit();
			store.getState().recordVisit();
			expect(store.getState().bannerVisible).toBe(true);
			store.getState().dismissForSession();
			expect(store.getState().bannerVisible).toBe(false);
		});

		it("should not permanently dismiss after 1 dismissal", () => {
			store.getState().dismissForSession();
			expect(store.getState().permanentlyDismissed).toBe(false);
		});

		it("should not permanently dismiss after 2 dismissals", () => {
			store.getState().dismissForSession();
			store.getState().dismissForSession();
			expect(store.getState().permanentlyDismissed).toBe(false);
		});

		it("should permanently dismiss after 3 dismissals", () => {
			store.getState().dismissForSession();
			store.getState().dismissForSession();
			store.getState().dismissForSession();
			expect(store.getState().permanentlyDismissed).toBe(true);
		});
	});

	describe("markInstalled", () => {
		it("should set permanentlyDismissed to true", () => {
			store.getState().markInstalled();
			expect(store.getState().permanentlyDismissed).toBe(true);
		});

		it("should hide the banner", () => {
			store.getState().recordVisit();
			store.getState().recordVisit();
			store.getState().markInstalled();
			expect(store.getState().bannerVisible).toBe(false);
		});
	});

	describe("showBanner", () => {
		it("should show banner when not permanently dismissed", () => {
			store.getState().showBanner();
			expect(store.getState().bannerVisible).toBe(true);
		});

		it("should not show banner when permanently dismissed", () => {
			store.getState().markInstalled();
			store.getState().showBanner();
			expect(store.getState().bannerVisible).toBe(false);
		});
	});

	describe("hideBanner", () => {
		it("should hide the banner", () => {
			store.getState().recordVisit();
			store.getState().recordVisit();
			expect(store.getState().bannerVisible).toBe(true);
			store.getState().hideBanner();
			expect(store.getState().bannerVisible).toBe(false);
		});
	});
});
