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

const { useReducedMotionMock, trackEventMock } = vi.hoisted(() => ({
	useReducedMotionMock: vi.fn<() => boolean | null>(() => false),
	trackEventMock: vi.fn(),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/lib/analytics/track", () => ({
	trackEvent: trackEventMock,
}));

vi.mock("motion/react", () => {
	function makeMotionValue(initial = 0) {
		let value = initial;
		return {
			get: () => value,
			set: (v: number) => {
				value = v;
			},
			on: () => () => {},
			destroy: () => {},
		};
	}
	return {
		useReducedMotion: useReducedMotionMock,
		useScroll: vi.fn(() => ({ scrollYProgress: makeMotionValue(0) })),
		useTransform: vi.fn(() => makeMotionValue(0)),
		useMotionValue: vi.fn((initial: number) => makeMotionValue(initial)),
		useSpring: vi.fn((source: unknown) => source),
		useInView: vi.fn(() => true),
		motion: { div: "div" },
		m: { div: "div", a: "a" },
		AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	};
});

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		preload,
	}: {
		src: string;
		alt: string;
		preload?: boolean;
		[key: string]: unknown;
	}) => (
		// biome-ignore lint/a11y/useAltText: test mock
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} data-testid="floating-img" data-preload={preload ? "true" : "false"} />
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

vi.mock("@/shared/hooks", () => ({
	useIsTouchDevice: vi.fn(() => false),
}));

import { HeroFloatingImages } from "../floating-images";
import HeroFloatingImagesInner from "../floating-images/hero-floating-images-inner";
import type { HeroProductImage } from "../../_utils/extract-hero-images";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	useReducedMotionMock.mockReturnValue(false);
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

	it("marks only the first image as preload=true (LCP — Next 16 emits <link rel=preload>)", () => {
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const images = container.querySelectorAll("[data-testid='floating-img']");
		expect(images[0]?.getAttribute("data-preload")).toBe("true");

		for (let i = 1; i < images.length; i++) {
			expect(images[i]?.getAttribute("data-preload")).toBe("false");
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

	it("does not update spotlight vars under reduced motion", () => {
		useReducedMotionMock.mockReturnValue(true);
		const { container } = render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const firstLink = container.querySelector<HTMLAnchorElement>("a[href='/creations/product-0']");
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

		fireEvent.pointerMove(firstLink!, { clientX: 10, clientY: 10 });

		// Initial inline default value stays (50%) — handler is skipped under reduced motion
		expect(firstLink!.style.getPropertyValue("--mx")).toBe("50%");
		expect(firstLink!.style.getPropertyValue("--my")).toBe("50%");
	});

	it("attaches a window pointermove listener only when desktop + motion enabled", () => {
		const addSpy = vi.spyOn(window, "addEventListener");
		const matchMediaSpy = vi.spyOn(window, "matchMedia").mockImplementation(
			(query: string) =>
				({
					matches: true,
					media: query,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
					addListener: vi.fn(),
					removeListener: vi.fn(),
					onchange: null,
					dispatchEvent: vi.fn(),
				}) as unknown as MediaQueryList,
		);

		const { unmount } = render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const pointerMoveCalls = addSpy.mock.calls.filter(
			(call) => (call[0] as string) === "pointermove",
		);
		expect(pointerMoveCalls.length).toBe(1);

		unmount();
		matchMediaSpy.mockRestore();
		addSpy.mockRestore();
	});

	it("does not attach window pointermove listener when reduced motion is enabled", () => {
		useReducedMotionMock.mockReturnValue(true);
		const addSpy = vi.spyOn(window, "addEventListener");

		render(<HeroFloatingImagesInner images={makeImages(4)} />);

		const pointerMoveCalls = addSpy.mock.calls.filter(
			(call) => (call[0] as string) === "pointermove",
		);
		expect(pointerMoveCalls.length).toBe(0);

		addSpy.mockRestore();
	});

	it("does not attach window pointermove listener on narrow viewports (matchMedia false)", () => {
		// Default test setup returns matches: false for all queries — desktop listener stays off
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
// Regression lock — audit floating-images 2026-05-19
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
});
