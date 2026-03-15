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
const { useReducedMotion, useInView, useMotionValue } = await import("motion/react");
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

	it("renders with interactive prop without crashing", () => {
		expect(() => render(<ParticleBackground count={3} interactive />)).not.toThrow();
	});

	it("renders with combined scrollFade and scrollParallax props", () => {
		expect(() => render(<ParticleBackground count={3} scrollFade scrollParallax />)).not.toThrow();
	});
});

// ─── scrollFade progressive opacity mapping ──────────────────────────

describe("scrollFade opacity mapping", () => {
	it("configures progressive opacity [0→0, 0.15→1, 0.85→1, 1→0]", async () => {
		const { useTransform } = await import("motion/react");
		vi.mocked(useTransform).mockClear();

		render(<ParticleBackground count={1} scrollFade />);

		// Find the array mapping call (second arg is an array, not a function)
		const mappingCall = vi
			.mocked(useTransform)
			.mock.calls.find(([_mv, input]) => Array.isArray(input));

		expect(mappingCall).toBeDefined();
		// Input breakpoints: 0%, 15%, 85%, 100% scroll progress
		expect(mappingCall![1]).toEqual([0, 0.15, 0.85, 1]);
		// Output opacity: fade in, hold, fade out
		expect(mappingCall![2]).toEqual([0, 1, 1, 0]);
	});

	it("always computes scrollOpacity even without scrollFade prop", async () => {
		const { useTransform } = await import("motion/react");
		vi.mocked(useTransform).mockClear();

		render(<ParticleBackground count={1} />);

		// The mapping is always created (scrollFade only controls whether it's passed to ParticleSet)
		const mappingCall = vi
			.mocked(useTransform)
			.mock.calls.find(([_mv, input]) => Array.isArray(input));
		expect(mappingCall).toBeDefined();
	});
});

// ─── Parallax & mouse interaction tests ─────────────────────────────

