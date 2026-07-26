/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { FUNNEL_EVENTS, trackEvent, setAnalyticsSink } from "../track";

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

// Sink espion : aucun provider réel n'est branché (Vercel Analytics retiré, audit §4.8).
// On installe un sink de test pour vérifier le gating RGPD du contrat trackEvent.
const sink = vi.fn();

describe("trackEvent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.clear();
		setAnalyticsSink(sink);
	});

	afterEach(() => {
		store.clear();
		// Restaure le no-op par défaut pour ne pas fuiter le sink entre suites.
		setAnalyticsSink(() => {});
	});

	it("is a no-op when no consent has been recorded", () => {
		setConsent(null);
		trackEvent(FUNNEL_EVENTS.VIEW_ITEM, { productId: "p1" });
		expect(sink).not.toHaveBeenCalled();
	});

	it("is a no-op when consent is explicitly rejected", () => {
		setConsent(false);
		trackEvent(FUNNEL_EVENTS.ADD_TO_CART, { quantity: 1 });
		expect(sink).not.toHaveBeenCalled();
	});

	it("forwards to the configured sink when consent is accepted", () => {
		setConsent(true);
		trackEvent(FUNNEL_EVENTS.PURCHASE, { orderNumber: "SYN-1", value: 42 });
		expect(sink).toHaveBeenCalledExactlyOnceWith("purchase", {
			orderNumber: "SYN-1",
			value: 42,
		});
	});

	it("survives malformed localStorage payloads", () => {
		window.localStorage.setItem("cookie-consent", "not-json{");
		trackEvent(FUNNEL_EVENTS.BEGIN_CHECKOUT);
		expect(sink).not.toHaveBeenCalled();
	});

	it("survives a missing state field", () => {
		window.localStorage.setItem("cookie-consent", JSON.stringify({ version: 0 }));
		trackEvent(FUNNEL_EVENTS.VIEW_ITEM);
		expect(sink).not.toHaveBeenCalled();
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
