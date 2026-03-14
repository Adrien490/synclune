import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useEdgeSwipe } from "../use-edge-swipe";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTouch(clientX: number, clientY: number): Touch {
	return { clientX, clientY } as Touch;
}

function fireTouchStart(clientX: number, clientY = 0): void {
	const event = new TouchEvent("touchstart", {
		touches: [createTouch(clientX, clientY)],
	});
	document.dispatchEvent(event);
}

function fireTouchMove(clientX: number, clientY = 0): void {
	const event = new TouchEvent("touchmove", {
		touches: [createTouch(clientX, clientY)],
	});
	document.dispatchEvent(event);
}

function fireTouchEnd(): void {
	document.dispatchEvent(new TouchEvent("touchend"));
}

/**
 * Simulate a full edge swipe gesture from the left edge.
 */
function swipeFromEdge(endX = 70, endY = 0): void {
	fireTouchStart(10, 0);
	fireTouchMove(endX, endY);
	fireTouchEnd();
}

let mockMatches: boolean;
const matchMediaMock = vi.fn();

beforeEach(() => {
	mockMatches = false;
	matchMediaMock.mockImplementation(
		(query: string) =>
			({
				get matches() {
					return mockMatches;
				},
				media: query,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(),
				onchange: null,
			}) as unknown as MediaQueryList,
	);
	vi.stubGlobal("matchMedia", matchMediaMock);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useEdgeSwipe", () => {
	// -----------------------------------------------------------------------
	// Basic swipe detection
	// -----------------------------------------------------------------------

	describe("swipe detection", () => {
		it("calls onOpen when a valid edge swipe is performed", () => {
			const onOpen = vi.fn();
			renderHook(() => useEdgeSwipe(onOpen, false));

			swipeFromEdge();

			expect(onOpen).toHaveBeenCalledOnce();
		});

		it("does not call onOpen for swipes starting beyond the edge zone (>20px)", () => {
			const onOpen = vi.fn();
			renderHook(() => useEdgeSwipe(onOpen, false));

			fireTouchStart(25, 0);
			fireTouchMove(80, 0);
			fireTouchEnd();

			expect(onOpen).not.toHaveBeenCalled();
		});

		it("does not call onOpen if horizontal distance is insufficient (<= 50px)", () => {
			const onOpen = vi.fn();
			renderHook(() => useEdgeSwipe(onOpen, false));

			fireTouchStart(10, 0);
			fireTouchMove(55, 0); // dx = 45, not enough
			fireTouchEnd();

			expect(onOpen).not.toHaveBeenCalled();
		});

		it("calls onOpen when swipe exactly exceeds 50px threshold", () => {
			const onOpen = vi.fn();
			renderHook(() => useEdgeSwipe(onOpen, false));

			fireTouchStart(5, 0);
			fireTouchMove(56, 0); // dx = 51, exceeds 50
			fireTouchEnd();

			expect(onOpen).toHaveBeenCalledOnce();
		});
	});

	// -----------------------------------------------------------------------
	// Vertical scrolling cancellation
	// -----------------------------------------------------------------------

	describe("vertical movement", () => {
		it("cancels tracking when vertical movement dominates", () => {
			const onOpen = vi.fn();
			renderHook(() => useEdgeSwipe(onOpen, false));

			fireTouchStart(10, 0);
			fireTouchMove(30, 25); // dy (25) > dx (20) → cancel
			fireTouchMove(80, 25); // should be ignored since tracking cancelled
			fireTouchEnd();

			expect(onOpen).not.toHaveBeenCalled();
		});

		it("triggers when horizontal movement dominates vertical", () => {
			const onOpen = vi.fn();
			renderHook(() => useEdgeSwipe(onOpen, false));

			fireTouchStart(10, 0);
			fireTouchMove(70, 10); // dx (60) > dy (10) → valid
			fireTouchEnd();

			expect(onOpen).toHaveBeenCalledOnce();
		});
	});

	// -----------------------------------------------------------------------
	// isOpen guard
	// -----------------------------------------------------------------------

	describe("isOpen guard", () => {
		it("does not track swipes when isOpen is true", () => {
			const onOpen = vi.fn();
			renderHook(() => useEdgeSwipe(onOpen, true));

			swipeFromEdge();

			expect(onOpen).not.toHaveBeenCalled();
		});

		it("resumes tracking when isOpen transitions from true to false", () => {
			const onOpen = vi.fn();
			let isOpen = true;
			const { rerender } = renderHook(() => useEdgeSwipe(onOpen, isOpen));

			swipeFromEdge();
			expect(onOpen).not.toHaveBeenCalled();

			isOpen = false;
			rerender();

			swipeFromEdge();
			expect(onOpen).toHaveBeenCalledOnce();
		});
	});

	// -----------------------------------------------------------------------
	// Media query (viewport gating)
	// -----------------------------------------------------------------------

	describe("media query gating", () => {
		it("does not trigger on wide viewports (matches min-width)", () => {
			mockMatches = true;
			const onOpen = vi.fn();
			renderHook(() => useEdgeSwipe(onOpen, false));

			swipeFromEdge();

			expect(onOpen).not.toHaveBeenCalled();
		});

		it("uses custom maxWidth for the media query", () => {
			renderHook(() => useEdgeSwipe(vi.fn(), false, 768));

			expect(matchMediaMock).toHaveBeenCalledWith("(min-width: 768px)");
		});

		it("defaults maxWidth to 1024", () => {
			renderHook(() => useEdgeSwipe(vi.fn(), false));

			expect(matchMediaMock).toHaveBeenCalledWith("(min-width: 1024px)");
		});

		it("reacts to viewport changes without remounting", () => {
			const onOpen = vi.fn();
			renderHook(() => useEdgeSwipe(onOpen, false));

			// Narrow viewport — swipe works
			swipeFromEdge();
			expect(onOpen).toHaveBeenCalledOnce();

			// Simulate viewport going wide
			mockMatches = true;
			swipeFromEdge();
			expect(onOpen).toHaveBeenCalledOnce(); // Still 1 — no new call

			// Simulate viewport going narrow again
			mockMatches = false;
			swipeFromEdge();
			expect(onOpen).toHaveBeenCalledTimes(2);
		});
	});

	// -----------------------------------------------------------------------
	// Callback ref stability
	// -----------------------------------------------------------------------

	describe("callback ref stability", () => {
		it("uses the latest onOpen callback without re-registering listeners", () => {
			const onOpen1 = vi.fn();
			const onOpen2 = vi.fn();

			const { rerender } = renderHook(({ onOpen }) => useEdgeSwipe(onOpen, false), {
				initialProps: { onOpen: onOpen1 },
			});

			rerender({ onOpen: onOpen2 });

			swipeFromEdge();

			expect(onOpen1).not.toHaveBeenCalled();
			expect(onOpen2).toHaveBeenCalledOnce();
		});
	});

	// -----------------------------------------------------------------------
	// Cleanup
	// -----------------------------------------------------------------------

	describe("cleanup", () => {
		it("removes all event listeners on unmount", () => {
			const addSpy = vi.spyOn(document, "addEventListener");
			const removeSpy = vi.spyOn(document, "removeEventListener");

			const { unmount } = renderHook(() => useEdgeSwipe(vi.fn(), false));

			// 3 listeners added: touchstart, touchmove, touchend
			const touchEvents = addSpy.mock.calls
				.map(([event]) => event)
				.filter((e) => e.startsWith("touch"));
			expect(touchEvents).toEqual(["touchstart", "touchmove", "touchend"]);

			unmount();

			const removedTouchEvents = removeSpy.mock.calls
				.map(([event]) => event)
				.filter((e) => (e as string).startsWith("touch"));
			expect(removedTouchEvents).toEqual(["touchstart", "touchmove", "touchend"]);

			addSpy.mockRestore();
			removeSpy.mockRestore();
		});

		it("does not fire after unmount", () => {
			const onOpen = vi.fn();
			const { unmount } = renderHook(() => useEdgeSwipe(onOpen, false));

			unmount();
			swipeFromEdge();

			expect(onOpen).not.toHaveBeenCalled();
		});
	});

	// -----------------------------------------------------------------------
	// Edge cases
	// -----------------------------------------------------------------------

	describe("edge cases", () => {
		it("only triggers once per swipe gesture (tracking resets after trigger)", () => {
			const onOpen = vi.fn();
			renderHook(() => useEdgeSwipe(onOpen, false));

			fireTouchStart(10, 0);
			fireTouchMove(70, 0); // triggers
			fireTouchMove(120, 0); // should not trigger again
			fireTouchEnd();

			expect(onOpen).toHaveBeenCalledOnce();
		});

		it("resets tracking on touchend even without a trigger", () => {
			const onOpen = vi.fn();
			renderHook(() => useEdgeSwipe(onOpen, false));

			// First gesture — incomplete
			fireTouchStart(10, 0);
			fireTouchMove(30, 0); // not enough
			fireTouchEnd();

			// Second gesture — should work independently
			swipeFromEdge();

			expect(onOpen).toHaveBeenCalledOnce();
		});

		it("handles touch events with no touches gracefully", () => {
			const onOpen = vi.fn();
			renderHook(() => useEdgeSwipe(onOpen, false));

			// TouchEvent with empty touches
			document.dispatchEvent(new TouchEvent("touchstart", { touches: [] }));
			document.dispatchEvent(new TouchEvent("touchmove", { touches: [] }));
			fireTouchEnd();

			expect(onOpen).not.toHaveBeenCalled();
		});
	});
});
