import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Hoisted mock for triggerHaptic so tests can assert the haptic tier.
const { mockTriggerHaptic } = vi.hoisted(() => ({ mockTriggerHaptic: vi.fn() }));

vi.mock("../use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
	useHaptic: () => mockTriggerHaptic,
}));

import {
	useSwipeAction,
	SWIPE_ACTION_THRESHOLD,
	SWIPE_WIDTH_RATIO,
	OVERSWIPE_RATIO,
} from "../use-swipe-action";

// ============================================================================
// HELPERS
// ============================================================================

type ResizeCallback = (entries: Array<{ contentRect: { width: number } }>) => void;

const resizeObservers: Array<{ cb: ResizeCallback; el: HTMLElement }> = [];

class MockResizeObserver {
	private cb: ResizeCallback;
	constructor(cb: ResizeCallback) {
		this.cb = cb;
	}
	observe(el: HTMLElement) {
		resizeObservers.push({ cb: this.cb, el });
	}
	unobserve() {}
	disconnect() {}
}

// Forcefully override jsdom's native ResizeObserver at module load.
// `vi.stubGlobal` doesn't always take over a property installed by jsdom.
Object.defineProperty(globalThis, "ResizeObserver", {
	value: MockResizeObserver,
	writable: true,
	configurable: true,
});

/** Fire a resize on every observer tied to the given element. */
function triggerResize(el: HTMLElement, width: number) {
	for (const { cb, el: target } of resizeObservers) {
		if (target === el) cb([{ contentRect: { width } }]);
	}
}

function createMockElement(width = 400) {
	const listeners: Record<string, EventListener> = {};
	const el = {
		addEventListener: vi.fn((event: string, handler: EventListener) => {
			listeners[event] = handler;
		}),
		removeEventListener: vi.fn(),
		getBoundingClientRect: vi.fn(() => ({ width })),
	} as unknown as HTMLElement;
	return { el, listeners };
}

function simulateTouch(listeners: Record<string, EventListener>, type: string, x: number, y = 0) {
	const event = { touches: [{ clientX: x, clientY: y }] } as unknown as TouchEvent;
	listeners[type]?.(event);
}

function simulateTouchEnd(listeners: Record<string, EventListener>) {
	listeners["touchend"]?.({} as TouchEvent);
}

/** Flush rAF — hook uses requestAnimationFrame for offset updates */
function flushRAF() {
	vi.advanceTimersByTime(16);
}

// ============================================================================
// TESTS
// ============================================================================

