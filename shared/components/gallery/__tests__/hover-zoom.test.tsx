import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => ({
	useReducedMotion: () => mockReducedMotion.value,
}));

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		blurDataURL,
		...props
	}: {
		src: string;
		alt: string;
		blurDataURL?: string;
		[key: string]: unknown;
		// eslint-disable-next-line @next/next/no-img-element
	}) => <img src={src} alt={alt} data-blur-data-url={blurDataURL} {...props} />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/modules/media/constants/image-config.constants", () => ({
	GALLERY_MAIN_SIZES: "(max-width: 768px) 100vw, 50vw",
}));

// ============================================================================
// RAF / getBoundingClientRect HARNESS
// ============================================================================

let pendingFrameCallback: FrameRequestCallback | null = null;
let rafCancelCount = 0;
let lastRafId = 0;

function flushRAF() {
	const cb = pendingFrameCallback;
	pendingFrameCallback = null;
	cb?.(performance.now());
}

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { GalleryHoverZoom } from "../hover-zoom";

// ============================================================================
// GalleryHoverZoom
// ============================================================================

describe("GalleryHoverZoom", () => {
	beforeEach(() => {
		mockReducedMotion.value = false;
		pendingFrameCallback = null;
		rafCancelCount = 0;
		lastRafId = 0;

		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			pendingFrameCallback = cb;
			return ++lastRafId;
		});
		vi.stubGlobal("cancelAnimationFrame", () => {
			rafCancelCount += 1;
			pendingFrameCallback = null;
		});

		// Container 400x400 ancré en (0,0) — mouse events à (100, 200) = 25% x, 50% y
		Element.prototype.getBoundingClientRect = vi.fn(
			() =>
				({
					left: 0,
					top: 0,
					right: 400,
					bottom: 400,
					width: 400,
					height: 400,
					x: 0,
					y: 0,
					toJSON: () => ({}),
				}) as DOMRect,
		);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	// ============================================================================
	// Rendering
	// ============================================================================

	describe("rendering", () => {
		it("renders image with alt text", () => {
			render(<GalleryHoverZoom src="/test.jpg" alt="Test image" />);
			expect(screen.getByAltText("Test image")).toBeInTheDocument();
		});

		it("disabled mode renders without zoom container classes", () => {
			const { container } = render(
				<GalleryHoverZoom src="/test.jpg" alt="No zoom" enabled={false} />,
			);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.className).not.toContain("overflow-hidden");
			expect(wrapper.className).not.toContain("cursor-crosshair");
		});

		it("enabled mode has overflow-hidden class", () => {
			const { container } = render(
				<GalleryHoverZoom src="/test.jpg" alt="Zoom enabled" enabled={true} />,
			);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.className).toContain("overflow-hidden");
		});

		it("image has correct src and alt props", () => {
			render(<GalleryHoverZoom src="/product.jpg" alt="Product" />);
			const img = screen.getByAltText("Product") as HTMLImageElement;
			expect(img.src).toContain("/product.jpg");
			expect(img.alt).toBe("Product");
		});

		it("passes blurDataUrl as blurDataURL prop when provided", () => {
			const blur = "data:image/jpeg;base64,abc123";
			render(<GalleryHoverZoom src="/test.jpg" alt="Blur test" blurDataUrl={blur} />);
			const img = screen.getByAltText("Blur test");
			expect(img).toHaveAttribute("data-blur-data-url", blur);
		});

		it("enabled mode has cursor-crosshair class", () => {
			const { container } = render(
				<GalleryHoverZoom src="/test.jpg" alt="Cursor test" enabled={true} />,
			);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.className).toContain("cursor-crosshair");
		});

		it("applies transition-transform class when prefersReducedMotion=false", () => {
			mockReducedMotion.value = false;
			render(<GalleryHoverZoom src="/test.jpg" alt="Motion test" />);
			const img = screen.getByAltText("Motion test");
			expect(img.className).toContain("transition-transform");
		});

		it("omits transition-transform when prefersReducedMotion=true", () => {
			mockReducedMotion.value = true;
			render(<GalleryHoverZoom src="/test.jpg" alt="Reduced motion" />);
			const img = screen.getByAltText("Reduced motion");
			expect(img.className).not.toContain("transition-transform");
		});
	});

	// ============================================================================
	// Zoom interactions
	// ============================================================================

	describe("zoom interactions", () => {
		it("onMouseEnter applies scale(zoomLevel) on image transform (default 2)", () => {
			const { container } = render(<GalleryHoverZoom src="/x.jpg" alt="zoom2" />);
			const wrapper = container.firstChild as HTMLElement;
			const img = screen.getByAltText("zoom2") as HTMLImageElement;

			fireEvent.mouseEnter(wrapper);

			expect(img.style.transform).toContain("scale(2)");
		});

		it("zoomLevel=3 applies scale(3) on mouse enter", () => {
			const { container } = render(<GalleryHoverZoom src="/x.jpg" alt="zoom3" zoomLevel={3} />);
			const wrapper = container.firstChild as HTMLElement;
			const img = screen.getByAltText("zoom3") as HTMLImageElement;

			fireEvent.mouseEnter(wrapper);

			expect(img.style.transform).toContain("scale(3)");
		});

		it("mouseMove at (100, 200) sets transformOrigin to '25% 50%' after RAF flush", () => {
			const { container } = render(<GalleryHoverZoom src="/x.jpg" alt="origin" />);
			const wrapper = container.firstChild as HTMLElement;
			const img = screen.getByAltText("origin") as HTMLImageElement;

			fireEvent.mouseEnter(wrapper);
			fireEvent.mouseMove(wrapper, { clientX: 100, clientY: 200 });

			expect(pendingFrameCallback).not.toBeNull();
			flushRAF();

			expect(img.style.transformOrigin).toBe("25% 50%");
		});

		it("throttles consecutive mouseMove via RAF (one frame scheduled at a time)", () => {
			const { container } = render(<GalleryHoverZoom src="/x.jpg" alt="throttle" />);
			const wrapper = container.firstChild as HTMLElement;

			fireEvent.mouseEnter(wrapper);
			const idBefore = lastRafId;
			fireEvent.mouseMove(wrapper, { clientX: 50, clientY: 50 });
			const idAfterFirst = lastRafId;
			// 2nd move before flush — should be throttled (no new RAF id)
			fireEvent.mouseMove(wrapper, { clientX: 200, clientY: 300 });
			const idAfterSecond = lastRafId;

			expect(idAfterFirst).toBe(idBefore + 1);
			expect(idAfterSecond).toBe(idAfterFirst);
		});

		it("onMouseLeave resets transform to scale(1) and cancels pending RAF", () => {
			const { container } = render(<GalleryHoverZoom src="/x.jpg" alt="leave" />);
			const wrapper = container.firstChild as HTMLElement;
			const img = screen.getByAltText("leave") as HTMLImageElement;

			fireEvent.mouseEnter(wrapper);
			fireEvent.mouseMove(wrapper, { clientX: 100, clientY: 100 });
			expect(pendingFrameCallback).not.toBeNull();

			const cancelsBefore = rafCancelCount;
			fireEvent.mouseLeave(wrapper);

			expect(rafCancelCount).toBe(cancelsBefore + 1);
			expect(img.style.transform).toContain("scale(1)");
		});

		it("does not schedule RAF on mouseMove before mouseEnter (isZooming=false)", () => {
			const { container } = render(<GalleryHoverZoom src="/x.jpg" alt="no-zoom" />);
			const wrapper = container.firstChild as HTMLElement;

			fireEvent.mouseMove(wrapper, { clientX: 100, clientY: 100 });

			expect(pendingFrameCallback).toBeNull();
		});
	});

	// ============================================================================
	// Cleanup
	// ============================================================================

	describe("cleanup", () => {
		it("cancels pending RAF on unmount", () => {
			const { container, unmount } = render(<GalleryHoverZoom src="/x.jpg" alt="unmount" />);
			const wrapper = container.firstChild as HTMLElement;

			fireEvent.mouseEnter(wrapper);
			fireEvent.mouseMove(wrapper, { clientX: 100, clientY: 100 });
			expect(pendingFrameCallback).not.toBeNull();

			const cancelsBefore = rafCancelCount;
			unmount();

			expect(rafCancelCount).toBeGreaterThan(cancelsBefore);
		});
	});
});
