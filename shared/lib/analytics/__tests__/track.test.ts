/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockVercelTrack } = vi.hoisted(() => ({
	mockVercelTrack: vi.fn(),
}));

vi.mock("@vercel/analytics", () => ({
	track: mockVercelTrack,
}));

import { FUNNEL_EVENTS, trackEvent } from "../track";

const LS_KEY = "cookie-consent";

// jsdom in some Vitest configurations exposes only a read-only localStorage stub.
// Install a deterministic in-memory replacement for the duration of this suite.
const store = new Map<string, string>();
const stubStorage: Storage = {
	get length() {
		return store.size;
	},
	clear: () => store.clear(),
	getItem: (k) => store.get(k) ?? null,
	setItem: (k, v) => {
		store.set(k, String(v));
	},
	removeItem: (k) => {
		store.delete(k);
	},
	key: (i) => Array.from(store.keys())[i] ?? null,
};

Object.defineProperty(window, "localStorage", {
	configurable: true,
	value: stubStorage,
});

function setConsent(value: boolean | null): void {
	if (value === null) {
		stubStorage.removeItem(LS_KEY);
		return;
	}
	stubStorage.setItem(
		LS_KEY,
		JSON.stringify({ state: { accepted: value, policyVersion: 1 }, version: 0 }),
	);
}

describe("trackEvent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.clear();
	});

	afterEach(() => {
		store.clear();
	});

	it("is a no-op when no consent has been recorded", () => {
		setConsent(null);
		trackEvent(FUNNEL_EVENTS.VIEW_ITEM, { productId: "p1" });
		expect(mockVercelTrack).not.toHaveBeenCalled();
	});

	it("is a no-op when consent is explicitly rejected", () => {
		setConsent(false);
		trackEvent(FUNNEL_EVENTS.ADD_TO_CART, { quantity: 1 });
		expect(mockVercelTrack).not.toHaveBeenCalled();
	});

	it("forwards to vercel track() when consent is accepted", () => {
		setConsent(true);
		trackEvent(FUNNEL_EVENTS.PURCHASE, { orderNumber: "SYN-1", value: 42 });
		expect(mockVercelTrack).toHaveBeenCalledExactlyOnceWith("purchase", {
			orderNumber: "SYN-1",
			value: 42,
		});
	});

	it("survives malformed localStorage payloads", () => {
		window.localStorage.setItem("cookie-consent", "not-json{");
		trackEvent(FUNNEL_EVENTS.BEGIN_CHECKOUT);
		expect(mockVercelTrack).not.toHaveBeenCalled();
	});

	it("survives a missing state field", () => {
		window.localStorage.setItem("cookie-consent", JSON.stringify({ version: 0 }));
		trackEvent(FUNNEL_EVENTS.VIEW_ITEM);
		expect(mockVercelTrack).not.toHaveBeenCalled();
	});

	it("exposes the funnel event names as constants", () => {
		expect(FUNNEL_EVENTS).toEqual({
			VIEW_ITEM: "view_item",
			ADD_TO_CART: "add_to_cart",
			BEGIN_CHECKOUT: "begin_checkout",
			PURCHASE: "purchase",
		});
	});
});
