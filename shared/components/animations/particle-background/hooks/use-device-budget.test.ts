import { afterEach, describe, expect, it, vi } from "vitest";
import { computeDeviceBudget } from "./use-device-budget";

/**
 * Helpers to stub the navigator/matchMedia surface read by computeDeviceBudget.
 * jsdom exposes a navigator without deviceMemory; we redefine the fields per test.
 */
function stubNavigator(fields: {
	deviceMemory?: number;
	hardwareConcurrency?: number;
	saveData?: boolean;
}) {
	vi.stubGlobal("navigator", {
		deviceMemory: fields.deviceMemory,
		hardwareConcurrency: fields.hardwareConcurrency,
		connection: fields.saveData !== undefined ? { saveData: fields.saveData } : undefined,
	});
}

function stubMatchMedia(reducedData: boolean) {
	// jsdom's window === globalThis, so stubbing the global also covers window.matchMedia
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: query === "(prefers-reduced-data: reduce)" ? reducedData : false,
		media: query,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => true,
		onchange: null,
	}));
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("computeDeviceBudget", () => {
	it("returns 1 for a high-end device (no hints, no reduced-data)", () => {
		stubNavigator({ deviceMemory: 8, hardwareConcurrency: 12 });
		stubMatchMedia(false);
		expect(computeDeviceBudget()).toBe(1);
	});

	it("returns 1 when no capability hints are available", () => {
		stubNavigator({});
		stubMatchMedia(false);
		expect(computeDeviceBudget()).toBe(1);
	});

	it("returns 0.3 when prefers-reduced-data is set", () => {
		stubNavigator({ deviceMemory: 8, hardwareConcurrency: 12 });
		stubMatchMedia(true);
		expect(computeDeviceBudget()).toBe(0.3);
	});

	it("returns 0.3 when Save-Data is enabled", () => {
		stubNavigator({ deviceMemory: 8, hardwareConcurrency: 12, saveData: true });
		stubMatchMedia(false);
		expect(computeDeviceBudget()).toBe(0.3);
	});

	it("trims to 0.4 on very low memory (≤2GB)", () => {
		stubNavigator({ deviceMemory: 2, hardwareConcurrency: 8 });
		stubMatchMedia(false);
		expect(computeDeviceBudget()).toBe(0.4);
	});

	it("trims to 0.6 on mid memory (≤4GB)", () => {
		stubNavigator({ deviceMemory: 4, hardwareConcurrency: 8 });
		stubMatchMedia(false);
		expect(computeDeviceBudget()).toBe(0.6);
	});

	it("takes the most constrained signal (low cores wins over decent memory)", () => {
		stubNavigator({ deviceMemory: 8, hardwareConcurrency: 2 });
		stubMatchMedia(false);
		expect(computeDeviceBudget()).toBe(0.4);
	});

	it("returns 1 when navigator is undefined (SSR safety)", () => {
		vi.stubGlobal("navigator", undefined);
		expect(computeDeviceBudget()).toBe(1);
	});
});
