import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — values shared across vi.mock factories
// ---------------------------------------------------------------------------
const {
	useReducedMotionMock,
	useIsTouchDeviceMock,
	useSyncExternalStoreMock,
} = vi.hoisted(() => ({
	useReducedMotionMock: vi.fn<() => boolean | null>(() => false),
	useIsTouchDeviceMock: vi.fn<() => boolean>(() => false),
	// Default: simulate client (isMounted = true) — getClientSnapshot returns true
	useSyncExternalStoreMock: vi.fn<
		(subscribe: () => void, getSnapshot: () => unknown, getServerSnapshot?: () => unknown) => unknown
	>((_subscribe: () => void, getSnapshot: () => unknown) => getSnapshot()),
}));

// Mock react — intercept useSyncExternalStore while keeping everything else real
vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
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
		<img
			src={src}
			alt={alt}
			aria-hidden={ariaHidden}
			data-testid="parallax-image"
		/>
	),
}));

// Mock @/shared/hooks for useIsTouchDevice
vi.mock("@/shared/hooks", () => ({
	useIsTouchDevice: useIsTouchDeviceMock,
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
		(_subscribe: () => void, getSnapshot: () => unknown) => getSnapshot()
	);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_PROPS = {
	src: "/test-image.jpg",
	alt: "Test image",
};

/** Returns true when the parallax wrapper (role="presentation") is in the DOM. */
function isParallaxActive() {
	return document.querySelector('[role="presentation"]') !== null;
}

// ---------------------------------------------------------------------------
// 1. SSR branch — isMounted = false (useSyncExternalStore returns server snapshot)
// ---------------------------------------------------------------------------

describe("SSR / not yet mounted", () => {
	it("renders static image without role=presentation when useSyncExternalStore returns server snapshot (false)", () => {
		// Simulate SSR: always call getServerSnapshot, which returns false (isMounted = false)
		useSyncExternalStoreMock.mockImplementation(
			(
				_subscribe: () => void,
				_getSnapshot: () => unknown,
				getServerSnapshot?: () => unknown
			) => (getServerSnapshot ? getServerSnapshot() : false)
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
	it("renders static image without role=presentation", () => {
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
	it("renders static image without role=presentation when null", () => {
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
	it("renders static image without role=presentation", () => {
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
	it("renders parallax with role=presentation", () => {
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
	it("renders parallax wrapper with role=presentation", () => {
		// Defaults: isMounted=true (getClientSnapshot), shouldReduceMotion=false, isTouchDevice=false
		useReducedMotionMock.mockReturnValue(false);
		useIsTouchDeviceMock.mockReturnValue(false);

		render(<ParallaxImage {...DEFAULT_PROPS} />);

		expect(isParallaxActive()).toBe(true);
		expect(screen.getByTestId("parallax-image")).toBeInTheDocument();
	});

	it("renders the image inside the parallax wrapper", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} />);

		const presentation = document.querySelector('[role="presentation"]');
		expect(presentation).not.toBeNull();
		expect(
			presentation?.querySelector('[data-testid="parallax-image"]')
		).not.toBeNull();
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
		render(
			<ParallaxImage {...DEFAULT_PROPS} alt="Should be empty" decorative />
		);

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
		const presentation = document.querySelector(
			'[role="presentation"]'
		) as HTMLElement | null;
		expect(presentation).not.toBeNull();

		const style = presentation?.getAttribute("style") ?? "";
		expect(style).toContain("height: 130%");
		expect(style).not.toContain("height: 160%");
	});

	it("uses provided intensity when below the cap (intensity=8)", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} intensity={8} />);

		const presentation = document.querySelector(
			'[role="presentation"]'
		) as HTMLElement | null;
		expect(presentation).not.toBeNull();

		const style = presentation?.getAttribute("style") ?? "";
		// height = 100 + 8 * 2 = 116%
		expect(style).toContain("height: 116%");
	});

	it("uses default intensity of 5 when not provided", () => {
		render(<ParallaxImage {...DEFAULT_PROPS} />);

		const presentation = document.querySelector(
			'[role="presentation"]'
		) as HTMLElement | null;
		expect(presentation).not.toBeNull();

		const style = presentation?.getAttribute("style") ?? "";
		// height = 100 + 5 * 2 = 110%
		expect(style).toContain("height: 110%");
	});
});
