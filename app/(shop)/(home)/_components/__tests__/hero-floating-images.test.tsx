import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// jsdom does not implement IntersectionObserver — provide a minimal stub that
// immediately reports the target as intersecting (the hero is at the top of
// the page, so this matches the production behavior under test).
beforeAll(() => {
	class MockIntersectionObserver {
		private callback: IntersectionObserverCallback;
		constructor(callback: IntersectionObserverCallback) {
			this.callback = callback;
		}
		observe(target: Element) {
			this.callback(
				[
					{
						isIntersecting: true,
						target,
						boundingClientRect: target.getBoundingClientRect(),
						intersectionRatio: 1,
						intersectionRect: target.getBoundingClientRect(),
						rootBounds: null,
						time: 0,
					} as IntersectionObserverEntry,
				],
				this as unknown as IntersectionObserver,
			);
		}
		unobserve() {}
		disconnect() {}
		takeRecords(): IntersectionObserverEntry[] {
			return [];
		}
	}
	Object.defineProperty(globalThis, "IntersectionObserver", {
		writable: true,
		configurable: true,
		value: MockIntersectionObserver,
	});
});

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { trackEventMock } = vi.hoisted(() => ({
	trackEventMock: vi.fn(),
}));

vi.mock("@/shared/lib/analytics/track", () => ({
	trackEvent: trackEventMock,
}));

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		preload,
		fetchPriority,
	}: {
		src: string;
		alt: string;
		preload?: boolean;
		fetchPriority?: string;
		[key: string]: unknown;
	}) => (
		// biome-ignore lint/a11y/useAltText: test mock
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={src}
			alt={alt}
			data-testid="floating-img"
			data-preload={preload ? "true" : "false"}
			data-fetchpriority={fetchPriority ?? "none"}
		/>
	),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		prefetch,
		...rest
	}: {
		href: string;
		children: React.ReactNode;
		prefetch?: boolean;
		[key: string]: unknown;
	}) => (
		<a href={href} data-prefetch={prefetch ? "true" : "false"} {...rest}>
			{children}
		</a>
	),
}));

import { HeroFloatingImages } from "../floating-images";
import HeroFloatingImagesInner from "../floating-images/hero-floating-images-inner";
import type { HeroProductImage } from "../../_utils/extract-hero-images";

// ---------------------------------------------------------------------------
// matchMedia helper — the component reads `(prefers-reduced-motion: reduce)`
// and `(min-width: 768px)` to gate the desktop pointer-depth listener.
// ---------------------------------------------------------------------------

const ORIGINAL_MATCH_MEDIA = window.matchMedia;

function mockMatchMedia(matches: (query: string) => boolean) {
	const fn = vi.fn((query: string) => ({
		matches: matches(query),
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		writable: true,
		value: fn,
	});
	return fn;
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		writable: true,
		value: ORIGINAL_MATCH_MEDIA,
	});
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeImages(count: number): HeroProductImage[] {
	return Array.from({ length: count }, (_, i) => ({
		url: `/img-${i}.jpg`,
		alt: `Alt ${i}`,
		slug: `product-${i}`,
		title: `Product ${i}`,
	}));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HeroFloatingImages", () => {
	it("returns null when images array is empty", () => {
		const { container } = render(<HeroFloatingImages images={[]} />);
		expect(container.innerHTML).toBe("");
	});
});

