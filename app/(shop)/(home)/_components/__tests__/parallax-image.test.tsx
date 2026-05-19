import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as ReactModule from "react";

// ---------------------------------------------------------------------------
// Hoisted mocks — values shared across vi.mock factories
// ---------------------------------------------------------------------------
const { useReducedMotionMock, useIsTouchDeviceMock, useSyncExternalStoreMock, cssSupportsMock } =
	vi.hoisted(() => ({
		useReducedMotionMock: vi.fn<() => boolean | null>(() => false),
		useIsTouchDeviceMock: vi.fn<() => boolean>(() => false),
		// Default: simulate client (isMounted = true) — getClientSnapshot returns true
		useSyncExternalStoreMock: vi.fn<
			(
				subscribe: () => void,
				getSnapshot: () => unknown,
				getServerSnapshot?: () => unknown,
			) => unknown
		>((_subscribe: () => void, getSnapshot: () => unknown) => getSnapshot()),
		// Default: no animation-timeline: view() support → motion-react fallback path
		cssSupportsMock: vi.fn<(prop: string, val: string) => boolean>(() => false),
	}));

// Mock react — intercept useSyncExternalStore while keeping everything else real
vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof ReactModule>();
	return {
		...actual,
		useSyncExternalStore: useSyncExternalStoreMock,
	};
});

// Mock cn utility
vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock motion/react — render plain elements so we can assert DOM structure
vi.mock("motion/react", () => ({
	useReducedMotion: useReducedMotionMock,
	useScroll: vi.fn(() => ({ scrollYProgress: 0 })),
	useTransform: vi.fn(() => 0),
	useInView: vi.fn(() => false),
	motion: { div: "div" },
	m: { div: "div" },
}));

// Mock next/image as a plain <img> element
vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		"aria-hidden": ariaHidden,
	}: {
		src: string;
		alt: string;
		"aria-hidden"?: boolean;
		[key: string]: unknown;
	}) => (
		// biome-ignore lint/a11y/useAltText: intentional empty alt in decorative tests
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} aria-hidden={ariaHidden} data-testid="parallax-image" />
	),
}));

// Mock @/shared/hooks for useIsTouchDevice
vi.mock("@/shared/hooks", () => ({
	useIsTouchDevice: useIsTouchDeviceMock,
}));

// Mock cssSupports to drive useSupportsViewTimeline (CSS animation-timeline: view() branch)
vi.mock("@/shared/utils/css-supports", () => ({
	cssSupports: cssSupportsMock,
}));

import { ParallaxImage } from "../parallax-image";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	// Restore defaults after each test
	useReducedMotionMock.mockReturnValue(false);
	useIsTouchDeviceMock.mockReturnValue(false);
	// Default: client-side — run getClientSnapshot (returns true)
	useSyncExternalStoreMock.mockImplementation(
		(_subscribe: () => void, getSnapshot: () => unknown) => getSnapshot(),
	);
	// Default: no animation-timeline: view() support
	cssSupportsMock.mockReturnValue(false);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_PROPS = {
	src: "/test-image.jpg",
	alt: "Test image",
};

/** Returns true when the parallax wrapper (data-parallax="active") is in the DOM. */
function isParallaxActive() {
	return document.querySelector('[data-parallax="active"]') !== null;
}

// ---------------------------------------------------------------------------
// 1. SSR branch — isMounted = false (useSyncExternalStore returns server snapshot)
// ---------------------------------------------------------------------------

