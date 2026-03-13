import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSwipeToDismiss } from "../use-swipe-to-dismiss";
import { SWIPE_DISMISS_THRESHOLD } from "../announcement-bar.constants";

/**
 * jsdom doesn't support Touch constructor, so we dispatch
 * plain Events and manually set the touches array.
 */
function dispatchTouch(el: HTMLElement, type: string, clientY: number) {
	const event = new Event(type, { bubbles: true });
	if (type !== "touchend") {
		Object.defineProperty(event, "touches", {
			value: [{ clientY }],
		});
	}
	el.dispatchEvent(event);
}

describe("useSwipeToDismiss", () => {
	let element: HTMLDivElement;
	let elementRef: React.RefObject<HTMLDivElement | null>;

	beforeEach(() => {
		element = document.createElement("div");
		document.body.appendChild(element);
		elementRef = { current: element };
	});

	it("returns swipeOffset 0 by default", () => {
		const onDismiss = vi.fn();
		const { result } = renderHook(() =>
			useSwipeToDismiss({ elementRef, enabled: true, onDismiss }),
		);
		expect(result.current.swipeOffset).toBe(0);
	});

	it("tracks upward swipe offset (negative)", () => {
		const onDismiss = vi.fn();
		const { result } = renderHook(() =>
			useSwipeToDismiss({ elementRef, enabled: true, onDismiss }),
		);

		act(() => {
			dispatchTouch(element, "touchstart", 100);
		});
		act(() => {
			dispatchTouch(element, "touchmove", 80);
		});

		expect(result.current.swipeOffset).toBe(-20);
	});

	it("clamps downward swipe to 0 (no stretching down)", () => {
		const onDismiss = vi.fn();
		const { result } = renderHook(() =>
			useSwipeToDismiss({ elementRef, enabled: true, onDismiss }),
		);

		act(() => {
			dispatchTouch(element, "touchstart", 100);
		});
		act(() => {
			dispatchTouch(element, "touchmove", 150);
		});

		expect(result.current.swipeOffset).toBe(0);
	});

	it("calls onDismiss when swipe exceeds threshold", () => {
		const onDismiss = vi.fn();
		renderHook(() => useSwipeToDismiss({ elementRef, enabled: true, onDismiss }));

		act(() => {
			dispatchTouch(element, "touchstart", 100);
		});
		act(() => {
			dispatchTouch(element, "touchmove", 100 - SWIPE_DISMISS_THRESHOLD - 1);
		});
		act(() => {
			dispatchTouch(element, "touchend", 0);
		});

		expect(onDismiss).toHaveBeenCalledOnce();
	});

	it("snaps back when swipe does not exceed threshold", () => {
		const onDismiss = vi.fn();
		const { result } = renderHook(() =>
			useSwipeToDismiss({ elementRef, enabled: true, onDismiss }),
		);

		act(() => {
			dispatchTouch(element, "touchstart", 100);
		});
		act(() => {
			dispatchTouch(element, "touchmove", 100 - SWIPE_DISMISS_THRESHOLD + 5);
		});
		act(() => {
			dispatchTouch(element, "touchend", 0);
		});

		expect(onDismiss).not.toHaveBeenCalled();
		expect(result.current.swipeOffset).toBe(0);
	});

	it("does not track when disabled", () => {
		const onDismiss = vi.fn();
		const { result } = renderHook(() =>
			useSwipeToDismiss({ elementRef, enabled: false, onDismiss }),
		);

		act(() => {
			dispatchTouch(element, "touchstart", 100);
		});
		act(() => {
			dispatchTouch(element, "touchmove", 50);
		});

		expect(result.current.swipeOffset).toBe(0);
	});

	it("does not track when elementRef is null", () => {
		const onDismiss = vi.fn();
		const nullRef = { current: null };
		const { result } = renderHook(() =>
			useSwipeToDismiss({ elementRef: nullRef, enabled: true, onDismiss }),
		);

		expect(result.current.swipeOffset).toBe(0);
	});

	it("resets swipeOffset after touchend", () => {
		const onDismiss = vi.fn();
		const { result } = renderHook(() =>
			useSwipeToDismiss({ elementRef, enabled: true, onDismiss }),
		);

		act(() => {
			dispatchTouch(element, "touchstart", 100);
		});
		act(() => {
			dispatchTouch(element, "touchmove", 90);
		});
		expect(result.current.swipeOffset).toBe(-10);

		act(() => {
			dispatchTouch(element, "touchend", 0);
		});
		expect(result.current.swipeOffset).toBe(0);
	});
});
