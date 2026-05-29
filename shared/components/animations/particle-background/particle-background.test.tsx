import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock ResizeObserver (not available in jsdom)
const resizeObserverInstances: { callback: ResizeObserverCallback; targets: Element[] }[] = [];
class MockResizeObserver {
	private callback: ResizeObserverCallback;
	private targets: Element[] = [];
	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
		resizeObserverInstances.push({ callback, targets: this.targets });
	}
	observe(target: Element) {
		this.targets.push(target);
	}
	unobserve() {}
	disconnect() {
		this.targets.length = 0;
	}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

// Mock motion/react before importing the component
vi.mock("motion/react", () => {
	const actual = vi.importActual("motion/react");
	return {
		...actual,
		useReducedMotion: vi.fn(() => false),
		useInView: vi.fn(() => true),
		useMotionValue: vi.fn((initial) => ({
			get: () => initial,
			set: vi.fn(),
		})),
		useTransform: vi.fn((mvOrArray: unknown, fnOrInput: unknown, _output?: unknown) => {
			// Handle both signatures:
			// useTransform(mv, fn), useTransform([mv1, mv2], fn), useTransform(mv, input[], output[])
			if (typeof fnOrInput === "function") {
				// When first arg is an array of MotionValues, pass array of zeros to the function
				const input = Array.isArray(mvOrArray) ? mvOrArray.map(() => 0) : 0;
				return { get: () => fnOrInput(input), set: vi.fn() };
			}
			// Array mapping form: return a MotionValue-like object
			return { get: () => 1, set: vi.fn() };
		}),
		useScroll: vi.fn(() => ({
			scrollYProgress: { get: () => 0.5, set: vi.fn() },
		})),
		motion: new Proxy(
			{},
			{
				get: (_target, prop: string) => {
					// Return a component that renders the HTML element with forwarded props
					const Component = ({ children, ...props }: Record<string, unknown>) => {
						const { animate: _animate, transition: _transition, ...htmlProps } = props;
						const Tag = prop as unknown as React.ElementType;
						return <Tag {...htmlProps}>{children}</Tag>;
					};
					Component.displayName = `motion.${prop}`;
					return Component;
				},
			},
		),
		m: new Proxy(
			{},
			{
				get: (_target, prop) => {
					if (typeof prop === "symbol") return undefined;
					return prop;
				},
			},
		),
	};
});

vi.mock("@/shared/hooks/use-touch-device", () => ({
	useIsTouchDevice: vi.fn(() => false),
}));

vi.mock("@/shared/hooks/use-mounted", () => ({
	useMounted: vi.fn(() => true),
}));

// Now import the component after mocks are set up
const { useReducedMotion, useInView } = await import("motion/react");
const { useIsTouchDevice } = await import("@/shared/hooks/use-touch-device");
const { useMounted } = await import("@/shared/hooks/use-mounted");
const { ParticleBackground } = await import("./particle-background");

// Helper to mock matchMedia for high contrast / forced-colors tests
function mockMatchMedia(queries: Record<string, boolean>) {
	const listeners = new Map<string, Set<(e: MediaQueryListEvent) => void>>();

	window.matchMedia = vi.fn((query: string) => {
		if (!listeners.has(query)) listeners.set(query, new Set());
		return {
			matches: queries[query] ?? false,
			media: query,
			addEventListener: (_event: string, fn: (e: MediaQueryListEvent) => void) => {
				listeners.get(query)!.add(fn);
			},
			removeEventListener: (_event: string, fn: (e: MediaQueryListEvent) => void) => {
				listeners.get(query)!.delete(fn);
			},
			dispatchEvent: () => true,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
		} as MediaQueryList;
	});

	return listeners;
}

afterEach(() => {
	cleanup();
	resizeObserverInstances.length = 0;
});

// Ensure matchMedia is always available with default values (desktop breakpoint active)
beforeEach(() => {
	mockMatchMedia({
		"(prefers-contrast: more)": false,
		"(forced-colors: active)": false,
		"(min-width: 768px)": true,
	});
});

