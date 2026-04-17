import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useHaptic, triggerHaptic } from "../use-haptic";

function setMatchMedia(reduced: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => ({
			matches: reduced,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

/**
 * jsdom does not implement navigator.vibrate. Define a writable stub so each
 * test can swap it out via Object.defineProperty without ReferenceError.
 */
function installVibrateStub(impl: (pattern: VibratePattern) => boolean) {
	Object.defineProperty(navigator, "vibrate", {
		value: impl,
		writable: true,
		configurable: true,
	});
}

function removeVibrate() {
	Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, "vibrate");
}

beforeEach(() => {
	setMatchMedia(false);
	installVibrateStub(() => true);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	removeVibrate();
});

describe("useHaptic / triggerHaptic", () => {
	describe("support detection", () => {
		it("returns false when navigator.vibrate is missing", () => {
			removeVibrate();
			expect(triggerHaptic("light")).toBe(false);
		});

		it("returns false when prefers-reduced-motion: reduce", () => {
			const vibrateSpy = vi.fn(() => true);
			installVibrateStub(vibrateSpy);
			setMatchMedia(true);

			expect(triggerHaptic("medium")).toBe(false);
			expect(vibrateSpy).not.toHaveBeenCalled();
		});
	});

	describe("patterns", () => {
		it("calls navigator.vibrate with the 'light' duration", () => {
			const vibrateSpy = vi.fn(() => true);
			installVibrateStub(vibrateSpy);

			expect(triggerHaptic("light")).toBe(true);
			expect(vibrateSpy).toHaveBeenCalledWith(10);
		});

		it("calls navigator.vibrate with the 'medium' duration", () => {
			const vibrateSpy = vi.fn(() => true);
			installVibrateStub(vibrateSpy);

			triggerHaptic("medium");
			expect(vibrateSpy).toHaveBeenCalledWith(20);
		});

		it("calls navigator.vibrate with the 'heavy' duration", () => {
			const vibrateSpy = vi.fn(() => true);
			installVibrateStub(vibrateSpy);

			triggerHaptic("heavy");
			expect(vibrateSpy).toHaveBeenCalledWith(40);
		});

		it("calls navigator.vibrate with the error array pattern", () => {
			const vibrateSpy = vi.fn(() => true);
			installVibrateStub(vibrateSpy);

			triggerHaptic("error");
			expect(vibrateSpy).toHaveBeenCalledWith([30, 50, 30]);
		});

		it("calls navigator.vibrate with the success array pattern", () => {
			const vibrateSpy = vi.fn(() => true);
			installVibrateStub(vibrateSpy);

			triggerHaptic("success");
			expect(vibrateSpy).toHaveBeenCalledWith([10, 30, 10]);
		});

		it("defaults to 'light' when no pattern provided", () => {
			const vibrateSpy = vi.fn(() => true);
			installVibrateStub(vibrateSpy);

			triggerHaptic();
			expect(vibrateSpy).toHaveBeenCalledWith(10);
		});
	});

	describe("useHaptic hook", () => {
		it("returns a function equivalent to triggerHaptic", () => {
			const vibrateSpy = vi.fn(() => true);
			installVibrateStub(vibrateSpy);

			const { result } = renderHook(() => useHaptic());
			result.current("selection");

			expect(vibrateSpy).toHaveBeenCalledWith(5);
		});
	});

	describe("error resilience", () => {
		it("returns false when navigator.vibrate throws", () => {
			installVibrateStub(() => {
				throw new Error("not supported");
			});

			expect(triggerHaptic("heavy")).toBe(false);
		});
	});
});
