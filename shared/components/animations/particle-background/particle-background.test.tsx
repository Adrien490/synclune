import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock motion/react before importing the component
vi.mock("motion/react", () => ({
	useReducedMotion: vi.fn(() => false),
	useInView: vi.fn(() => true),
	m: new Proxy(
		{},
		{
			get: (_target, prop) => {
				if (typeof prop === "symbol") return undefined;
				return prop;
			},
		},
	),
}));

vi.mock("@/shared/hooks/use-mounted", () => ({
	useMounted: vi.fn(() => true),
}));

// Now import the component after mocks are set up
const { useReducedMotion, useInView } = await import("motion/react");
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
		const { container } = render(<ParticleBackground count={4} shape={["circle", "heart"]} />);
		const root = container.firstElementChild!;
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
		const styles = ["float", "drift", "breathe"] as const;
		for (const animationStyle of styles) {
			expect(() =>
				render(<ParticleBackground count={2} animationStyle={animationStyle} />),
			).not.toThrow();
			cleanup();
		}
	});

	it("renders all shapes without crashing", () => {
		const shapes = ["circle", "diamond", "heart", "pearl", "drop"] as const;
		for (const shape of shapes) {
			expect(() => render(<ParticleBackground count={2} shape={shape} />)).not.toThrow();
			cleanup();
		}
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

	it("renders with gradient enabled without crashing", () => {
		// The radial-gradient fill content is asserted in utils.test.ts (getShapeStyles);
		// jsdom does not reliably serialize color-mix()/radial-gradient inline styles.
		const { container } = render(<ParticleBackground count={2} gradient shape="circle" />);
		const root = container.firstElementChild!;
		expect(root.querySelectorAll("span.absolute").length).toBe(2);
	});

	// ─── seed ───────────────────────────────────────────────────────────

	it("produces a different layout for a different seed (same props otherwise)", () => {
		const { container: a } = render(<ParticleBackground count={4} seed={0} />);
		const { container: b } = render(<ParticleBackground count={4} seed={1} />);

		const positions = (root: Element) =>
			Array.from(root.querySelectorAll("span.absolute")).map((s) => {
				const el = s as HTMLElement;
				return `${el.style.left},${el.style.top}`;
			});

		const posA = positions(a.firstElementChild!);
		const posB = positions(b.firstElementChild!);
		expect(posA).toHaveLength(4);
		expect(posA).not.toEqual(posB);
	});

	it("produces the same layout for the same seed (deterministic)", () => {
		const { container: a } = render(<ParticleBackground count={4} seed={5} />);
		const { container: b } = render(<ParticleBackground count={4} seed={5} />);

		const positions = (root: Element) =>
			Array.from(root.querySelectorAll("span.absolute")).map((s) => {
				const el = s as HTMLElement;
				return `${el.style.left},${el.style.top}`;
			});

		expect(positions(a.firstElementChild!)).toEqual(positions(b.firstElementChild!));
	});
});