describe("useSwipeAction", () => {
	let onLeft: ReturnType<typeof vi.fn<() => void>>;
	let onRight: ReturnType<typeof vi.fn<() => void>>;

	beforeEach(() => {
		onLeft = vi.fn<() => void>();
		onRight = vi.fn<() => void>();
		mockTriggerHaptic.mockClear();
		resizeObservers.length = 0;
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Initial state
	// -------------------------------------------------------------------------

	describe("initial state", () => {
		it("returns zero offset and no swiping initially", () => {
			const { el } = createMockElement();
			const ref = { current: el };

			const { result } = renderHook(() =>
				useSwipeAction({ elementRef: ref, leftAction: { onAction: onLeft } }),
			);

			expect(result.current.swipeOffset).toBe(0);
			expect(result.current.isSwiping).toBe(false);
			expect(result.current.leftProgress).toBe(0);
			expect(result.current.rightProgress).toBe(0);
		});
	});

	// -------------------------------------------------------------------------
	// Listener registration
	// -------------------------------------------------------------------------

	describe("listener registration", () => {
		it("registers passive touch listeners when enabled with at least one action", () => {
			const { el } = createMockElement();

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			expect(el.addEventListener).toHaveBeenCalledWith("touchstart", expect.any(Function), {
				passive: true,
			});
			expect(el.addEventListener).toHaveBeenCalledWith("touchmove", expect.any(Function), {
				passive: true,
			});
			expect(el.addEventListener).toHaveBeenCalledWith("touchend", expect.any(Function), {
				passive: true,
			});
		});

		it("does not register listeners when disabled", () => {
			const { el } = createMockElement();

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					enabled: false,
					leftAction: { onAction: onLeft },
				}),
			);

			expect(el.addEventListener).not.toHaveBeenCalled();
		});

		it("does not register listeners when no actions are provided", () => {
			const { el } = createMockElement();

			renderHook(() => useSwipeAction({ elementRef: { current: el } }));

			expect(el.addEventListener).not.toHaveBeenCalled();
		});

		it("does not register listeners when ref is null", () => {
			renderHook(() =>
				useSwipeAction({
					elementRef: { current: null },
					leftAction: { onAction: onLeft },
				}),
			);

			expect(onLeft).not.toHaveBeenCalled();
		});

		it("cleans up listeners on unmount", () => {
			const { el } = createMockElement();

			const { unmount } = renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			unmount();

			expect(el.removeEventListener).toHaveBeenCalledWith("touchstart", expect.any(Function));
			expect(el.removeEventListener).toHaveBeenCalledWith("touchmove", expect.any(Function));
			expect(el.removeEventListener).toHaveBeenCalledWith("touchend", expect.any(Function));
		});
	});

	// -------------------------------------------------------------------------
	// Left swipe (←)
	// -------------------------------------------------------------------------

	describe("left swipe", () => {
		it("tracks leftward offset as negative value", () => {
			const { el, listeners } = createMockElement();
			const ref = { current: el };

			const { result } = renderHook(() =>
				useSwipeAction({ elementRef: ref, leftAction: { onAction: onLeft } }),
			);

			act(() => simulateTouch(listeners, "touchstart", 200));
			act(() => {
				simulateTouch(listeners, "touchmove", 150);
				flushRAF();
			});

			expect(result.current.swipeOffset).toBe(-50);
			expect(result.current.isSwiping).toBe(true);
		});

		it("clamps leftward offset to 0 (no rightward drift)", () => {
			const { el, listeners } = createMockElement();
			const ref = { current: el };

			const { result } = renderHook(() =>
				useSwipeAction({ elementRef: ref, leftAction: { onAction: onLeft } }),
			);

			act(() => simulateTouch(listeners, "touchstart", 100));
			act(() => {
				simulateTouch(listeners, "touchmove", 200);
				flushRAF();
			});

			expect(result.current.swipeOffset).toBe(0);
		});

		it("calculates leftProgress as 0–1 ratio toward threshold", () => {
			const { el, listeners } = createMockElement();
			const ref = { current: el };

			const { result } = renderHook(() =>
				useSwipeAction({
					elementRef: ref,
					leftAction: { onAction: onLeft, threshold: 100 },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 200));
			act(() => {
				simulateTouch(listeners, "touchmove", 150);
				flushRAF();
			});

			expect(result.current.leftProgress).toBeCloseTo(0.5);
			expect(result.current.rightProgress).toBe(0);
		});

		it("caps leftProgress at 1 even when swipe exceeds threshold", () => {
			const { el, listeners } = createMockElement();
			const ref = { current: el };

			const { result } = renderHook(() =>
				useSwipeAction({ elementRef: ref, leftAction: { onAction: onLeft } }),
			);

			act(() => simulateTouch(listeners, "touchstart", 300));
			act(() => {
				simulateTouch(listeners, "touchmove", 0);
				flushRAF();
			});

			expect(result.current.leftProgress).toBe(1);
		});

		it("fires onAction when left swipe meets threshold", () => {
			const { el, listeners } = createMockElement();

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 300));
			act(() => {
				simulateTouch(listeners, "touchmove", 300 - SWIPE_ACTION_THRESHOLD);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(onLeft).toHaveBeenCalledOnce();
		});

		it("does not fire onAction when left swipe falls short of threshold", () => {
			const { el, listeners } = createMockElement();

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 300));
			act(() => {
				simulateTouch(listeners, "touchmove", 300 - SWIPE_ACTION_THRESHOLD + 10);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(onLeft).not.toHaveBeenCalled();
		});

		it("respects a custom left threshold", () => {
			// Wide container so 30% (120px) > custom 40px
			const { el, listeners } = createMockElement(500);

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft, threshold: 40 },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 100));
			act(() => {
				simulateTouch(listeners, "touchmove", 55);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(onLeft).toHaveBeenCalledOnce();
		});
	});

	// -------------------------------------------------------------------------
	// Right swipe (→)
	// -------------------------------------------------------------------------

	describe("right swipe", () => {
		it("tracks rightward offset as positive value", () => {
			const { el, listeners } = createMockElement();
			const ref = { current: el };

			const { result } = renderHook(() =>
				useSwipeAction({ elementRef: ref, rightAction: { onAction: onRight } }),
			);

			act(() => simulateTouch(listeners, "touchstart", 100));
			act(() => {
				simulateTouch(listeners, "touchmove", 150);
				flushRAF();
			});

			expect(result.current.swipeOffset).toBe(50);
		});

		it("fires onAction when right swipe meets threshold", () => {
			const { el, listeners } = createMockElement();

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					rightAction: { onAction: onRight },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 100));
			act(() => {
				simulateTouch(listeners, "touchmove", 100 + SWIPE_ACTION_THRESHOLD);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(onRight).toHaveBeenCalledOnce();
		});

		it("does not fire onAction when right swipe is below threshold", () => {
			const { el, listeners } = createMockElement();

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					rightAction: { onAction: onRight },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 100));
			act(() => {
				simulateTouch(listeners, "touchmove", 100 + SWIPE_ACTION_THRESHOLD - 10);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(onRight).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// Direction lock (both actions)
	// -------------------------------------------------------------------------

	describe("direction lock with both actions", () => {
		it("fires only the left action on left swipe", () => {
			const { el, listeners } = createMockElement();

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
					rightAction: { onAction: onRight },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 300));
			act(() => {
				simulateTouch(listeners, "touchmove", 300 - SWIPE_ACTION_THRESHOLD);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(onLeft).toHaveBeenCalledOnce();
			expect(onRight).not.toHaveBeenCalled();
		});

		it("fires only the right action on right swipe", () => {
			const { el, listeners } = createMockElement();

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
					rightAction: { onAction: onRight },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 100));
			act(() => {
				simulateTouch(listeners, "touchmove", 100 + SWIPE_ACTION_THRESHOLD);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(onRight).toHaveBeenCalledOnce();
			expect(onLeft).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// Scroll cancellation
	// -------------------------------------------------------------------------

	describe("vertical scroll cancellation", () => {
		it("cancels tracking when vertical movement dominates", () => {
			const { el, listeners } = createMockElement();
			const ref = { current: el };

			const { result } = renderHook(() =>
				useSwipeAction({ elementRef: ref, leftAction: { onAction: onLeft } }),
			);

			act(() => simulateTouch(listeners, "touchstart", 200, 100));
			act(() => {
				simulateTouch(listeners, "touchmove", 180, 135);
				flushRAF();
			});

			expect(result.current.swipeOffset).toBe(0);
		});

		it("does not fire action after vertical cancel", () => {
			const { el, listeners } = createMockElement();

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 300, 100));
			act(() => {
				simulateTouch(listeners, "touchmove", 280, 135);
				flushRAF();
			});
			act(() => {
				simulateTouch(listeners, "touchmove", 100, 135);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(onLeft).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// No action for swiped direction
	// -------------------------------------------------------------------------

	describe("no action for swiped direction", () => {
		it("does not track when swiping left with only rightAction configured", () => {
			const { el, listeners } = createMockElement();
			const ref = { current: el };

			const { result } = renderHook(() =>
				useSwipeAction({ elementRef: ref, rightAction: { onAction: onRight } }),
			);

			act(() => simulateTouch(listeners, "touchstart", 200));
			act(() => {
				simulateTouch(listeners, "touchmove", 100);
				flushRAF();
			});

			expect(result.current.swipeOffset).toBe(0);
		});
	});

	// -------------------------------------------------------------------------
	// Dynamic 30% width threshold
	// -------------------------------------------------------------------------

	describe("dynamic width threshold", () => {
		it("uses 30% width when lower than px threshold", () => {
			// Container width 200px → 30% = 60px, which is < default 80px
			const { el, listeners } = createMockElement(200);

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			// Swipe 65px — exceeds 30% (60px) but below default 80px
			act(() => simulateTouch(listeners, "touchstart", 300));
			act(() => {
				simulateTouch(listeners, "touchmove", 235);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(onLeft).toHaveBeenCalledOnce();
		});

		it("uses px threshold when lower than 30% width", () => {
			// Container width 400px → 30% = 120px > default 80px, so px wins
			const { el, listeners } = createMockElement(400);

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			// Swipe 85px — exceeds 80px
			act(() => simulateTouch(listeners, "touchstart", 300));
			act(() => {
				simulateTouch(listeners, "touchmove", 215);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(onLeft).toHaveBeenCalledOnce();
		});
	});

	// -------------------------------------------------------------------------
	// Overswipe auto-trigger
	// -------------------------------------------------------------------------

	describe("overswipe auto-trigger", () => {
		it("auto-triggers action on overswipe (>75% of card width)", () => {
			const { el, listeners } = createMockElement(400);

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			// Swipe > 75% of 400px = 300px
			act(() => simulateTouch(listeners, "touchstart", 400));
			act(() => {
				simulateTouch(listeners, "touchmove", 90);
				flushRAF();
			});

			// Fired during move, before touchend
			expect(onLeft).toHaveBeenCalledOnce();
		});

		it("does not double-fire on overswipe then touchend", () => {
			const { el, listeners } = createMockElement(400);

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 400));
			act(() => {
				simulateTouch(listeners, "touchmove", 90);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(onLeft).toHaveBeenCalledOnce();
		});

		it("auto-triggers right overswipe", () => {
			const { el, listeners } = createMockElement(400);

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					rightAction: { onAction: onRight },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 0));
			act(() => {
				simulateTouch(listeners, "touchmove", 310);
				flushRAF();
			});

			expect(onRight).toHaveBeenCalledOnce();
		});
	});

	// -------------------------------------------------------------------------
	// Reset after touchend
	// -------------------------------------------------------------------------

	describe("reset after touchend", () => {
		it("resets swipeOffset and isSwiping after touchend", () => {
			const { el, listeners } = createMockElement();
			const ref = { current: el };

			const { result } = renderHook(() =>
				useSwipeAction({ elementRef: ref, leftAction: { onAction: onLeft } }),
			);

			act(() => simulateTouch(listeners, "touchstart", 200));
			act(() => {
				simulateTouch(listeners, "touchmove", 150);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(result.current.swipeOffset).toBe(0);
			expect(result.current.isSwiping).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// touchcancel handling
	// -------------------------------------------------------------------------

	describe("touchcancel handling", () => {
		it("registers a passive touchcancel listener", () => {
			const { el } = createMockElement();

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			expect(el.addEventListener).toHaveBeenCalledWith("touchcancel", expect.any(Function), {
				passive: true,
			});
		});

		it("resets state on touchcancel (same as touchend)", () => {
			const { el, listeners } = createMockElement();
			const ref = { current: el };

			const { result } = renderHook(() =>
				useSwipeAction({ elementRef: ref, leftAction: { onAction: onLeft } }),
			);

			act(() => simulateTouch(listeners, "touchstart", 200));
			act(() => {
				simulateTouch(listeners, "touchmove", 150);
				flushRAF();
			});

			expect(result.current.isSwiping).toBe(true);

			act(() => listeners["touchcancel"]?.({} as TouchEvent));

			expect(result.current.swipeOffset).toBe(0);
			expect(result.current.isSwiping).toBe(false);
		});

		it("does not fire action on touchcancel when below threshold", () => {
			const { el, listeners } = createMockElement();

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 200));
			act(() => {
				simulateTouch(listeners, "touchmove", 170);
				flushRAF();
			});
			act(() => listeners["touchcancel"]?.({} as TouchEvent));

			expect(onLeft).not.toHaveBeenCalled();
		});

		it("cleans up touchcancel listener on unmount", () => {
			const { el } = createMockElement();

			const { unmount } = renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			unmount();

			expect(el.removeEventListener).toHaveBeenCalledWith("touchcancel", expect.any(Function));
		});
	});

	// -------------------------------------------------------------------------
	// Progress uses effective threshold
	// -------------------------------------------------------------------------

	describe("progress uses effective threshold", () => {
		it("leftProgress reaches 1.0 at effective threshold on narrow container", () => {
			// Container 200px → 30% = 60px (effective threshold, lower than 80px default)
			const { el, listeners } = createMockElement(200);
			const ref = { current: el };

			const { result } = renderHook(() =>
				useSwipeAction({ elementRef: ref, leftAction: { onAction: onLeft } }),
			);

			// Swipe exactly 60px (effective threshold)
			act(() => simulateTouch(listeners, "touchstart", 300));
			act(() => {
				simulateTouch(listeners, "touchmove", 240);
				flushRAF();
			});

			expect(result.current.leftProgress).toBe(1);
		});

		it("rightProgress reaches 1.0 at effective threshold on narrow container", () => {
			const { el, listeners } = createMockElement(200);
			const ref = { current: el };

			const { result } = renderHook(() =>
				useSwipeAction({ elementRef: ref, rightAction: { onAction: onRight } }),
			);

			act(() => simulateTouch(listeners, "touchstart", 100));
			act(() => {
				simulateTouch(listeners, "touchmove", 160);
				flushRAF();
			});

			expect(result.current.rightProgress).toBe(1);
		});
	});

	// -------------------------------------------------------------------------
	// Callback stability (useEffectEvent)
	// -------------------------------------------------------------------------

	describe("callback stability via useEffectEvent", () => {
		it("uses the latest onAction without re-registering listeners", () => {
			const first = vi.fn();
			const second = vi.fn();
			const { el, listeners } = createMockElement();

			const { rerender } = renderHook(
				({ action }) =>
					useSwipeAction({
						elementRef: { current: el },
						leftAction: { onAction: action },
					}),
				{ initialProps: { action: first } },
			);

			rerender({ action: second });

			act(() => simulateTouch(listeners, "touchstart", 300));
			act(() => {
				simulateTouch(listeners, "touchmove", 300 - SWIPE_ACTION_THRESHOLD);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(first).not.toHaveBeenCalled();
			expect(second).toHaveBeenCalledOnce();
		});
	});

	// -------------------------------------------------------------------------
	// Exported constants
	// -------------------------------------------------------------------------

	describe("exported constants", () => {
		it("exports SWIPE_ACTION_THRESHOLD as 80", () => {
			expect(SWIPE_ACTION_THRESHOLD).toBe(80);
		});

		it("exports SWIPE_WIDTH_RATIO as 0.3", () => {
			expect(SWIPE_WIDTH_RATIO).toBe(0.3);
		});

		it("exports OVERSWIPE_RATIO as 0.75", () => {
			expect(OVERSWIPE_RATIO).toBe(0.75);
		});
	});

	// -------------------------------------------------------------------------
	// Haptic tiers (P1.2)
	// -------------------------------------------------------------------------

	describe("haptic tiers", () => {
		it("fires `medium` on confirm (touchend above threshold)", () => {
			const { el, listeners } = createMockElement();

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 300));
			act(() => {
				simulateTouch(listeners, "touchmove", 300 - SWIPE_ACTION_THRESHOLD);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			expect(onLeft).toHaveBeenCalledOnce();
			expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
			expect(mockTriggerHaptic).not.toHaveBeenCalledWith("heavy");
		});

		it("fires `heavy` on overswipe auto-trigger (not `medium`)", () => {
			const { el, listeners } = createMockElement(400);

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			// Swipe > 75% of 400px = 300px
			act(() => simulateTouch(listeners, "touchstart", 400));
			act(() => {
				simulateTouch(listeners, "touchmove", 90);
				flushRAF();
			});

			expect(onLeft).toHaveBeenCalledOnce();
			expect(mockTriggerHaptic).toHaveBeenCalledWith("heavy");
			expect(mockTriggerHaptic).not.toHaveBeenCalledWith("medium");
		});

		it("fires haptic exactly once per action (no duplication)", () => {
			const { el, listeners } = createMockElement();

			renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 300));
			act(() => {
				simulateTouch(listeners, "touchmove", 300 - SWIPE_ACTION_THRESHOLD);
				flushRAF();
			});
			act(() => simulateTouchEnd(listeners));

			// Exactly 1 haptic fired (medium), not 2
			expect(mockTriggerHaptic).toHaveBeenCalledTimes(1);
		});
	});

	// -------------------------------------------------------------------------
	// Exposed values for rubber-band (P1.1)
	// -------------------------------------------------------------------------

	describe("exposed containerWidth and effective thresholds", () => {
		it("returns containerWidth primed from the element on mount", () => {
			const { el } = createMockElement(350);

			const { result } = renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			expect(result.current.containerWidth).toBe(350);
		});

		it("returns the effective left threshold (min of configured and 30% width)", () => {
			// Narrow container: 200px * 30% = 60px < default 80
			const { el } = createMockElement(200);

			const { result } = renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			expect(result.current.effectiveLeftThreshold).toBe(60);
		});

		it("returns the effective right threshold (min of configured and 30% width)", () => {
			// Wide container: 400px * 30% = 120px > default 80 → 80 wins
			const { el } = createMockElement(400);

			const { result } = renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					rightAction: { onAction: onRight },
				}),
			);

			expect(result.current.effectiveRightThreshold).toBe(80);
		});
	});

	// -------------------------------------------------------------------------
	// ResizeObserver (P2.2)
	// -------------------------------------------------------------------------

	describe("ResizeObserver width tracking", () => {
		it("updates containerWidth when the element is resized", () => {
			const { el } = createMockElement(300);

			const { result } = renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			expect(result.current.containerWidth).toBe(300);

			act(() => {
				triggerResize(el, 500);
			});

			expect(result.current.containerWidth).toBe(500);
		});

		it("recomputes leftProgress when resize changes the effective threshold", () => {
			// Start at 400px → effective threshold = min(80, 120) = 80
			const { el, listeners } = createMockElement(400);

			const { result } = renderHook(() =>
				useSwipeAction({
					elementRef: { current: el },
					leftAction: { onAction: onLeft },
				}),
			);

			act(() => simulateTouch(listeners, "touchstart", 200));
			act(() => {
				simulateTouch(listeners, "touchmove", 200 - 40);
				flushRAF();
			});

			// At width=400, swipe of -40 → progress 40/80 = 0.5
			expect(result.current.leftProgress).toBeCloseTo(0.5);

			// Shrink to 200px → effective threshold = 60, progress 40/60 ≈ 0.666
			act(() => {
				triggerResize(el, 200);
			});

			expect(result.current.leftProgress).toBeCloseTo(40 / 60);
		});
	});
});
