import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ScrollFade from "../scroll-fade";

// ─── Mocks ──────────────────────────────────────────────────────────

let _resizeObserverCallback: ResizeObserverCallback;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

class MockResizeObserver {
	constructor(callback: ResizeObserverCallback) {
		_resizeObserverCallback = callback;
	}
	observe = mockObserve;
	unobserve = vi.fn();
	disconnect = mockDisconnect;
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
	const id = ++rafId;
	rafCallbacks.set(id, cb);
	return id;
});

vi.stubGlobal("cancelAnimationFrame", (id: number) => {
	rafCallbacks.delete(id);
});

function flushRAF() {
	const callbacks = Array.from(rafCallbacks.values());
	rafCallbacks.clear();
	callbacks.forEach((cb) => cb(performance.now()));
}

function setScrollDimensions(
	container: HTMLElement,
	dims: {
		scrollLeft?: number;
		scrollTop?: number;
		scrollWidth?: number;
		scrollHeight?: number;
		clientWidth?: number;
		clientHeight?: number;
	},
) {
	Object.defineProperty(container, "scrollLeft", {
		value: dims.scrollLeft ?? 0,
		configurable: true,
	});
	Object.defineProperty(container, "scrollTop", {
		value: dims.scrollTop ?? 0,
		configurable: true,
	});
	Object.defineProperty(container, "scrollWidth", {
		value: dims.scrollWidth ?? 0,
		configurable: true,
	});
	Object.defineProperty(container, "scrollHeight", {
		value: dims.scrollHeight ?? 0,
		configurable: true,
	});
	Object.defineProperty(container, "clientWidth", {
		value: dims.clientWidth ?? 0,
		configurable: true,
	});
	Object.defineProperty(container, "clientHeight", {
		value: dims.clientHeight ?? 0,
		configurable: true,
	});
}

// ─── Helpers ────────────────────────────────────────────────────────

function getContainer() {
	return screen.getByTestId("scroll-fade-container");
}

// Edge fades are now always mounted and toggled via opacity, so visibility
// is asserted on the `opacity-100` class rather than on element count.
function getAllFadeOverlays() {
	const root = screen.getByTestId("scroll-fade-root");
	return Array.from(root.querySelectorAll<HTMLElement>("[aria-hidden='true']"));
}

function getVisibleFadeOverlays() {
	return getAllFadeOverlays().filter((el) => el.classList.contains("opacity-100"));
}

// ─── Setup ──────────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	rafCallbacks.clear();
	rafId = 0;
});

afterEach(cleanup);

// ─── Tests ──────────────────────────────────────────────────────────