describe("ParticleBackground", () => {
	it("renders an aria-hidden container", () => {
		const { container } = render(<ParticleBackground />);
		const root = container.firstElementChild;
		expect(root).toBeTruthy();
		expect(root?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders particles directly in container (no wrapper divs)", () => {
		const { container } = render(<ParticleBackground count={3} />);
		const root = container.firstElementChild!;
		// Particles are direct children (no intermediate wrapper divs)
		const spans = root.querySelectorAll("span.absolute");
		expect(spans.length).toBe(3);
	});

	it("renders desktop particle count on desktop", () => {
		mockMatchMedia({
			"(prefers-contrast: more)": false,
			"(forced-colors: active)": false,
			"(min-width: 768px)": true,
		});
		const { container } = render(<ParticleBackground count={4} />);
		const root = container.firstElementChild!;
		const spans = root.querySelectorAll("span.absolute");
		expect(spans.length).toBe(4);
	});

	it("renders mobile particle count (ceil(count/2)) on mobile", () => {
		mockMatchMedia({
			"(prefers-contrast: more)": false,
			"(forced-colors: active)": false,
			"(min-width: 768px)": false,
		});
		const { container } = render(<ParticleBackground count={4} />);
		const root = container.firstElementChild!;
		const spans = root.querySelectorAll("span.absolute");
		expect(spans.length).toBe(2); // ceil(4/2)
	});

	it("renders static spans when reduced motion is preferred", () => {
		vi.mocked(useReducedMotion).mockReturnValue(true);
		const { container } = render(<ParticleBackground count={3} />);
		const root = container.firstElementChild!;
		const spans = root.querySelectorAll("span");
		expect(spans.length).toBeGreaterThan(0);
		vi.mocked(useReducedMotion).mockReturnValue(false);
	});

	it("renders null when disableOnTouch is true and device is touch", () => {
		vi.mocked(useIsTouchDevice as ReturnType<typeof vi.fn>).mockReturnValue(true);
		const { container } = render(<ParticleBackground disableOnTouch />);
		expect(container.firstElementChild).toBeNull();
		vi.mocked(useIsTouchDevice as ReturnType<typeof vi.fn>).mockReturnValue(false);
	});

	it("applies custom className", () => {
		const { container } = render(<ParticleBackground className="my-class" />);
		const root = container.firstElementChild;
		expect(root?.className).toContain("my-class");
	});

	it("applies CSS containment", () => {
		const { container } = render(<ParticleBackground />);
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.contain).toBe("layout paint style");
	});

	it("renders nothing when not in view", () => {
		vi.mocked(useInView).mockReturnValue(false);
		const { container } = render(<ParticleBackground count={4} />);
		const root = container.firstElementChild!;
		expect(root.querySelectorAll("span.absolute").length).toBe(0);
		vi.mocked(useInView).mockReturnValue(true);
	});

	it("renders different particle counts for different speed values", () => {
		// Speed doesn't change count, but it changes duration which affects generated particles
		const { container: fast } = render(<ParticleBackground count={3} speed={2} />);
		const { container: slow } = render(<ParticleBackground count={3} speed={0.5} />);
		// Both should render the same number of particles
		const fastSpans = fast.firstElementChild!.querySelectorAll("span.absolute");
		const slowSpans = slow.firstElementChild!.querySelectorAll("span.absolute");
		expect(fastSpans.length).toBe(3);
		expect(slowSpans.length).toBe(3);
	});

	it("clamps speed to minimum 0.01 (speed=0 does not crash)", () => {
		// Should not throw or produce Infinity durations
		expect(() => render(<ParticleBackground count={2} speed={0} />)).not.toThrow();
		expect(() => render(<ParticleBackground count={2} speed={-5} />)).not.toThrow();
	});

	it("renders mixed shapes when shape is an array", () => {
		const { container } = render(<ParticleBackground count={4} shape={["circle", "crescent"]} />);
		const root = container.firstElementChild!;
		// crescent is SVG, so we should find SVG elements
		const svgs = root.querySelectorAll("svg");
		expect(svgs.length).toBeGreaterThan(0);
		// Also regular spans (circle shapes)
		const spans = root.querySelectorAll("span.absolute");
		expect(spans.length).toBe(4);
	});

	it("clamps count to MAX_PARTICLES (30)", () => {
		const { container } = render(<ParticleBackground count={100} />);
		const root = container.firstElementChild!;
		const spans = root.querySelectorAll("span.absolute");
		// Should be clamped to 30, not 100
		expect(spans.length).toBe(30);
	});

	it("renders all animation styles without crashing", () => {
		const styles = ["float", "drift", "rise", "orbit", "breathe", "sparkle", "cascade"] as const;
		for (const animationStyle of styles) {
			expect(() =>
				render(<ParticleBackground count={2} animationStyle={animationStyle} />),
			).not.toThrow();
			cleanup();
		}
	});

	it("pauses particles when tab becomes hidden via visibilitychange", () => {
		// useInView returns true, so particles are visible initially
		vi.mocked(useInView).mockReturnValue(true);
		const { container } = render(<ParticleBackground count={3} />);

		const root = container.firstElementChild!;
		// Particles should be rendered initially
		expect(root.querySelectorAll("span.absolute").length).toBe(3);

		// Simulate tab going hidden
		act(() => {
			Object.defineProperty(document, "visibilityState", {
				value: "hidden",
				writable: true,
				configurable: true,
			});
			document.dispatchEvent(new Event("visibilitychange"));
		});

		// Particles should be hidden (isInView becomes false because tabVisible=false)
		expect(root.querySelectorAll("span.absolute").length).toBe(0);

		// Simulate tab becoming visible again
		act(() => {
			Object.defineProperty(document, "visibilityState", {
				value: "visible",
				writable: true,
				configurable: true,
			});
			document.dispatchEvent(new Event("visibilitychange"));
		});

		// Particles should be visible again
		expect(root.querySelectorAll("span.absolute").length).toBe(3);
	});

	it("renders null when forced-colors mode is active", () => {
		mockMatchMedia({
			"(prefers-contrast: more)": false,
			"(forced-colors: active)": true,
			"(min-width: 768px)": true,
		});
		const { container } = render(<ParticleBackground count={3} />);
		expect(container.firstElementChild).toBeNull();
	});

	it("renders particles before mount even with forced-colors (avoids hydration mismatch)", () => {
		vi.mocked(useMounted as ReturnType<typeof vi.fn>).mockReturnValue(false);
		mockMatchMedia({
			"(prefers-contrast: more)": false,
			"(forced-colors: active)": true,
			"(min-width: 768px)": true,
		});
		const { container } = render(<ParticleBackground count={3} />);
		// Before mount, should render regardless of forced-colors
		expect(container.firstElementChild).toBeTruthy();
		expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
		vi.mocked(useMounted as ReturnType<typeof vi.fn>).mockReturnValue(true);
	});

	it("renders particles when prefers-contrast: more is active (with reduced visual impact)", () => {
		mockMatchMedia({
			"(prefers-contrast: more)": true,
			"(forced-colors: active)": false,
			"(min-width: 768px)": true,
		});
		const { container } = render(<ParticleBackground count={3} />);
		// Should still render particles, but with adjusted opacity/blur
		const root = container.firstElementChild!;
		expect(root).toBeTruthy();
		expect(root.querySelectorAll("span.absolute").length).toBe(3);
	});

	it("renders with scrollFade prop without crashing", () => {
		expect(() => render(<ParticleBackground count={3} scrollFade />)).not.toThrow();
		// Should render particles normally
	});

	it("renders sparkle animation style", () => {
		const { container } = render(<ParticleBackground count={3} animationStyle="sparkle" />);
		const root = container.firstElementChild!;
		expect(root.querySelectorAll("span.absolute").length).toBe(3);
	});

	it("renders cascade animation style", () => {
		const { container } = render(<ParticleBackground count={3} animationStyle="cascade" />);
		const root = container.firstElementChild!;
		expect(root.querySelectorAll("span.absolute").length).toBe(3);
	});

	it("renders star shape without crashing", () => {
		const { container } = render(<ParticleBackground count={3} shape="star" />);
		const root = container.firstElementChild!;
		expect(root.querySelectorAll("span.absolute").length).toBe(3);
	});

	it("renders hexagon shape without crashing", () => {
		const { container } = render(<ParticleBackground count={3} shape="hexagon" />);
		const root = container.firstElementChild!;
		expect(root.querySelectorAll("span.absolute").length).toBe(3);
	});

	it("renders mixed shapes including star and hexagon", () => {
		const { container } = render(
			<ParticleBackground count={6} shape={["circle", "star", "hexagon"]} />,
		);
		const root = container.firstElementChild!;
		expect(root.querySelectorAll("span.absolute").length).toBe(6);
	});

	it("renders with scrollParallax prop without crashing", () => {
		expect(() => render(<ParticleBackground count={3} scrollParallax />)).not.toThrow();
	});

	it("renders with combined scrollFade and scrollParallax props", () => {
		expect(() => render(<ParticleBackground count={3} scrollFade scrollParallax />)).not.toThrow();
	});

	// ─── Phase 3 new features ──────────────────────────────────────────

	it("renders twinkle animation style without crashing", () => {
		const { container } = render(<ParticleBackground count={3} animationStyle="twinkle" />);
		const root = container.firstElementChild!;
		expect(root.querySelectorAll("span.absolute").length).toBe(3);
	});

	it("renders with gradient enabled without crashing", () => {
		// The radial-gradient fill content is asserted in utils.test.ts (getShapeStyles);
		// jsdom does not reliably serialize color-mix()/radial-gradient inline styles.
		const { container } = render(<ParticleBackground count={2} gradient shape="circle" />);
		const root = container.firstElementChild!;
		expect(root.querySelectorAll("span.absolute").length).toBe(2);
	});

	it("renders a constellation overlay (svg with preserveAspectRatio=none) when connect is set", () => {
		const { container } = render(
			<ParticleBackground count={10} connect={{ maxDistance: 100 }} shape="circle" />,
		);
		const root = container.firstElementChild!;
		const overlay = root.querySelector('svg[preserveAspectRatio="none"]');
		expect(overlay).toBeTruthy();
		// maxDistance=100 (whole container) → every pair is linked → lines present
		expect(overlay!.querySelectorAll("line").length).toBeGreaterThan(0);
	});

	it("does NOT render the constellation overlay under reduced motion", () => {
		vi.mocked(useReducedMotion).mockReturnValue(true);
		const { container } = render(
			<ParticleBackground count={10} connect={{ maxDistance: 100 }} shape="circle" />,
		);
		const root = container.firstElementChild!;
		expect(root.querySelector('svg[preserveAspectRatio="none"]')).toBeNull();
		vi.mocked(useReducedMotion).mockReturnValue(false);
	});

	it("caps particle count to 12 when constellation mode is active", () => {
		const { container } = render(
			<ParticleBackground count={30} connect={{ maxDistance: 100 }} shape="circle" />,
		);
		const root = container.firstElementChild!;
		expect(root.querySelectorAll("span.absolute").length).toBe(12);
	});

	it("renders with density prop without crashing (falls back to count until measured)", () => {
		expect(() => render(<ParticleBackground count={4} density={20} />)).not.toThrow();
	});
});

