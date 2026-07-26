import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useHaptic, triggerHaptic, __resetHapticCooldown } from "../use-haptic";

/**
 * Mock **query-aware** : `triggerHaptic` interroge deux media queries distinctes
 * (capacité tactile + reduced-motion). Un mock qui renvoie le même `matches` pour
 * toute requête ferait passer les tests pour la mauvaise raison — il masquerait
 * notamment le garde tactile.
 */
function setMatchMedia({ reduced = false, touch = true }: { reduced?: boolean; touch?: boolean }) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn((query: string) => ({
			matches: query.includes("prefers-reduced-motion") ? reduced : touch,
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
	setMatchMedia({});
	installVibrateStub(() => true);
	__resetHapticCooldown();
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
			setMatchMedia({ reduced: true });

			expect(triggerHaptic("medium")).toBe(false);
			expect(vibrateSpy).not.toHaveBeenCalled();
		});

		/**
		 * @regression haptic-touch-device-only
		 * Un appareil hybride (portable tactile, Surface, iPad + trackpad) expose
		 * `navigator.vibrate` tout en étant piloté à la souris/au clavier. Sans le
		 * garde `(hover: none) and (pointer: coarse)`, un clic souris y vibrait.
		 */
		it("returns false on a non-touch device even when navigator.vibrate exists", () => {
			const vibrateSpy = vi.fn(() => true);
			installVibrateStub(vibrateSpy);
			setMatchMedia({ touch: false });

			expect(triggerHaptic("medium")).toBe(false);
			expect(vibrateSpy).not.toHaveBeenCalled();
		});

		it("does not consume the cooldown when the device is not touch-capable", () => {
			const vibrateSpy = vi.fn(() => true);
			installVibrateStub(vibrateSpy);

			setMatchMedia({ touch: false });
			expect(triggerHaptic("medium")).toBe(false);

			// Une tentative refusée ne doit pas armer le cooldown : le premier appel
			// légitime qui suit doit passer.
			setMatchMedia({ touch: true });
			expect(triggerHaptic("medium")).toBe(true);
			expect(vibrateSpy).toHaveBeenCalledTimes(1);
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

	describe("cooldown anti-cascade", () => {
		it("blocks a second trigger fired within 80ms of the first", () => {
			const vibrateSpy = vi.fn(() => true);
			installVibrateStub(vibrateSpy);

			expect(triggerHaptic("medium")).toBe(true);
			expect(triggerHaptic("light")).toBe(false);
			expect(vibrateSpy).toHaveBeenCalledTimes(1);
		});

		it("allows a second trigger after 80ms", () => {
			const vibrateSpy = vi.fn(() => true);
			installVibrateStub(vibrateSpy);
			vi.useFakeTimers();
			vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));

			expect(triggerHaptic("medium")).toBe(true);

			vi.advanceTimersByTime(81);
			expect(triggerHaptic("light")).toBe(true);
			expect(vibrateSpy).toHaveBeenCalledTimes(2);

			vi.useRealTimers();
		});

		it("does not advance cooldown when vibrate returns false", () => {
			let returnValue = false;
			const vibrateSpy = vi.fn(() => returnValue);
			installVibrateStub(vibrateSpy);

			expect(triggerHaptic("medium")).toBe(false);

			returnValue = true;
			expect(triggerHaptic("medium")).toBe(true);
			expect(vibrateSpy).toHaveBeenCalledTimes(2);
		});
	});
});