describe("ScrollFade", () => {
	describe("initial render", () => {
		it("renders children", () => {
			render(
				<ScrollFade>
					<p>Content</p>
				</ScrollFade>,
			);

			expect(screen.getByText("Content")).toBeInTheDocument();
		});

		it("shows no visible fade overlays when there is no overflow", () => {
			render(
				<ScrollFade>
					<p>Content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			setScrollDimensions(container, {
				scrollWidth: 300,
				clientWidth: 300,
			});

			act(() => flushRAF());

			expect(getVisibleFadeOverlays()).toHaveLength(0);
		});

		it("does not render status element when no overflow", () => {
			render(
				<ScrollFade>
					<p>Content</p>
				</ScrollFade>,
			);

			act(() => flushRAF());

			expect(screen.queryByRole("status")).not.toBeInTheDocument();
		});
	});

	describe("horizontal scrolling", () => {
		it("shows right fade when content overflows horizontally", () => {
			render(
				<ScrollFade axis="horizontal">
					<p>Wide content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			setScrollDimensions(container, {
				scrollLeft: 0,
				scrollWidth: 600,
				clientWidth: 300,
			});

			act(() => flushRAF());

			const overlays = getVisibleFadeOverlays();
			expect(overlays).toHaveLength(1);
			expect(overlays[0]!.className).toContain("right-0");
		});

		it("shows left fade when scrolled right", () => {
			render(
				<ScrollFade axis="horizontal">
					<p>Wide content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			setScrollDimensions(container, {
				scrollLeft: 100,
				scrollWidth: 600,
				clientWidth: 300,
			});

			act(() => flushRAF());

			const overlays = getVisibleFadeOverlays();
			expect(overlays).toHaveLength(2);
			const classNames = overlays.map((el) => el.className);
			expect(classNames.some((c) => c.includes("left-0"))).toBe(true);
			expect(classNames.some((c) => c.includes("right-0"))).toBe(true);
		});

		it("hides right fade when scrolled to end", () => {
			render(
				<ScrollFade axis="horizontal">
					<p>Wide content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			setScrollDimensions(container, {
				scrollLeft: 300,
				scrollWidth: 600,
				clientWidth: 300,
			});

			act(() => flushRAF());

			const overlays = getVisibleFadeOverlays();
			expect(overlays).toHaveLength(1);
			expect(overlays[0]!.className).toContain("left-0");
		});
	});

	describe("vertical scrolling", () => {
		it("shows bottom fade when content overflows vertically", () => {
			render(
				<ScrollFade axis="vertical">
					<p>Tall content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			setScrollDimensions(container, {
				scrollTop: 0,
				scrollHeight: 800,
				clientHeight: 400,
			});

			act(() => flushRAF());

			const overlays = getVisibleFadeOverlays();
			expect(overlays).toHaveLength(1);
			expect(overlays[0]!.className).toContain("bg-linear-to-t");
		});

		it("shows top fade when scrolled down", () => {
			render(
				<ScrollFade axis="vertical">
					<p>Tall content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			setScrollDimensions(container, {
				scrollTop: 100,
				scrollHeight: 800,
				clientHeight: 400,
			});

			act(() => flushRAF());

			const overlays = getVisibleFadeOverlays();
			expect(overlays).toHaveLength(2);
			const classNames = overlays.map((el) => el.className);
			expect(classNames.some((c) => c.includes("bg-linear-to-b"))).toBe(true);
			expect(classNames.some((c) => c.includes("bg-linear-to-t"))).toBe(true);
		});
	});

	describe("both axes", () => {
		it("shows all 4 fades when scrolled in the middle of both axes", () => {
			render(
				<ScrollFade axis="both">
					<p>Large content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			setScrollDimensions(container, {
				scrollLeft: 100,
				scrollTop: 100,
				scrollWidth: 600,
				scrollHeight: 800,
				clientWidth: 300,
				clientHeight: 400,
			});

			act(() => flushRAF());

			expect(getVisibleFadeOverlays()).toHaveLength(4);
		});
	});

	describe("edge fade mounting", () => {
		it("keeps both horizontal overlays mounted even with no overflow", () => {
			render(
				<ScrollFade axis="horizontal">
					<p>Content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			setScrollDimensions(container, { scrollWidth: 300, clientWidth: 300 });
			act(() => flushRAF());

			// Always-mounted overlays (toggled via opacity) — none visible here.
			expect(getAllFadeOverlays()).toHaveLength(2);
			expect(getVisibleFadeOverlays()).toHaveLength(0);
		});

		it("applies an opacity transition to overlays", () => {
			render(
				<ScrollFade axis="horizontal">
					<p>Content</p>
				</ScrollFade>,
			);

			getAllFadeOverlays().forEach((overlay) => {
				expect(overlay.className).toContain("transition-opacity");
			});
		});
	});

	describe("accessibility", () => {
		it("shows status element with aria-live when content overflows", () => {
			render(
				<ScrollFade axis="horizontal">
					<p>Wide content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			setScrollDimensions(container, {
				scrollLeft: 0,
				scrollWidth: 600,
				clientWidth: 300,
			});

			act(() => flushRAF());

			const status = screen.getByRole("status");
			expect(status).toBeInTheDocument();
			expect(status).toHaveAttribute("aria-live", "polite");
			expect(status).toHaveAttribute("aria-atomic", "true");
		});

		it("marks fade overlays as aria-hidden", () => {
			render(
				<ScrollFade axis="horizontal">
					<p>Wide content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			setScrollDimensions(container, {
				scrollLeft: 0,
				scrollWidth: 600,
				clientWidth: 300,
			});

			act(() => flushRAF());

			const root = screen.getByTestId("scroll-fade-root");
			const overlays = root.querySelectorAll(".pointer-events-none");
			expect(overlays.length).toBeGreaterThan(0);
			overlays.forEach((overlay) => {
				expect(overlay).toHaveAttribute("aria-hidden", "true");
			});
		});
	});

	describe("scrollRegionLabel prop", () => {
		it("makes the scroll container a focusable region when provided", () => {
			render(
				<ScrollFade scrollRegionLabel="Graphique des ventes">
					<p>Content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			expect(container).toHaveAttribute("role", "region");
			expect(container).toHaveAttribute("aria-label", "Graphique des ventes");
			expect(container).toHaveAttribute("tabindex", "0");
			expect(container.className).toContain("focus-visible:ring-2");
		});

		it("adds no region semantics when omitted", () => {
			render(
				<ScrollFade>
					<p>Content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			expect(container).not.toHaveAttribute("role");
			expect(container).not.toHaveAttribute("tabindex");
			expect(container).not.toHaveAttribute("aria-label");
		});
	});

	describe("rootClassName prop", () => {
		it("applies rootClassName to the root element", () => {
			render(
				<ScrollFade rootClassName="-mx-4">
					<p>Content</p>
				</ScrollFade>,
			);

			const root = screen.getByTestId("scroll-fade-root");
			expect(root.className).toContain("-mx-4");
		});
	});

	describe("hideScrollbar prop", () => {
		it("applies scrollbar-hiding classes by default", () => {
			render(
				<ScrollFade>
					<p>Content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			expect(container.className).toContain("scrollbar-width:none");
		});

		it("does not apply scrollbar-hiding classes when hideScrollbar is false", () => {
			render(
				<ScrollFade hideScrollbar={false}>
					<p>Content</p>
				</ScrollFade>,
			);

			const container = getContainer();
			expect(container.className).not.toContain("scrollbar-width:none");
		});
	});

	describe("cleanup", () => {
		it("removes event listeners and disconnects observer on unmount", () => {
			const removeSpy = vi.spyOn(HTMLElement.prototype, "removeEventListener");
			const windowRemoveSpy = vi.spyOn(window, "removeEventListener");

			const { unmount } = render(
				<ScrollFade>
					<p>Content</p>
				</ScrollFade>,
			);

			unmount();

			expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
			expect(windowRemoveSpy).toHaveBeenCalledWith("resize", expect.any(Function));
			expect(mockDisconnect).toHaveBeenCalled();

			removeSpy.mockRestore();
			windowRemoveSpy.mockRestore();
		});
	});
});
