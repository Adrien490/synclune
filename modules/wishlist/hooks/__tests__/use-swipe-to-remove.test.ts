import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSwipeToRemove, SWIPE_REMOVE_THRESHOLD } from "../use-swipe-to-remove";

// ============================================================================
// HELPERS
// ============================================================================

function createMockElement() {
	const listeners: Record<string, EventListener> = {};
	const el = {
		addEventListener: vi.fn((event: string, handler: EventListener) => {
			listeners[event] = handler;
		}),
		removeEventListener: vi.fn(),
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

// ============================================================================
// TESTS
// ============================================================================

describe("useSwipeToRemove", () => {
	let onRemove: ReturnType<typeof vi.fn<() => void>>;

	beforeEach(() => {
		onRemove = vi.fn<() => void>();
	});

	it("returns initial state with no swiping", () => {
		const { el } = createMockElement();
		const ref = { current: el };

		const { result } = renderHook(() =>
			useSwipeToRemove({ elementRef: ref, enabled: true, onRemove }),
		);

		expect(result.current.swipeOffset).toBe(0);
		expect(result.current.isSwiping).toBe(false);
	});

	it("registers touch event listeners when enabled", () => {
		const { el } = createMockElement();
		const ref = { current: el };

		renderHook(() => useSwipeToRemove({ elementRef: ref, enabled: true, onRemove }));

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
		const ref = { current: el };

		renderHook(() => useSwipeToRemove({ elementRef: ref, enabled: false, onRemove }));

		expect(el.addEventListener).not.toHaveBeenCalled();
	});

	it("does not register listeners when ref is null", () => {
		const ref = { current: null };

		renderHook(() => useSwipeToRemove({ elementRef: ref, enabled: true, onRemove }));

		// No error thrown, no listeners registered
		expect(onRemove).not.toHaveBeenCalled();
	});

	it("tracks leftward swipe offset", () => {
		const { el, listeners } = createMockElement();
		const ref = { current: el };

		const { result } = renderHook(() =>
			useSwipeToRemove({ elementRef: ref, enabled: true, onRemove }),
		);

		act(() => simulateTouch(listeners, "touchstart", 200));
		act(() => simulateTouch(listeners, "touchmove", 150));

		expect(result.current.swipeOffset).toBe(-50);
		expect(result.current.isSwiping).toBe(true);
	});

	it("clamps rightward swipes to 0", () => {
		const { el, listeners } = createMockElement();
		const ref = { current: el };

		const { result } = renderHook(() =>
			useSwipeToRemove({ elementRef: ref, enabled: true, onRemove }),
		);

		act(() => simulateTouch(listeners, "touchstart", 100));
		act(() => simulateTouch(listeners, "touchmove", 200));

		expect(result.current.swipeOffset).toBe(0);
	});

	it("calls onRemove when swipe exceeds threshold", () => {
		const { el, listeners } = createMockElement();
		const ref = { current: el };

		renderHook(() => useSwipeToRemove({ elementRef: ref, enabled: true, onRemove }));

		act(() => simulateTouch(listeners, "touchstart", 300));
		act(() => simulateTouch(listeners, "touchmove", 300 - SWIPE_REMOVE_THRESHOLD - 1));
		act(() => simulateTouchEnd(listeners));

		expect(onRemove).toHaveBeenCalledTimes(1);
	});

	it("does not call onRemove when swipe is below threshold", () => {
		const { el, listeners } = createMockElement();
		const ref = { current: el };

		renderHook(() => useSwipeToRemove({ elementRef: ref, enabled: true, onRemove }));

		act(() => simulateTouch(listeners, "touchstart", 300));
		act(() => simulateTouch(listeners, "touchmove", 300 - SWIPE_REMOVE_THRESHOLD + 10));
		act(() => simulateTouchEnd(listeners));

		expect(onRemove).not.toHaveBeenCalled();
	});

	it("resets offset after touch end", () => {
		const { el, listeners } = createMockElement();
		const ref = { current: el };

		const { result } = renderHook(() =>
			useSwipeToRemove({ elementRef: ref, enabled: true, onRemove }),
		);

		act(() => simulateTouch(listeners, "touchstart", 300));
		act(() => simulateTouch(listeners, "touchmove", 250));
		act(() => simulateTouchEnd(listeners));

		expect(result.current.swipeOffset).toBe(0);
		expect(result.current.isSwiping).toBe(false);
	});

	it("cancels swipe when vertical movement exceeds threshold", () => {
		const { el, listeners } = createMockElement();
		const ref = { current: el };

		const { result } = renderHook(() =>
			useSwipeToRemove({ elementRef: ref, enabled: true, onRemove }),
		);

		act(() => simulateTouch(listeners, "touchstart", 300, 100));
		// Move mostly vertically (scrolling)
		act(() => simulateTouch(listeners, "touchmove", 280, 140));

		expect(result.current.swipeOffset).toBe(0);
	});

	it("does not trigger onRemove after vertical cancel", () => {
		const { el, listeners } = createMockElement();
		const ref = { current: el };

		renderHook(() => useSwipeToRemove({ elementRef: ref, enabled: true, onRemove }));

		act(() => simulateTouch(listeners, "touchstart", 300, 100));
		// Vertical cancel
		act(() => simulateTouch(listeners, "touchmove", 200, 140));
		// Further horizontal move should be ignored
		act(() => simulateTouch(listeners, "touchmove", 100, 140));
		act(() => simulateTouchEnd(listeners));

		expect(onRemove).not.toHaveBeenCalled();
	});

	it("cleans up listeners on unmount", () => {
		const { el } = createMockElement();
		const ref = { current: el };

		const { unmount } = renderHook(() =>
			useSwipeToRemove({ elementRef: ref, enabled: true, onRemove }),
		);

		unmount();

		expect(el.removeEventListener).toHaveBeenCalledWith("touchstart", expect.any(Function));
		expect(el.removeEventListener).toHaveBeenCalledWith("touchmove", expect.any(Function));
		expect(el.removeEventListener).toHaveBeenCalledWith("touchend", expect.any(Function));
	});

	it("exports SWIPE_REMOVE_THRESHOLD constant", () => {
		expect(SWIPE_REMOVE_THRESHOLD).toBe(80);
	});
});
