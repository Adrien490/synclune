import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLongPress, LONG_PRESS_DELAY, LONG_PRESS_MOVE_TOLERANCE } from "../use-long-press";

// ============================================================================
// HELPERS
// ============================================================================

function makeTouchEvent(clientX: number, clientY = 0): React.TouchEvent {
	return {
		touches: [{ clientX, clientY }],
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
	} as unknown as React.TouchEvent;
}

function makeMouseEvent(): React.MouseEvent {
	return {
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
	} as unknown as React.MouseEvent;
}

// ============================================================================
// TESTS
// ============================================================================

describe("useLongPress", () => {
	let onLongPress: ReturnType<typeof vi.fn<() => void>>;

	beforeEach(() => {
		vi.useFakeTimers();
		onLongPress = vi.fn<() => void>();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Initial state
	// -------------------------------------------------------------------------

	describe("initial state", () => {
		it("returns isPressing false initially", () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));
			expect(result.current.isPressing).toBe(false);
		});

		it("returns all required event handlers", () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));
			expect(typeof result.current.onTouchStart).toBe("function");
			expect(typeof result.current.onTouchMove).toBe("function");
			expect(typeof result.current.onTouchEnd).toBe("function");
			expect(typeof result.current.onTouchCancel).toBe("function");
			expect(typeof result.current.onClick).toBe("function");
		});
	});

	// -------------------------------------------------------------------------
	// isPressing state
	// -------------------------------------------------------------------------

	describe("isPressing", () => {
		it("becomes true on touchstart", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));

			expect(result.current.isPressing).toBe(true);
		});

		it("returns to false after the delay fires", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));
			expect(result.current.isPressing).toBe(true);

			await act(() => vi.advanceTimersByTime(LONG_PRESS_DELAY));

			expect(result.current.isPressing).toBe(false);
		});

		it("returns to false on touchend before delay", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));
			await act(() => result.current.onTouchEnd());

			expect(result.current.isPressing).toBe(false);
		});

		it("returns to false on touchcancel", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));
			await act(() => result.current.onTouchCancel());

			expect(result.current.isPressing).toBe(false);
		});

		it("returns to false when movement cancels the gesture", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));
			// Move beyond tolerance
			await act(() =>
				result.current.onTouchMove(makeTouchEvent(100 + LONG_PRESS_MOVE_TOLERANCE + 1)),
			);

			expect(result.current.isPressing).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// onLongPress callback
	// -------------------------------------------------------------------------

	describe("onLongPress callback", () => {
		it("calls onLongPress after the default delay", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));
			await act(() => vi.advanceTimersByTime(LONG_PRESS_DELAY));

			expect(onLongPress).toHaveBeenCalledOnce();
		});

		it("respects a custom delay", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress, delay: 300 }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));

			await act(() => vi.advanceTimersByTime(299));
			expect(onLongPress).not.toHaveBeenCalled();

			await act(() => vi.advanceTimersByTime(1));
			expect(onLongPress).toHaveBeenCalledOnce();
		});

		it("does not call onLongPress when touch ends before delay", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));
			await act(() => vi.advanceTimersByTime(LONG_PRESS_DELAY - 1));
			await act(() => result.current.onTouchEnd());

			await act(() => vi.advanceTimersByTime(100)); // timer already cleared

			expect(onLongPress).not.toHaveBeenCalled();
		});

		it("does not call onLongPress when cancelled by touchcancel", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));
			await act(() => result.current.onTouchCancel());
			await act(() => vi.advanceTimersByTime(LONG_PRESS_DELAY));

			expect(onLongPress).not.toHaveBeenCalled();
		});

		it("uses the latest callback without re-mounting", async () => {
			const first = vi.fn();
			const second = vi.fn();

			const { result, rerender } = renderHook(({ cb }) => useLongPress({ onLongPress: cb }), {
				initialProps: { cb: first },
			});

			rerender({ cb: second });

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));
			await act(() => vi.advanceTimersByTime(LONG_PRESS_DELAY));

			expect(first).not.toHaveBeenCalled();
			expect(second).toHaveBeenCalledOnce();
		});
	});

	// -------------------------------------------------------------------------
	// Movement cancellation
	// -------------------------------------------------------------------------

	describe("movement cancellation", () => {
		it("cancels when horizontal movement exceeds tolerance", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100, 100)));
			await act(() =>
				result.current.onTouchMove(makeTouchEvent(100 + LONG_PRESS_MOVE_TOLERANCE + 1, 100)),
			);
			await act(() => vi.advanceTimersByTime(LONG_PRESS_DELAY));

			expect(onLongPress).not.toHaveBeenCalled();
		});

		it("cancels when vertical movement exceeds tolerance", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100, 100)));
			await act(() =>
				result.current.onTouchMove(makeTouchEvent(100, 100 + LONG_PRESS_MOVE_TOLERANCE + 1)),
			);
			await act(() => vi.advanceTimersByTime(LONG_PRESS_DELAY));

			expect(onLongPress).not.toHaveBeenCalled();
		});

		it("does not cancel when movement stays within tolerance", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100, 100)));
			// Move within tolerance
			await act(() =>
				result.current.onTouchMove(makeTouchEvent(100 + LONG_PRESS_MOVE_TOLERANCE - 1, 100)),
			);
			await act(() => vi.advanceTimersByTime(LONG_PRESS_DELAY));

			expect(onLongPress).toHaveBeenCalledOnce();
		});

		it("respects a custom moveTolerance", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress, moveTolerance: 20 }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));
			// Move 15px — within custom tolerance of 20
			await act(() => result.current.onTouchMove(makeTouchEvent(115)));
			await act(() => vi.advanceTimersByTime(LONG_PRESS_DELAY));

			expect(onLongPress).toHaveBeenCalledOnce();
		});

		it("ignores touchmove when no active touch (no touchstart)", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));

			// touchmove without preceding touchstart — should not throw
			await act(() => result.current.onTouchMove(makeTouchEvent(200)));

			expect(onLongPress).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// Click suppression
	// -------------------------------------------------------------------------

	describe("click suppression", () => {
		it("suppresses click immediately after a long press", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));
			const event = makeMouseEvent();

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));
			await act(() => vi.advanceTimersByTime(LONG_PRESS_DELAY));
			await act(() => result.current.onClick(event));

			expect(event.preventDefault).toHaveBeenCalled();
			expect(event.stopPropagation).toHaveBeenCalled();
		});

		it("does not suppress click when no long press fired", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));
			const event = makeMouseEvent();

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));
			await act(() => result.current.onTouchEnd()); // released early
			await act(() => result.current.onClick(event));

			expect(event.preventDefault).not.toHaveBeenCalled();
		});

		it("only suppresses the first click after a long press", async () => {
			const { result } = renderHook(() => useLongPress({ onLongPress }));

			await act(() => result.current.onTouchStart(makeTouchEvent(100)));
			await act(() => vi.advanceTimersByTime(LONG_PRESS_DELAY));

			const first = makeMouseEvent();
			const second = makeMouseEvent();

			await act(() => result.current.onClick(first));
			await act(() => result.current.onClick(second));

			expect(first.preventDefault).toHaveBeenCalled();
			expect(second.preventDefault).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// Exports
	// -------------------------------------------------------------------------

	describe("exported constants", () => {
		it("exports LONG_PRESS_DELAY as 500", () => {
			expect(LONG_PRESS_DELAY).toBe(500);
		});

		it("exports LONG_PRESS_MOVE_TOLERANCE as 10", () => {
			expect(LONG_PRESS_MOVE_TOLERANCE).toBe(10);
		});
	});
});