describe("SSR / not yet mounted", () => {
	it("renders static image without data-parallax wrapper when useSyncExternalStore returns server snapshot (false)", () => {
		// Simulate SSR: always call getServerSnapshot, which returns false (isMounted = false)
		useSyncExternalStoreMock.mockImplementation(
			(_subscribe: () => void, _getSnapshot: () => unknown, getServerSnapshot?: () => unknown) =>
				getServerSnapshot ? getServerSnapshot() : false,
		);

		render(<ParallaxImage {...DEFAULT_PROPS} />);

		expect(isParallaxActive()).toBe(false);
		expect(screen.getByTestId("parallax-image")).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// 2. prefers-reduced-motion = true → static render
// ---------------------------------------------------------------------------

describe("prefers-reduced-motion enabled", () => {
	it("renders static image without data-parallax wrapper", () => {
		useReducedMotionMock.mockReturnValue(true);

		render(<ParallaxImage {...DEFAULT_PROPS} />);

		expect(isParallaxActive()).toBe(false);
		expect(screen.getByTestId("parallax-image")).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// 3. shouldReduceMotion = null (not yet resolved) → static render (opt-in safety)
// ---------------------------------------------------------------------------

describe("prefers-reduced-motion not yet resolved (null)", () => {
	it("renders static image without data-parallax wrapper when null", () => {
		// useReducedMotion returns null before the media query resolves.
		// The component treats this as "not safe" (motion opt-in requires explicit false).
		(useReducedMotionMock as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);

		render(<ParallaxImage {...DEFAULT_PROPS} />);

		expect(isParallaxActive()).toBe(false);
		expect(screen.getByTestId("parallax-image")).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// 4. Touch device + disableOnTouch (default) → static render
// ---------------------------------------------------------------------------

describe("touch device with disableOnTouch=true (default)", () => {
	it("renders static image without data-parallax wrapper", () => {
		useIsTouchDeviceMock.mockReturnValue(true);
		// Motion is otherwise allowed (mounted + no reduced-motion preference)
		useReducedMotionMock.mockReturnValue(false);

		render(<ParallaxImage {...DEFAULT_PROPS} />);

		expect(isParallaxActive()).toBe(false);
		expect(screen.getByTestId("parallax-image")).toBeInTheDocument();
	});

	it("renders static image even with explicit disableOnTouch=true", () => {
		useIsTouchDeviceMock.mockReturnValue(true);
		useReducedMotionMock.mockReturnValue(false);

		render(<ParallaxImage {...DEFAULT_PROPS} disableOnTouch={true} />);

		expect(isParallaxActive()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// 5. Touch device + disableOnTouch=false → parallax active
// ---------------------------------------------------------------------------

describe("touch device with disableOnTouch=false", () => {
	it("renders parallax with data-parallax wrapper", () => {
		useIsTouchDeviceMock.mockReturnValue(true);
		useReducedMotionMock.mockReturnValue(false);

		render(<ParallaxImage {...DEFAULT_PROPS} disableOnTouch={false} />);

		expect(isParallaxActive()).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 6. Desktop, motion allowed → parallax active
// ---------------------------------------------------------------------------

describe("desktop with motion allowed", () => {
	it("renders parallax wrapper with data-parallax attribute", () => {
		// Defaults: isMounted=true (getClientSnapshot), shouldReduceMotion=false, isTouchDevice=false
		useReducedMotionMock.mockReturnValue(false);
		useIsTouchDeviceMock.mockReturnValue(false);

		render(<ParallaxImage {...DEFAULT_PROPS} />);

		expect(isParallaxActive()).toBe(true);
		expect(screen.getByTestId("parallax-image")).toBeInTheDocument();
	});

	it("renders the image inside the parallax wrapper", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} />);

		const presentation = document.querySelector('[data-parallax="active"]');
		expect(presentation).not.toBeNull();
		expect(presentation?.querySelector('[data-testid="parallax-image"]')).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// 7. decorative prop → aria-hidden and empty alt
// ---------------------------------------------------------------------------

describe("decorative prop", () => {
	it("sets aria-hidden=true on the image when decorative=true", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} decorative />);

		const img = screen.getByTestId("parallax-image");
		expect(img.getAttribute("aria-hidden")).toBe("true");
	});

	it("sets empty alt string when decorative=true", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} alt="Should be empty" decorative />);

		const img = screen.getByTestId("parallax-image");
		expect(img.getAttribute("alt")).toBe("");
	});

	it("does not set aria-hidden when decorative=false (default)", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} decorative={false} />);

		const img = screen.getByTestId("parallax-image");
		expect(img.getAttribute("aria-hidden")).toBeNull();
	});

	it("preserves alt text when decorative=false (default)", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} alt="My alt text" />);

		const img = screen.getByTestId("parallax-image");
		expect(img.getAttribute("alt")).toBe("My alt text");
	});
});

// ---------------------------------------------------------------------------
// 8. intensity capped at 15
// ---------------------------------------------------------------------------

describe("intensity capping", () => {
	it("caps intensity at 15 when a higher value is provided", () => {
		// Render in parallax mode so ParallaxInner is mounted and the style is set
		render(<ParallaxImage {...DEFAULT_PROPS} intensity={30} />);

		// height = 100 + safeIntensity * 2 — should be 130%, not 160%
		const presentation = document.querySelector('[data-parallax="active"]') as HTMLElement | null;
		expect(presentation).not.toBeNull();

		const style = presentation?.getAttribute("style") ?? "";
		expect(style).toContain("height: 130%");
		expect(style).not.toContain("height: 160%");
	});

	it("uses provided intensity when below the cap (intensity=8)", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} intensity={8} />);

		const presentation = document.querySelector('[data-parallax="active"]') as HTMLElement | null;
		expect(presentation).not.toBeNull();

		const style = presentation?.getAttribute("style") ?? "";
		// height = 100 + 8 * 2 = 116%
		expect(style).toContain("height: 116%");
	});

	it("uses default intensity of 5 when not provided", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} />);

		const presentation = document.querySelector('[data-parallax="active"]') as HTMLElement | null;
		expect(presentation).not.toBeNull();

		const style = presentation?.getAttribute("style") ?? "";
		// height = 100 + 5 * 2 = 110%
		expect(style).toContain("height: 110%");
	});
});

// ---------------------------------------------------------------------------
// 9. CSS native path — animation-timeline: view() supported → compositor branch
// ---------------------------------------------------------------------------

describe("CSS native path (animation-timeline: view supported)", () => {
	it("renders the .parallax-image-scroll class on the inner wrapper", () => {
		cssSupportsMock.mockReturnValue(true);

		render(<ParallaxImage {...DEFAULT_PROPS} intensity={5} />);

		const wrapper = document.querySelector(".parallax-image-scroll");
		expect(wrapper).not.toBeNull();
		expect(wrapper?.getAttribute("data-parallax")).toBe("active");
	});

	it("injects --parallax-from and --parallax-to CSS vars derived from intensity", () => {
		cssSupportsMock.mockReturnValue(true);

		render(<ParallaxImage {...DEFAULT_PROPS} intensity={5} />);

		const wrapper = document.querySelector(".parallax-image-scroll") as HTMLElement | null;
		expect(wrapper).not.toBeNull();
		const style = wrapper?.getAttribute("style") ?? "";
		expect(style).toContain("--parallax-from: -5%");
		expect(style).toContain("--parallax-to: 5%");
		expect(style).toContain("height: 110%");
	});
});

// ---------------------------------------------------------------------------
// 10. intensity > 15 emits a dev-only warning
// ---------------------------------------------------------------------------

describe("intensity warning (dev-only)", () => {
	it("warns to the console when intensity exceeds the cap", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		render(<ParallaxImage {...DEFAULT_PROPS} intensity={30} />);

		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("intensity=30"));
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("capped at 15"));

		warnSpy.mockRestore();
	});

	it("does not warn when intensity is within bounds", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		render(<ParallaxImage {...DEFAULT_PROPS} intensity={10} />);

		expect(warnSpy).not.toHaveBeenCalled();

		warnSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// 11. intensity edge cases — 0, negative, NaN, Infinity → static fast-path
// ---------------------------------------------------------------------------

describe("intensity edge cases", () => {
	it("disables parallax when intensity is exactly 0 (no CPU for invisible animation)", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} intensity={0} />);

		expect(isParallaxActive()).toBe(false);
		expect(screen.getByTestId("parallax-image")).toBeInTheDocument();
	});

	it("disables parallax and warns when intensity is negative", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		render(<ParallaxImage {...DEFAULT_PROPS} intensity={-5} />);

		expect(isParallaxActive()).toBe(false);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("negative"));

		warnSpy.mockRestore();
	});

	it("disables parallax and warns when intensity is NaN", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		render(<ParallaxImage {...DEFAULT_PROPS} intensity={Number.NaN} />);

		expect(isParallaxActive()).toBe(false);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("not finite"));

		warnSpy.mockRestore();
	});

	it("disables parallax and warns when intensity is Infinity", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		render(<ParallaxImage {...DEFAULT_PROPS} intensity={Number.POSITIVE_INFINITY} />);

		expect(isParallaxActive()).toBe(false);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("not finite"));

		warnSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// 12. WCAG 1.1.1 — alt validation
// ---------------------------------------------------------------------------

describe("WCAG alt validation (dev-only)", () => {
	it("warns when alt is empty without decorative=true (WCAG 1.1.1)", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		render(<ParallaxImage src="/x.jpg" alt="" />);

		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("WCAG 1.1.1"));

		warnSpy.mockRestore();
	});

	it("does not warn when decorative=true and alt is empty", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		render(<ParallaxImage src="/x.jpg" alt="" decorative />);

		expect(warnSpy).not.toHaveBeenCalled();

		warnSpy.mockRestore();
	});

	it("does not warn when alt is non-empty", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		render(<ParallaxImage {...DEFAULT_PROPS} />);

		expect(warnSpy).not.toHaveBeenCalled();

		warnSpy.mockRestore();
	});
});