describe("HeroFloatingImagesInner", () => {
	it("renders container with aria-hidden when images are provided", () => {
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const wrapper = container.querySelector("[aria-hidden]");
		expect(wrapper).not.toBeNull();
		expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders with CSS containment for performance", () => {
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const wrapper = container.querySelector("[aria-hidden]");
		expect(wrapper?.getAttribute("style")).toContain("contain");
	});

	it("renders up to 4 floating images", () => {
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const images = container.querySelectorAll("[data-testid='floating-img']");
		expect(images.length).toBe(4);
	});

	it("is hidden on mobile (md:block)", () => {
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const wrapper = container.querySelector("[aria-hidden]");
		expect(wrapper?.className).toContain("hidden");
		expect(wrapper?.className).toContain("md:block");
	});

	/**
	 * @regression mobile-lcp-preload-2026-05-24
	 * Floating images are `hidden md:block`. Emitting `<link rel="preload">` for any
	 * of them costs ~119 KiB of bandwidth on 4G mobile for an image that is never
	 * painted, delaying the real LCP (ProductCard[0] in LatestCreations).
	 * The LCP preload now lives on the first ProductCard image instead.
	 */
	it("never preloads or boosts fetchpriority on any floating image (mobile LCP fix)", () => {
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const images = container.querySelectorAll("[data-testid='floating-img']");
		for (const image of images) {
			expect(image.getAttribute("data-preload")).toBe("false");
			expect(image.getAttribute("data-fetchpriority")).toBe("none");
		}
	});

	it("sets prefetch=true on each image link (Next.js warm cache)", () => {
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const links = container.querySelectorAll("a[href^='/creations/']");
		expect(links.length).toBe(4);
		for (const link of links) {
			expect(link.getAttribute("data-prefetch")).toBe("true");
		}
	});

	it("updates spotlight CSS vars --mx/--my on pointer move", () => {
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const firstLink = container.querySelector<HTMLAnchorElement>("a[href='/creations/product-0']");
		expect(firstLink).not.toBeNull();

		firstLink!.getBoundingClientRect = () =>
			({
				left: 0,
				top: 0,
				width: 200,
				height: 250,
				right: 200,
				bottom: 250,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			}) as DOMRect;

		fireEvent.pointerMove(firstLink!, { clientX: 100, clientY: 125 });

		expect(firstLink!.style.getPropertyValue("--mx")).toBe("50%");
		expect(firstLink!.style.getPropertyValue("--my")).toBe("50%");
	});

	it("renders the pointer spotlight overlay with motion-reduce:hidden", () => {
		// The cursor spotlight is removed under reduced motion via CSS
		// (`motion-reduce:hidden`) rather than a JS guard.
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const spotlights = container.querySelectorAll("[class*='motion-reduce:hidden']");
		expect(spotlights.length).toBe(4);
		for (const spotlight of spotlights) {
			expect(spotlight.className).toContain("mix-blend-screen");
		}
	});

	it("attaches a window pointermove listener when desktop + motion enabled", () => {
		mockMatchMedia((query) => query === "(min-width: 768px)");
		const addSpy = vi.spyOn(window, "addEventListener");

		const { unmount } = render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const pointerMoveCalls = addSpy.mock.calls.filter(
			(call) => (call[0] as string) === "pointermove",
		);
		expect(pointerMoveCalls.length).toBe(1);

		unmount();
		addSpy.mockRestore();
	});

	it("does not attach window pointermove listener when reduced motion is enabled", () => {
		mockMatchMedia((query) => query === "(prefers-reduced-motion: reduce)");
		const addSpy = vi.spyOn(window, "addEventListener");

		render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const pointerMoveCalls = addSpy.mock.calls.filter(
			(call) => (call[0] as string) === "pointermove",
		);
		expect(pointerMoveCalls.length).toBe(0);

		addSpy.mockRestore();
	});

	it("does not attach window pointermove listener on narrow viewports", () => {
		// Default test setup returns matches: false for all queries — desktop listener stays off.
		const addSpy = vi.spyOn(window, "addEventListener");

		render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const pointerMoveCalls = addSpy.mock.calls.filter(
			(call) => (call[0] as string) === "pointermove",
		);
		expect(pointerMoveCalls.length).toBe(0);

		addSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// Regression lock — audit floating-images 2026-05-19 + perf audit 2026-05-20
// ---------------------------------------------------------------------------

describe("HeroFloatingImagesInner — regression lock", () => {
	/**
	 * @regression hover-simplified-2026-05-19
	 * Hover signature limited to scale + glow + spotlight (3 layers max).
	 * Light reflection overlay was removed intentionally for sobriety
	 * (bijoux artisanaux brand). Do not reintroduce.
	 */
	it("does NOT render light reflection overlay (bg-linear-to-b)", () => {
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);
		expect(container.querySelector("[class*='bg-linear-to-b']")).toBeNull();
	});

	/**
	 * @regression hover-simplified-2026-05-19
	 * Preview pill (product title on hover) was removed — redundant with
	 * image.alt for SR (which sees nothing anyway via aria-hidden ancestor)
	 * and visually noisy on hover. Image titles must not appear in the DOM.
	 */
	it("does NOT render product title text (preview pill removed)", () => {
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);
		for (let i = 0; i < 4; i++) {
			expect(container.textContent).not.toContain(`Product ${i}`);
		}
	});

	/**
	 * @regression tablet-4-images-2026-05-19
	 * Tablet (md, 768-1023px) must show all 4 images — fixes diagonal asymmetry
	 * where only top-left + bottom-right were visible. Each image wrapper carries
	 * `hidden md:block` on its visibilityClass.
	 */
	it("renders all 4 image wrappers with `md:block` visibility class", () => {
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);
		// 1 container + 4 image wrappers = 5 elements with md:block
		const mdBlockElements = container.querySelectorAll("[class*='md:block']");
		expect(mdBlockElements.length).toBe(5);
		// No element should still rely on lg:block (regression guard)
		const lgBlockElements = container.querySelectorAll("[class*='lg:block']");
		expect(lgBlockElements.length).toBe(0);
	});

	/**
	 * @regression analytics-tracking-2026-05-19
	 * Each floating image click fires `hero_floating_image_click` with slug
	 * + position (idleAnimation key) for conversion measurement. The funnel is
	 * gated by RGPD consent inside trackEvent itself.
	 */
	it("fires trackEvent on image click with slug + position", () => {
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const firstLink = container.querySelector<HTMLAnchorElement>("a[href='/creations/product-0']");
		expect(firstLink).not.toBeNull();

		fireEvent.click(firstLink!);

		expect(trackEventMock).toHaveBeenCalledWith("hero_floating_image_click", {
			slug: "product-0",
			position: "hero-idle-float-1",
		});
	});

	/**
	 * @regression lcp-css-entrance-2026-05-20
	 * The floating image entrance + parallax are pure CSS (`hero-image-entrance`
	 * / `hero-image-parallax`) — no motion-react. This is what unblocks the LCP
	 * image from JS hydration (~2.1s render delay). Do not move the entrance
	 * back into motion-react initial/animate.
	 */
	it("renders the CSS entrance + parallax layers (no JS-gated opacity)", () => {
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);
		expect(container.querySelectorAll(".hero-image-entrance").length).toBe(4);
		expect(container.querySelectorAll(".hero-image-parallax").length).toBe(4);
	});
});
