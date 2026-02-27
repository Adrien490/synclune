import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockUseBackButtonClose } = vi.hoisted(() => ({
	mockUseBackButtonClose: vi.fn(),
}));

vi.mock("../use-back-button-close", () => ({
	useBackButtonClose: mockUseBackButtonClose,
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { useLightbox } from "../use-lightbox";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the onClose callback that was passed to the last useBackButtonClose call.
 */
function getCapturedOnClose(): (() => void) | undefined {
	const calls = mockUseBackButtonClose.mock.calls;
	if (calls.length === 0) return undefined;
	return calls[calls.length - 1][0]?.onClose;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useLightbox", () => {
	beforeEach(() => {
		mockUseBackButtonClose.mockReturnValue({ handleClose: vi.fn() });

		// Make requestAnimationFrame execute the callback synchronously
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			cb(0);
			return 0;
		});

		// Prevent errors from history.pushState in useBackButtonClose
		vi.spyOn(window.history, "pushState").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	// -------------------------------------------------------------------------
	// Initial state
	// -------------------------------------------------------------------------

	describe("initial state", () => {
		it("returns isOpen as false initially", () => {
			const { result } = renderHook(() => useLightbox());
			expect(result.current.isOpen).toBe(false);
		});

		it("exposes open and close as functions", () => {
			const { result } = renderHook(() => useLightbox());
			expect(typeof result.current.open).toBe("function");
			expect(typeof result.current.close).toBe("function");
		});
	});

	// -------------------------------------------------------------------------
	// open()
	// -------------------------------------------------------------------------

	describe("open()", () => {
		it("sets isOpen to true", () => {
			const { result } = renderHook(() => useLightbox());

			act(() => {
				result.current.open();
			});

			expect(result.current.isOpen).toBe(true);
		});

		it("saves document.activeElement as the previous focus target", () => {
			const button = document.createElement("button");
			button.focus = vi.fn();
			Object.defineProperty(document, "activeElement", {
				configurable: true,
				get: () => button,
			});

			const { result } = renderHook(() => useLightbox());

			act(() => {
				result.current.open();
			});

			// Close to trigger focus restore and verify the saved element gets focused
			act(() => {
				result.current.close();
			});

			expect(button.focus).toHaveBeenCalledTimes(1);
		});
	});

	// -------------------------------------------------------------------------
	// close()
	// -------------------------------------------------------------------------

	describe("close()", () => {
		it("sets isOpen to false", () => {
			const { result } = renderHook(() => useLightbox());

			act(() => {
				result.current.open();
			});
			expect(result.current.isOpen).toBe(true);

			act(() => {
				result.current.close();
			});
			expect(result.current.isOpen).toBe(false);
		});

		it("does not throw when called without a prior open()", () => {
			const { result } = renderHook(() => useLightbox());

			expect(() => {
				act(() => {
					result.current.close();
				});
			}).not.toThrow();
		});
	});

	// -------------------------------------------------------------------------
	// Focus management (WCAG 2.4.3)
	// -------------------------------------------------------------------------

	describe("focus management (WCAG 2.4.3)", () => {
		it("restores focus to the previously active element after open then close", () => {
			const button = document.createElement("button");
			button.focus = vi.fn();
			Object.defineProperty(document, "activeElement", {
				configurable: true,
				get: () => button,
			});

			const { result } = renderHook(() => useLightbox());

			act(() => {
				result.current.open();
			});
			act(() => {
				result.current.close();
			});

			expect(button.focus).toHaveBeenCalledTimes(1);
		});

		it("clears previousFocusRef after restoring focus so focus is not restored twice", () => {
			const button = document.createElement("button");
			button.focus = vi.fn();
			Object.defineProperty(document, "activeElement", {
				configurable: true,
				get: () => button,
			});

			const { result } = renderHook(() => useLightbox());

			act(() => {
				result.current.open();
			});
			// Close twice: first call should restore focus, second should not
			act(() => {
				result.current.close();
			});
			act(() => {
				result.current.close();
			});

			expect(button.focus).toHaveBeenCalledTimes(1);
		});

		it("does not throw if previousFocusRef has no focus method", () => {
			// Simulate an element without a focus function
			const div = document.createElement("div");

			(div as any).focus = undefined;
			Object.defineProperty(document, "activeElement", {
				configurable: true,
				get: () => div,
			});

			const { result } = renderHook(() => useLightbox());

			act(() => {
				result.current.open();
			});

			expect(() => {
				act(() => {
					result.current.close();
				});
			}).not.toThrow();
		});

		it("does not call focus when previousFocusRef is null at close time", () => {
			// Never called open(), so previousFocusRef.current remains null
			const focusSpy = vi.fn();
			const button = document.createElement("button");
			button.focus = focusSpy;

			const { result } = renderHook(() => useLightbox());

			act(() => {
				result.current.close();
			});

			expect(focusSpy).not.toHaveBeenCalled();
		});

		it("calls requestAnimationFrame when restoring focus", () => {
			const rafSpy = vi.fn((cb: FrameRequestCallback) => {
				cb(0);
				return 0;
			});
			vi.stubGlobal("requestAnimationFrame", rafSpy);

			const button = document.createElement("button");
			button.focus = vi.fn();
			Object.defineProperty(document, "activeElement", {
				configurable: true,
				get: () => button,
			});

			const { result } = renderHook(() => useLightbox());

			act(() => {
				result.current.open();
			});
			act(() => {
				result.current.close();
			});

			expect(rafSpy).toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// useBackButtonClose integration
	// -------------------------------------------------------------------------

	describe("useBackButtonClose integration", () => {
		it("calls useBackButtonClose with id 'lightbox'", () => {
			renderHook(() => useLightbox());

			expect(mockUseBackButtonClose).toHaveBeenCalledWith(
				expect.objectContaining({ id: "lightbox" }),
			);
		});

		it("passes isOpen=false to useBackButtonClose initially", () => {
			renderHook(() => useLightbox());

			expect(mockUseBackButtonClose).toHaveBeenCalledWith(
				expect.objectContaining({ isOpen: false }),
			);
		});

		it("passes isOpen=true to useBackButtonClose after open()", () => {
			const { result } = renderHook(() => useLightbox());

			act(() => {
				result.current.open();
			});

			// The most recent call should reflect the updated isOpen value
			const lastCall = mockUseBackButtonClose.mock.calls.at(-1)?.[0];
			expect(lastCall?.isOpen).toBe(true);
		});

		it("closes the lightbox when the onClose callback from useBackButtonClose is invoked", () => {
			const { result } = renderHook(() => useLightbox());

			act(() => {
				result.current.open();
			});
			expect(result.current.isOpen).toBe(true);

			const onClose = getCapturedOnClose();
			expect(onClose).toBeDefined();

			act(() => {
				onClose!();
			});

			expect(result.current.isOpen).toBe(false);
		});

		it("restores focus when the onClose callback from useBackButtonClose is invoked", () => {
			const button = document.createElement("button");
			button.focus = vi.fn();
			Object.defineProperty(document, "activeElement", {
				configurable: true,
				get: () => button,
			});

			const { result } = renderHook(() => useLightbox());

			act(() => {
				result.current.open();
			});

			const onClose = getCapturedOnClose();

			act(() => {
				onClose!();
			});

			expect(button.focus).toHaveBeenCalledTimes(1);
		});

		it("passes an onClose function to useBackButtonClose", () => {
			renderHook(() => useLightbox());

			expect(mockUseBackButtonClose).toHaveBeenCalledWith(
				expect.objectContaining({ onClose: expect.any(Function) }),
			);
		});
	});

	// -------------------------------------------------------------------------
	// popstate / back button (via captured onClose)
	// -------------------------------------------------------------------------

	describe("back button behavior via popstate", () => {
		it("closes lightbox when popstate fires while open", () => {
			const { result } = renderHook(() => useLightbox());

			act(() => {
				result.current.open();
			});
			expect(result.current.isOpen).toBe(true);

			// Simulate the back button by invoking the captured onClose callback
			const onClose = getCapturedOnClose();
			act(() => {
				onClose!();
			});

			expect(result.current.isOpen).toBe(false);
		});

		it("does not throw when popstate fires while already closed", () => {
			renderHook(() => useLightbox());

			const onClose = getCapturedOnClose();
			expect(() => {
				act(() => {
					onClose!();
				});
			}).not.toThrow();
		});
	});
});