// ─── scrollFade progressive opacity mapping ──────────────────────────

describe("scrollFade opacity mapping", () => {
	it("configures progressive opacity [0→0, 0.15→1, 0.85→1, 1→0]", async () => {
		const { useTransform } = await import("motion/react");
		vi.mocked(useTransform).mockClear();

		render(<ParticleBackground count={1} scrollFade />);

		// Find the array mapping call (second arg is an array, not a function)
		const mappingCall = (vi.mocked(useTransform).mock.calls as unknown[][]).find((args) =>
			Array.isArray(args[1]),
		);

		expect(mappingCall).toBeDefined();
		// Input breakpoints: 0%, 15%, 85%, 100% scroll progress
		expect(mappingCall![1]).toEqual([0, 0.15, 0.85, 1]);
		// Output opacity: fade in, hold, fade out
		expect(mappingCall![2]).toEqual([0, 1, 1, 0]);
	});

	it("does NOT compute scrollOpacity when no scroll feature is enabled (F5: scroll pipeline gated)", async () => {
		const { useTransform } = await import("motion/react");
		vi.mocked(useTransform).mockClear();

		render(<ParticleBackground count={1} />);

		// Without scrollFade/scrollParallax, useScrollFade (and its array-mapping useTransform)
		// is never mounted — the scroll listener pipeline stays off.
		const mappingCall = (vi.mocked(useTransform).mock.calls as unknown[][]).find((args) =>
			Array.isArray(args[1]),
		);
		expect(mappingCall).toBeUndefined();
	});

	it("computes scrollOpacity when scrollParallax is enabled", async () => {
		const { useTransform } = await import("motion/react");
		vi.mocked(useTransform).mockClear();

		render(<ParticleBackground count={1} scrollParallax />);

		const mappingCall = (vi.mocked(useTransform).mock.calls as unknown[][]).find((args) =>
			Array.isArray(args[1]),
		);
		expect(mappingCall).toBeDefined();
	});
});