describe("ParticleBackground parallax", () => {
	let motionValues: { initial: unknown; value: unknown; setFn: ReturnType<typeof vi.fn> }[];

	beforeEach(() => {
		mockMatchMedia({
			"(prefers-contrast: more)": false,
			"(forced-colors: active)": false,
			"(min-width: 768px)": true,
		});

		// Track all useMotionValue instances to capture mouseX/mouseY
		motionValues = [];
		vi.mocked(useMotionValue).mockImplementation((initial) => {
			const mv = {
				initial,
				value: initial,
				get: () => mv.value,
				set: vi.fn((v: number) => {
					mv.value = v;
				}),
				setFn: vi.fn((v: number) => {
					mv.value = v;
				}),
			};
			// Wire set to also call setFn for tracking
			mv.set = mv.setFn;
			motionValues.push(mv);
			return mv as any;
		});
	});

	afterEach(() => {
		vi.mocked(useMotionValue).mockImplementation(
			(initial) =>
				({
					get: () => initial,
					set: vi.fn(),
				}) as any,
		);
	});

	it("sets parallax offset on mousemove", () => {
		const { container } = render(<ParticleBackground count={2} />);
		const root = container.firstElementChild as HTMLElement;

		// mouseX = motionValues[0], mouseY = motionValues[1] (first two useMotionValue calls)
		const mouseXMv = motionValues[0]!;
		const mouseYMv = motionValues[1]!;

		// Mock getBoundingClientRect on the container (cached at effect setup)
		vi.spyOn(root, "getBoundingClientRect").mockReturnValue({
			left: 0,
			top: 0,
			width: 200,
			height: 200,
			right: 200,
			bottom: 200,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		} as DOMRect);

		// Mark rect as stale so it refreshes on next mousemove
		act(() => {
			window.dispatchEvent(new Event("scroll"));
		});

		act(() => {
			root.dispatchEvent(
				new MouseEvent("mousemove", {
					clientX: 150,
					clientY: 100,
					bubbles: true,
				}),
			);
		});

		// mouseX = ((150 - 0) / 200 - 0.5) * 2 * 20 = 0.25 * 40 = 10
		expect(mouseXMv.setFn).toHaveBeenCalledWith(10);
		// mouseY = ((100 - 0) / 200 - 0.5) * 2 * 20 = 0 * 40 = 0
		expect(mouseYMv.setFn).toHaveBeenCalledWith(0);
	});

	it("starts lerp reset on mouseleave", () => {
		const rafCallbacks: FrameRequestCallback[] = [];
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			rafCallbacks.push(cb);
			return rafCallbacks.length;
		});
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

		const { container } = render(<ParticleBackground count={2} />);
		const root = container.firstElementChild as HTMLElement;

		const mouseXMv = motionValues[0]!;
		const mouseYMv = motionValues[1]!;

		// Set initial parallax values
		mouseXMv.value = 10;
		mouseYMv.value = 5;

		const callsBefore = rafCallbacks.length;

		act(() => {
			root.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
		});

		// mouseleave should have scheduled a RAF callback for the lerp animation
		expect(rafCallbacks.length).toBeGreaterThan(callsBefore);

		vi.mocked(window.requestAnimationFrame).mockRestore();
		vi.mocked(window.cancelAnimationFrame).mockRestore();
	});

	it("lerp animation converges values toward zero", () => {
		const rafCallbacks: FrameRequestCallback[] = [];
		let rafCounter = 1;
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			rafCallbacks.push(cb);
			return rafCounter++;
		});
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
		vi.spyOn(performance, "now").mockReturnValue(0);

		const { container } = render(<ParticleBackground count={2} />);
		const root = container.firstElementChild as HTMLElement;

		const mouseXMv = motionValues[0]!;
		const mouseYMv = motionValues[1]!;

		// Set non-zero parallax values
		mouseXMv.value = 10;
		mouseYMv.value = -8;

		act(() => {
			root.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
		});

		// Run the first RAF step at t=300ms (halfway through 600ms LERP_RESET_DURATION)
		vi.spyOn(performance, "now").mockReturnValue(300);
		const leaveCallback = rafCallbacks[rafCallbacks.length - 1]!;
		act(() => {
			leaveCallback(300);
		});

		// At t=300, t_norm = 0.5, easeOutQuad = 1 - (0.5)^2 = 0.75
		// mouseX should be 10 * (1 - 0.75) = 2.5
		expect(mouseXMv.value).toBeCloseTo(2.5, 1);
		// mouseY should be -8 * (1 - 0.75) = -2
		expect(mouseYMv.value).toBeCloseTo(-2, 1);

		// Run the final RAF step at t=600ms (end of lerp)
		vi.spyOn(performance, "now").mockReturnValue(600);
		const nextCallback = rafCallbacks[rafCallbacks.length - 1]!;
		act(() => {
			nextCallback(600);
		});

		// At t=600, t_norm = 1, ease = 1, values should be 0
		expect(mouseXMv.value).toBeCloseTo(0, 5);
		expect(mouseYMv.value).toBeCloseTo(0, 5);

		vi.mocked(window.requestAnimationFrame).mockRestore();
		vi.mocked(window.cancelAnimationFrame).mockRestore();
		vi.mocked(performance.now).mockRestore();
	});

	it("cancels previous lerp when a new mousemove occurs", () => {
		const cancelSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
		vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 42);

		const { container } = render(<ParticleBackground count={2} />);
		const root = container.firstElementChild as HTMLElement;

		motionValues[0]!.value = 10;
		motionValues[1]!.value = 5;

		// Start a lerp
		act(() => {
			root.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
		});

		// mousemove should cancel the ongoing lerp
		act(() => {
			root.dispatchEvent(
				new MouseEvent("mousemove", {
					clientX: 50,
					clientY: 50,
					bubbles: true,
				}),
			);
		});

		expect(cancelSpy).toHaveBeenCalled();

		cancelSpy.mockRestore();
		vi.mocked(window.requestAnimationFrame).mockRestore();
	});

	it("does not update parallax values when disableOnTouch + touch device", () => {
		vi.mocked(useIsTouchDevice as ReturnType<typeof vi.fn>).mockReturnValue(true);

		// Component returns null — no container to interact with
		const { container } = render(<ParticleBackground count={2} disableOnTouch />);
		expect(container.firstElementChild).toBeNull();

		// No motion values should have been created (component returned null before hooks)
		expect(motionValues).toHaveLength(0);

		vi.mocked(useIsTouchDevice as ReturnType<typeof vi.fn>).mockReturnValue(false);
	});

	it("skips mouse listeners on touch devices even without disableOnTouch", () => {
		vi.mocked(useIsTouchDevice as ReturnType<typeof vi.fn>).mockReturnValue(true);

		const { container } = render(<ParticleBackground count={2} />);
		const root = container.firstElementChild as HTMLElement;

		// Component renders but mouse listeners should not be attached
		expect(root).toBeTruthy();

		// mouseX/mouseY should stay at 0 after mousemove (no listener attached)
		const mouseXMv = motionValues[0]!;
		act(() => {
			root.dispatchEvent(
				new MouseEvent("mousemove", { clientX: 100, clientY: 100, bubbles: true }),
			);
		});
		expect(mouseXMv.value).toBe(0);

		vi.mocked(useIsTouchDevice as ReturnType<typeof vi.fn>).mockReturnValue(false);
	});

	it("marks rect as stale on scroll and refreshes on next mousemove", () => {
		const { container } = render(<ParticleBackground count={2} />);
		const root = container.firstElementChild as HTMLElement;

		const mouseXMv = motionValues[0]!;

		// Initial rect (from effect setup with default jsdom values)
		const rectSpy = vi.spyOn(root, "getBoundingClientRect").mockReturnValue({
			left: 100,
			top: 0,
			width: 200,
			height: 200,
			right: 300,
			bottom: 200,
			x: 100,
			y: 0,
			toJSON: () => ({}),
		} as DOMRect);

		// Scroll marks rect stale (cheap — no getBoundingClientRect call)
		act(() => {
			window.dispatchEvent(new Event("scroll"));
		});

		// Next mousemove refreshes the rect and uses the new position
		act(() => {
			root.dispatchEvent(
				new MouseEvent("mousemove", {
					clientX: 200,
					clientY: 100,
					bubbles: true,
				}),
			);
		});

		// getBoundingClientRect should have been called during mousemove (stale refresh)
		expect(rectSpy).toHaveBeenCalled();
		// mouseX = ((200 - 100) / 200 - 0.5) * 2 * 20 = 0 * 40 = 0 (center of container)
		expect(mouseXMv.value).toBeCloseTo(0, 1);

		rectSpy.mockRestore();
	});
});
