import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as ReactModule from "react";

// ---------------------------------------------------------------------------
// Hoisted mocks — values shared across vi.mock factories
// ---------------------------------------------------------------------------
const { reducedMotionMock, useIsTouchDeviceMock, useSyncExternalStoreMock, cssSupportsMock } =
	vi.hoisted(() => ({
		// Drives useMediaQuery("(prefers-reduced-motion: reduce)")
		reducedMotionMock: vi.fn<() => boolean>(() => false),
		useIsTouchDeviceMock: vi.fn<() => boolean>(() => false),
		// Default: simulate client (isMounted = true) — getClientSnapshot returns true
		useSyncExternalStoreMock: vi.fn<
			(
				subscribe: () => void,
				getSnapshot: () => unknown,
				getServerSnapshot?: () => unknown,
			) => unknown
		>((_subscribe: () => void, getSnapshot: () => unknown) => getSnapshot()),
		// Default: animation-timeline: view() IS supported (CSS-native parallax branch)
		cssSupportsMock: vi.fn<(prop: string, val: string) => boolean>(() => true),
	}));

// Mock react — intercept useSyncExternalStore while keeping everything else real.
// Drives useMounted + useSupportsViewTimeline.
vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof ReactModule>();
	return {
		...actual,
		useSyncExternalStore: useSyncExternalStoreMock,
	};
});

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// next/image rendered as a plain <img> so we can assert DOM structure.
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

// ParallaxImage now reads useIsTouchDevice + useMediaQuery (no motion-react).
vi.mock("@/shared/hooks", () => ({
	useIsTouchDevice: useIsTouchDeviceMock,
	useMediaQuery: (query: string) =>
		query === "(prefers-reduced-motion: reduce)" ? reducedMotionMock() : false,
}));

// cssSupports drives useSupportsViewTimeline (CSS animation-timeline: view() branch).
vi.mock("@/shared/utils/css-supports", () => ({
	cssSupports: cssSupportsMock,
}));

import { ParallaxImage } from "../parallax-image";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	reducedMotionMock.mockReturnValue(false);
	useIsTouchDeviceMock.mockReturnValue(false);
	useSyncExternalStoreMock.mockImplementation(
		(_subscribe: () => void, getSnapshot: () => unknown) => getSnapshot(),
	);
	cssSupportsMock.mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_PROPS = {
	src: "/test-image.jpg",
	alt: "Test image",
};

/** True when the CSS-native parallax wrapper (data-parallax="active") is in the DOM. */
function isParallaxActive() {
	return document.querySelector('[data-parallax="active"]') !== null;
}

// ---------------------------------------------------------------------------
// Static branch
// ---------------------------------------------------------------------------

describe("static branch", () => {
	it("renders static (no parallax wrapper) on the server snapshot — not yet mounted", () => {
		useSyncExternalStoreMock.mockImplementation(
			(_subscribe: () => void, _getSnapshot: () => unknown, getServerSnapshot?: () => unknown) =>
				getServerSnapshot ? getServerSnapshot() : false,
		);

		render(<ParallaxImage {...DEFAULT_PROPS} />);

		expect(isParallaxActive()).toBe(false);
		expect(screen.getByTestId("parallax-image")).toBeInTheDocument();
	});

	it("renders static when prefers-reduced-motion is enabled", () => {
		reducedMotionMock.mockReturnValue(true);

		render(<ParallaxImage {...DEFAULT_PROPS} />);

		expect(isParallaxActive()).toBe(false);
		expect(screen.getByTestId("parallax-image")).toBeInTheDocument();
	});

	it("renders static on a touch device with disableOnTouch=true (default)", () => {
		useIsTouchDeviceMock.mockReturnValue(true);

		render(<ParallaxImage {...DEFAULT_PROPS} />);

		expect(isParallaxActive()).toBe(false);
	});

	it("renders static when animation-timeline: view() is unsupported (Safari <= 18)", () => {
		// No motion-react JS fallback any more — unsupported browsers render plainly.
		cssSupportsMock.mockReturnValue(false);

		render(<ParallaxImage {...DEFAULT_PROPS} />);

		expect(isParallaxActive()).toBe(false);
		expect(screen.getByTestId("parallax-image")).toBeInTheDocument();
	});

	it("disables parallax when intensity is 0", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} intensity={0} />);
		expect(isParallaxActive()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// CSS-native parallax branch (animation-timeline: view() supported)
// ---------------------------------------------------------------------------

describe("CSS-native parallax branch", () => {
	it("renders the .parallax-image-scroll wrapper when motion is allowed + view() supported", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} />);

		const wrapper = document.querySelector(".parallax-image-scroll");
		expect(wrapper).not.toBeNull();
		expect(wrapper?.getAttribute("data-parallax")).toBe("active");
		expect(wrapper?.querySelector('[data-testid="parallax-image"]')).not.toBeNull();
	});

	it("activates on a touch device when disableOnTouch=false", () => {
		useIsTouchDeviceMock.mockReturnValue(true);

		render(<ParallaxImage {...DEFAULT_PROPS} disableOnTouch={false} />);

		expect(isParallaxActive()).toBe(true);
	});

	it("injects --parallax-from / --parallax-to CSS vars from intensity", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} intensity={5} />);

		const wrapper = document.querySelector(".parallax-image-scroll") as HTMLElement | null;
		const style = wrapper?.getAttribute("style") ?? "";
		expect(style).toContain("--parallax-from: -5%");
		expect(style).toContain("--parallax-to: 5%");
		expect(style).toContain("height: 110%");
	});

	it("caps intensity at 15", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} intensity={30} />);

		const wrapper = document.querySelector(".parallax-image-scroll") as HTMLElement | null;
		const style = wrapper?.getAttribute("style") ?? "";
		// height = 100 + 15 * 2 = 130%
		expect(style).toContain("height: 130%");
		expect(style).not.toContain("height: 160%");
	});
});

// ---------------------------------------------------------------------------
// decorative prop
// ---------------------------------------------------------------------------

describe("decorative prop", () => {
	it("sets aria-hidden=true and empty alt when decorative=true", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} alt="Should be empty" decorative />);

		const img = screen.getByTestId("parallax-image");
		expect(img.getAttribute("aria-hidden")).toBe("true");
		expect(img.getAttribute("alt")).toBe("");
	});

	it("preserves alt and omits aria-hidden when decorative=false", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} alt="My alt text" />);

		const img = screen.getByTestId("parallax-image");
		expect(img.getAttribute("alt")).toBe("My alt text");
		expect(img.getAttribute("aria-hidden")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// intensity validation (dev-only warnings)
// ---------------------------------------------------------------------------

describe("intensity validation", () => {
	it("warns when intensity exceeds the cap", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		render(<ParallaxImage {...DEFAULT_PROPS} intensity={30} />);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("capped at 15"));
		warnSpy.mockRestore();
	});

	it("disables parallax and warns when intensity is negative", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		render(<ParallaxImage {...DEFAULT_PROPS} intensity={-5} />);
		expect(isParallaxActive()).toBe(false);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("negative"));
		warnSpy.mockRestore();
	});

	it("disables parallax and warns when intensity is not finite", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		render(<ParallaxImage {...DEFAULT_PROPS} intensity={Number.NaN} />);
		expect(isParallaxActive()).toBe(false);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("not finite"));
		warnSpy.mockRestore();
	});

	it("warns when alt is empty without decorative=true (WCAG 1.1.1)", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		render(<ParallaxImage src="/x.jpg" alt="" />);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("WCAG 1.1.1"));
		warnSpy.mockRestore();
	});
});
