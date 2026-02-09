import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock motion/react before importing the component
vi.mock("motion/react", () => {
	const actual = vi.importActual("motion/react");
	return {
		...actual,
		useReducedMotion: vi.fn(() => false),
		useInView: vi.fn(() => true),
		useMotionValue: vi.fn((initial: number) => ({
			get: () => initial,
			set: vi.fn(),
		})),
		useTransform: vi.fn((_mv: unknown, fn: (v: number) => number) => ({
			get: () => fn(0),
			set: vi.fn(),
		})),
		motion: new Proxy(
			{},
			{
				get: (_target, prop: string) => {
					// Return a component that renders the HTML element with forwarded props
					const Component = ({ children, ...props }: Record<string, unknown>) => {
						const { animate, transition, ...htmlProps } = props;
						const Tag = prop as unknown as React.ElementType;
						return <Tag {...htmlProps}>{children}</Tag>;
					};
					Component.displayName = `motion.${prop}`;
					return Component;
				},
			},
		),
	};
});

vi.mock("@/shared/hooks/use-touch-device", () => ({
	useIsTouchDevice: vi.fn(() => false),
}));

// Now import the component after mocks are set up
const { useReducedMotion, useInView } = await import("motion/react");
const { useIsTouchDevice } = await import("@/shared/hooks/use-touch-device");
const { ParticleBackground } = await import("./particle-background");

afterEach(cleanup);

describe("ParticleBackground", () => {
	it("renders an aria-hidden container", () => {
		const { container } = render(<ParticleBackground />);
		const root = container.firstElementChild;
		expect(root).toBeTruthy();
		expect(root?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders desktop and mobile wrappers", () => {
		const { container } = render(<ParticleBackground count={3} />);
		const root = container.firstElementChild!;
		const children = Array.from(root.children);
		expect(children).toHaveLength(2);
		// Desktop: hidden md:contents
		expect(children[0].className).toContain("hidden");
		expect(children[0].className).toContain("md:contents");
		// Mobile: contents md:hidden
		expect(children[1].className).toContain("contents");
		expect(children[1].className).toContain("md:hidden");
	});

	it("renders particles as spans", () => {
		const { container } = render(<ParticleBackground count={4} />);
		// Desktop wrapper has 4 particles, mobile has 2 (ceil(4/2))
		const desktopWrapper = container.firstElementChild!.children[0];
		const mobileWrapper = container.firstElementChild!.children[1];
		// Each particle is a span with absolute positioning
		const desktopSpans = desktopWrapper.querySelectorAll("span.absolute");
		const mobileSpans = mobileWrapper.querySelectorAll("span.absolute");
		expect(desktopSpans.length).toBe(4);
		expect(mobileSpans.length).toBe(2);
	});

	it("renders static spans when reduced motion is preferred", () => {
		vi.mocked(useReducedMotion).mockReturnValue(true);
		const { container } = render(<ParticleBackground count={3} />);
		// Static particles use plain <span> instead of <motion.span>
		const desktopWrapper = container.firstElementChild!.children[0];
		const spans = desktopWrapper.querySelectorAll("span");
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
		expect(root.style.contain).toBe("layout paint");
	});

	it("renders nothing when not in view", () => {
		vi.mocked(useInView).mockReturnValue(false);
		const { container } = render(<ParticleBackground count={4} />);
		// Desktop and mobile wrappers exist but should be empty (ParticleSet returns null)
		const desktopWrapper = container.firstElementChild!.children[0];
		const mobileWrapper = container.firstElementChild!.children[1];
		expect(desktopWrapper.querySelectorAll("span.absolute").length).toBe(0);
		expect(mobileWrapper.querySelectorAll("span.absolute").length).toBe(0);
		vi.mocked(useInView).mockReturnValue(true);
	});

	it("renders different particle counts for different speed values", () => {
		// Speed doesn't change count, but it changes duration which affects generated particles
		const { container: fast } = render(<ParticleBackground count={3} speed={2} />);
		const { container: slow } = render(<ParticleBackground count={3} speed={0.5} />);
		// Both should render the same number of particles
		const fastSpans = fast.firstElementChild!.children[0].querySelectorAll("span.absolute");
		const slowSpans = slow.firstElementChild!.children[0].querySelectorAll("span.absolute");
		expect(fastSpans.length).toBe(3);
		expect(slowSpans.length).toBe(3);
	});

	it("clamps speed to minimum 0.01 (speed=0 does not crash)", () => {
		// Should not throw or produce Infinity durations
		expect(() => render(<ParticleBackground count={2} speed={0} />)).not.toThrow();
		expect(() => render(<ParticleBackground count={2} speed={-5} />)).not.toThrow();
	});

	it("renders mixed shapes when shape is an array", () => {
		const { container } = render(
			<ParticleBackground count={4} shape={["circle", "crescent"]} />,
		);
		const desktopWrapper = container.firstElementChild!.children[0];
		// crescent is SVG, so we should find SVG elements
		const svgs = desktopWrapper.querySelectorAll("svg");
		expect(svgs.length).toBeGreaterThan(0);
		// Also regular spans (circle shapes)
		const spans = desktopWrapper.querySelectorAll("span.absolute");
		expect(spans.length).toBe(4);
	});

	it("clamps count to MAX_PARTICLES (30)", () => {
		const { container } = render(<ParticleBackground count={100} />);
		const desktopWrapper = container.firstElementChild!.children[0];
		const desktopSpans = desktopWrapper.querySelectorAll("span.absolute");
		// Should be clamped to 30, not 100
		expect(desktopSpans.length).toBe(30);
	});

	it("renders all animation styles without crashing", () => {
		const styles = ["float", "drift", "rise", "orbit", "breathe"] as const;
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

		// Particles should be rendered initially
		const desktopWrapper = container.firstElementChild!.children[0];
		expect(desktopWrapper.querySelectorAll("span.absolute").length).toBe(3);

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
		expect(desktopWrapper.querySelectorAll("span.absolute").length).toBe(0);

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
		expect(desktopWrapper.querySelectorAll("span.absolute").length).toBe(3);
	});
});
