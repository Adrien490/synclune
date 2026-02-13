import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────
const mockPush = vi.fn();
const mockPrefetch = vi.fn();
const mockPathname = "/admin/orders";
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
		prefetch: mockPrefetch,
	}),
	usePathname: () => mockPathname,
	useSearchParams: () => mockSearchParams,
}));

// useEffectEvent is stable in React 19, but jsdom may need a polyfill.
// If the hook import fails, we mock it as a passthrough.
vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		// useEffectEvent: identity wrapper for test environment
		useEffectEvent: actual.useEffectEvent ?? ((fn: Function) => fn),
	};
});

import { useCursorPagination } from "./use-cursor-pagination";

// ─── Helpers ────────────────────────────────────────────────────────

function setSearchParams(params: Record<string, string>) {
	mockSearchParams = new URLSearchParams(params);
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("useCursorPagination", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams = new URLSearchParams();
		// Define window.scrollTo and window.matchMedia (jsdom doesn't provide them)
		window.scrollTo = vi.fn();
		window.matchMedia = vi.fn().mockReturnValue({
			matches: false,
			media: "",
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		});
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	const defaultProps = {
		nextCursor: "next-abc",
		prevCursor: "prev-xyz",
	};

	// ─── Return values ─────────────────────────────────────────────

	describe("return values", () => {
		it("returns correct initial values with no searchParams", () => {
			const { result } = renderHook(() => useCursorPagination(defaultProps));

			expect(result.current.perPage).toBe(20); // DEFAULT_PER_PAGE
			expect(result.current.cursor).toBeUndefined();
			expect(result.current.pathname).toBe("/admin/orders");
			expect(result.current.isPending).toBe(false);
		});

		it("reads perPage from searchParams", () => {
			setSearchParams({ perPage: "50" });
			const { result } = renderHook(() => useCursorPagination(defaultProps));

			expect(result.current.perPage).toBe(50);
		});

		it("falls back to DEFAULT_PER_PAGE when perPage is invalid", () => {
			setSearchParams({ perPage: "invalid" });
			const { result } = renderHook(() => useCursorPagination(defaultProps));

			expect(result.current.perPage).toBe(20);
		});

		it("reads cursor from searchParams", () => {
			setSearchParams({ cursor: "some-cursor-id" });
			const { result } = renderHook(() => useCursorPagination(defaultProps));

			expect(result.current.cursor).toBe("some-cursor-id");
		});
	});

	// ─── Navigation ─────────────────────────────────────────────────

	describe("handleNext", () => {
		it("pushes URL with cursor and direction=forward", () => {
			const { result } = renderHook(() => useCursorPagination(defaultProps));

			act(() => {
				result.current.handleNext();
			});

			expect(mockPush).toHaveBeenCalledTimes(1);
			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.get("cursor")).toBe("next-abc");
			expect(params.get("direction")).toBe("forward");
		});

		it("preserves existing searchParams", () => {
			setSearchParams({ filter_status: "active", sortBy: "name" });
			const { result } = renderHook(() => useCursorPagination(defaultProps));

			act(() => {
				result.current.handleNext();
			});

			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.get("filter_status")).toBe("active");
			expect(params.get("sortBy")).toBe("name");
			expect(params.get("cursor")).toBe("next-abc");
		});

		it("does not navigate when nextCursor is null", () => {
			const { result } = renderHook(() =>
				useCursorPagination({ nextCursor: null, prevCursor: "prev-xyz" }),
			);

			act(() => {
				result.current.handleNext();
			});

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("uses scroll: false to avoid browser scroll", () => {
			const { result } = renderHook(() => useCursorPagination(defaultProps));

			act(() => {
				result.current.handleNext();
			});

			expect(mockPush).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ scroll: false }),
			);
		});
	});

	describe("handlePrevious", () => {
		it("pushes URL with cursor and direction=backward", () => {
			const { result } = renderHook(() => useCursorPagination(defaultProps));

			act(() => {
				result.current.handlePrevious();
			});

			expect(mockPush).toHaveBeenCalledTimes(1);
			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.get("cursor")).toBe("prev-xyz");
			expect(params.get("direction")).toBe("backward");
		});

		it("does not navigate when prevCursor is null", () => {
			const { result } = renderHook(() =>
				useCursorPagination({ nextCursor: "next-abc", prevCursor: null }),
			);

			act(() => {
				result.current.handlePrevious();
			});

			expect(mockPush).not.toHaveBeenCalled();
		});
	});

	describe("handleReset", () => {
		it("removes cursor and direction from URL", () => {
			setSearchParams({
				cursor: "some-id",
				direction: "forward",
				perPage: "50",
			});
			const { result } = renderHook(() => useCursorPagination(defaultProps));

			act(() => {
				result.current.handleReset();
			});

			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.has("cursor")).toBe(false);
			expect(params.has("direction")).toBe(false);
			expect(params.get("perPage")).toBe("50"); // Preserved
		});
	});

	describe("handlePerPageChange", () => {
		it("sets new perPage and resets cursor/direction", () => {
			setSearchParams({
				cursor: "some-id",
				direction: "forward",
				perPage: "20",
			});
			const { result } = renderHook(() => useCursorPagination(defaultProps));

			act(() => {
				result.current.handlePerPageChange(100);
			});

			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.get("perPage")).toBe("100");
			expect(params.has("cursor")).toBe(false);
			expect(params.has("direction")).toBe(false);
		});

		it("does not navigate when perPage is unchanged", () => {
			setSearchParams({ perPage: "50" });
			const { result } = renderHook(() => useCursorPagination(defaultProps));

			act(() => {
				result.current.handlePerPageChange(50);
			});

			expect(mockPush).not.toHaveBeenCalled();
		});
	});

	// ─── Prefetch ───────────────────────────────────────────────────

	describe("prefetch", () => {
		it("prefetches next and previous pages on mount", () => {
			renderHook(() => useCursorPagination(defaultProps));

			// Prefetch is in a useEffect, should have been called
			expect(mockPrefetch).toHaveBeenCalledTimes(2);

			const calls = mockPrefetch.mock.calls.map((c) => c[0] as string);
			const nextParams = new URLSearchParams(calls[0].replace("?", ""));
			const prevParams = new URLSearchParams(calls[1].replace("?", ""));

			expect(nextParams.get("cursor")).toBe("next-abc");
			expect(nextParams.get("direction")).toBe("forward");
			expect(prevParams.get("cursor")).toBe("prev-xyz");
			expect(prevParams.get("direction")).toBe("backward");
		});

		it("skips prefetch when cursor is null", () => {
			renderHook(() =>
				useCursorPagination({ nextCursor: null, prevCursor: null }),
			);

			expect(mockPrefetch).not.toHaveBeenCalled();
		});

		it("prefetches only next when prevCursor is null", () => {
			renderHook(() =>
				useCursorPagination({ nextCursor: "next-abc", prevCursor: null }),
			);

			expect(mockPrefetch).toHaveBeenCalledTimes(1);
			const url = mockPrefetch.mock.calls[0][0] as string;
			expect(url).toContain("cursor=next-abc");
		});
	});

	// ─── Keyboard shortcuts ─────────────────────────────────────────

	describe("keyboard shortcuts", () => {
		it("navigates next on Alt+ArrowRight", () => {
			renderHook(() => useCursorPagination(defaultProps));

			const event = new KeyboardEvent("keydown", {
				key: "ArrowRight",
				altKey: true,
				bubbles: true,
			});
			window.dispatchEvent(event);

			expect(mockPush).toHaveBeenCalledTimes(1);
			const url = mockPush.mock.calls[0][0] as string;
			expect(url).toContain("cursor=next-abc");
			expect(url).toContain("direction=forward");
		});

		it("navigates previous on Alt+ArrowLeft", () => {
			renderHook(() => useCursorPagination(defaultProps));

			const event = new KeyboardEvent("keydown", {
				key: "ArrowLeft",
				altKey: true,
				bubbles: true,
			});
			window.dispatchEvent(event);

			expect(mockPush).toHaveBeenCalledTimes(1);
			const url = mockPush.mock.calls[0][0] as string;
			expect(url).toContain("cursor=prev-xyz");
			expect(url).toContain("direction=backward");
		});

		it("does not navigate on Alt+ArrowRight when nextCursor is null", () => {
			renderHook(() =>
				useCursorPagination({ nextCursor: null, prevCursor: "prev-xyz" }),
			);

			window.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "ArrowRight",
					altKey: true,
					bubbles: true,
				}),
			);

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("does not navigate without Alt key", () => {
			renderHook(() => useCursorPagination(defaultProps));

			window.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "ArrowRight",
					altKey: false,
					bubbles: true,
				}),
			);

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("does not intercept when target is an input", () => {
			renderHook(() => useCursorPagination(defaultProps));

			const input = document.createElement("input");
			document.body.appendChild(input);

			const event = new KeyboardEvent("keydown", {
				key: "ArrowRight",
				altKey: true,
				bubbles: true,
			});
			// Override target since KeyboardEvent constructor doesn't support it
			Object.defineProperty(event, "target", { value: input });
			window.dispatchEvent(event);

			expect(mockPush).not.toHaveBeenCalled();
			document.body.removeChild(input);
		});

		it("does not intercept when target is a textarea", () => {
			renderHook(() => useCursorPagination(defaultProps));

			const textarea = document.createElement("textarea");
			document.body.appendChild(textarea);

			const event = new KeyboardEvent("keydown", {
				key: "ArrowLeft",
				altKey: true,
				bubbles: true,
			});
			Object.defineProperty(event, "target", { value: textarea });
			window.dispatchEvent(event);

			expect(mockPush).not.toHaveBeenCalled();
			document.body.removeChild(textarea);
		});

		it("does not intercept when target is contentEditable", () => {
			renderHook(() => useCursorPagination(defaultProps));

			const div = document.createElement("div");
			div.contentEditable = "true";
			// jsdom may not reflect isContentEditable, so set it explicitly
			Object.defineProperty(div, "isContentEditable", { value: true });
			document.body.appendChild(div);

			const event = new KeyboardEvent("keydown", {
				key: "ArrowRight",
				altKey: true,
				bubbles: true,
			});
			Object.defineProperty(event, "target", { value: div });
			window.dispatchEvent(event);

			expect(mockPush).not.toHaveBeenCalled();
			document.body.removeChild(div);
		});

		it("does not register shortcuts when enableKeyboardShortcuts=false", () => {
			renderHook(() =>
				useCursorPagination({
					...defaultProps,
					enableKeyboardShortcuts: false,
				}),
			);

			window.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "ArrowRight",
					altKey: true,
					bubbles: true,
				}),
			);

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("cleans up event listener on unmount", () => {
			const addSpy = vi.spyOn(window, "addEventListener");
			const removeSpy = vi.spyOn(window, "removeEventListener");

			const { unmount } = renderHook(() =>
				useCursorPagination(defaultProps),
			);

			expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

			unmount();

			expect(removeSpy).toHaveBeenCalledWith(
				"keydown",
				expect.any(Function),
			);
		});
	});

	// ─── Scroll behavior ────────────────────────────────────────────

	describe("scroll behavior on navigation", () => {
		it("scrolls to top with smooth behavior by default", () => {
			setSearchParams({ cursor: "old-cursor" });
			const { rerender } = renderHook(
				({ cursor }: { cursor: string }) => {
					mockSearchParams = new URLSearchParams({ cursor });
					return useCursorPagination(defaultProps);
				},
				{ initialProps: { cursor: "old-cursor" } },
			);

			// Clear mount-triggered call
			(window.scrollTo as ReturnType<typeof vi.fn>).mockClear();

			rerender({ cursor: "new-cursor" });

			expect(window.scrollTo).toHaveBeenCalledWith({
				top: 0,
				behavior: "smooth",
			});
		});

		it("uses instant scroll when prefers-reduced-motion is enabled", () => {
			window.matchMedia = vi.fn().mockReturnValue({
				matches: true, // prefers-reduced-motion: reduce
				media: "",
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			});

			setSearchParams({ cursor: "old-cursor" });
			const { rerender } = renderHook(
				({ cursor }: { cursor: string }) => {
					mockSearchParams = new URLSearchParams({ cursor });
					return useCursorPagination(defaultProps);
				},
				{ initialProps: { cursor: "old-cursor" } },
			);

			// Clear mount-triggered call
			(window.scrollTo as ReturnType<typeof vi.fn>).mockClear();

			rerender({ cursor: "new-cursor" });

			expect(window.scrollTo).toHaveBeenCalledWith({
				top: 0,
				behavior: "instant",
			});
		});

		it("calls custom onNavigate instead of default scroll", () => {
			const onNavigate = vi.fn();

			setSearchParams({ cursor: "old-cursor" });
			const { rerender } = renderHook(
				({ cursor }: { cursor: string }) => {
					mockSearchParams = new URLSearchParams({ cursor });
					return useCursorPagination({
						...defaultProps,
						onNavigate,
					});
				},
				{ initialProps: { cursor: "old-cursor" } },
			);

			// Clear mount-triggered call (sentinel Symbol !== "old-cursor" fires on mount)
			onNavigate.mockClear();
			(window.scrollTo as ReturnType<typeof vi.fn>).mockClear();

			rerender({ cursor: "new-cursor" });

			expect(onNavigate).toHaveBeenCalledTimes(1);
			expect(window.scrollTo).not.toHaveBeenCalled();
		});
	});

	// ─── Focus management ───────────────────────────────────────────

	describe("focus management", () => {
		it("focuses target ref after navigation via requestAnimationFrame", () => {
			const mockFocus = vi.fn();
			const focusTargetRef = {
				current: { focus: mockFocus } as unknown as HTMLElement,
			};

			// Mock requestAnimationFrame
			window.requestAnimationFrame = vi.fn((cb) => {
				cb(0);
				return 0;
			});

			setSearchParams({ cursor: "old-cursor" });
			const { rerender } = renderHook(
				({ cursor }: { cursor: string }) => {
					mockSearchParams = new URLSearchParams({ cursor });
					return useCursorPagination({
						...defaultProps,
						focusTargetRef,
					});
				},
				{ initialProps: { cursor: "old-cursor" } },
			);

			// Clear mount-triggered calls
			mockFocus.mockClear();

			rerender({ cursor: "new-cursor" });

			expect(window.requestAnimationFrame).toHaveBeenCalled();
			expect(mockFocus).toHaveBeenCalledWith({ preventScroll: true });
		});
	});
});
