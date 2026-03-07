import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock ResizeObserver
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
			if (typeof fnOrInput === "function") {
				const input = Array.isArray(mvOrArray) ? mvOrArray.map(() => 0) : 0;
				return { get: () => fnOrInput(input), set: vi.fn() };
			}
			return { get: () => 1, set: vi.fn() };
		}),
		useScroll: vi.fn(() => ({
			scrollYProgress: { get: () => 0.5, set: vi.fn() },
		})),
		motion: new Proxy(
			{},
			{
				get: (_target, prop: string) => {
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

const { useReducedMotion, useInView } = await import("motion/react");
const { useIsTouchDevice } = await import("@/shared/hooks/use-touch-device");
const { useMounted } = await import("@/shared/hooks/use-mounted");
const { AuroraBackground } = await import("./aurora-background");
const { AuroraRibbonSet } = await import("./aurora-ribbon-set");
const { generateRibbons } = await import("./utils");
const { AURORA_PALETTES } = await import("./constants");

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

beforeEach(() => {
	mockMatchMedia({
		"(prefers-contrast: more)": false,
		"(forced-colors: active)": false,
		"(min-width: 768px)": true,
	});
});

describe("AuroraBackground", () => {
	it("renders an aria-hidden container", () => {
		const { container } = render(<AuroraBackground />);
		const root = container.firstElementChild;
		expect(root).toBeTruthy();
		expect(root?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders ribbons as direct children of container", () => {
		const { container } = render(<AuroraBackground count={3} />);
		const root = container.firstElementChild!;
		const divs = root.querySelectorAll("div.absolute");
		expect(divs.length).toBe(3);
	});

	it("renders desktop ribbon count on desktop", () => {
		mockMatchMedia({
			"(prefers-contrast: more)": false,
			"(forced-colors: active)": false,
			"(min-width: 768px)": true,
		});
		const { container } = render(<AuroraBackground count={5} />);
		const root = container.firstElementChild!;
		const divs = root.querySelectorAll("div.absolute");
		expect(divs.length).toBe(5);
	});

	it("renders mobile ribbon count (ceil(count*0.6)) on mobile", () => {
		mockMatchMedia({
			"(prefers-contrast: more)": false,
			"(forced-colors: active)": false,
			"(min-width: 768px)": false,
		});
		const { container } = render(<AuroraBackground count={5} />);
		const root = container.firstElementChild!;
		const divs = root.querySelectorAll("div.absolute");
		expect(divs.length).toBe(3); // ceil(5*0.6)
	});

	it("renders static divs when reduced motion is preferred", () => {
		vi.mocked(useReducedMotion).mockReturnValue(true);
		const { container } = render(<AuroraBackground count={3} />);
		const root = container.firstElementChild!;
		const divs = root.querySelectorAll("div");
		expect(divs.length).toBeGreaterThan(0);
		vi.mocked(useReducedMotion).mockReturnValue(false);
	});

	it("renders null when disableOnTouch is true and device is touch", () => {
		vi.mocked(useIsTouchDevice as ReturnType<typeof vi.fn>).mockReturnValue(true);
		const { container } = render(<AuroraBackground disableOnTouch />);
		expect(container.firstElementChild).toBeNull();
		vi.mocked(useIsTouchDevice as ReturnType<typeof vi.fn>).mockReturnValue(false);
	});

	it("applies custom className", () => {
		const { container } = render(<AuroraBackground className="my-aurora" />);
		const root = container.firstElementChild;
		expect(root?.className).toContain("my-aurora");
	});

	it("applies CSS containment", () => {
		const { container } = render(<AuroraBackground />);
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.contain).toBe("layout paint style");
	});

	it("renders nothing when not in view", () => {
		vi.mocked(useInView).mockReturnValue(false);
		const { container } = render(<AuroraBackground count={4} />);
		const root = container.firstElementChild!;
		expect(root.querySelectorAll("div.absolute").length).toBe(0);
		vi.mocked(useInView).mockReturnValue(true);
	});

	it("clamps count to MAX_RIBBONS (12)", () => {
		const { container } = render(<AuroraBackground count={50} />);
		const root = container.firstElementChild!;
		const divs = root.querySelectorAll("div.absolute");
		expect(divs.length).toBe(12);
	});

	it("renders null when forced-colors mode is active", () => {
		mockMatchMedia({
			"(prefers-contrast: more)": false,
			"(forced-colors: active)": true,
			"(min-width: 768px)": true,
		});
		const { container } = render(<AuroraBackground count={3} />);
		expect(container.firstElementChild).toBeNull();
	});

	it("renders before mount even with forced-colors (avoids hydration mismatch)", () => {
		vi.mocked(useMounted as ReturnType<typeof vi.fn>).mockReturnValue(false);
		mockMatchMedia({
			"(prefers-contrast: more)": false,
			"(forced-colors: active)": true,
			"(min-width: 768px)": true,
		});
		const { container } = render(<AuroraBackground count={3} />);
		expect(container.firstElementChild).toBeTruthy();
		expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
		vi.mocked(useMounted as ReturnType<typeof vi.fn>).mockReturnValue(true);
	});

	it("renders with prefers-contrast: more (reduced visual impact)", () => {
		mockMatchMedia({
			"(prefers-contrast: more)": true,
			"(forced-colors: active)": false,
			"(min-width: 768px)": true,
		});
		const { container } = render(<AuroraBackground count={3} />);
		const root = container.firstElementChild!;
		expect(root).toBeTruthy();
		expect(root.querySelectorAll("div.absolute").length).toBe(3);
	});

	it("renders with scrollFade prop without crashing", () => {
		expect(() => render(<AuroraBackground count={3} scrollFade />)).not.toThrow();
	});

	it("renders with interactive prop without crashing", () => {
		expect(() => render(<AuroraBackground count={3} interactive />)).not.toThrow();
	});

	it("clamps speed to minimum 0.01 (speed=0 does not crash)", () => {
		expect(() => render(<AuroraBackground count={2} speed={0} />)).not.toThrow();
		expect(() => render(<AuroraBackground count={2} speed={-5} />)).not.toThrow();
	});

	it("renders with palette prop", () => {
		const palettes = ["jewelry", "rose-gold", "moonstone", "amethyst"] as const;
		for (const palette of palettes) {
			const { container } = render(<AuroraBackground count={2} palette={palette} />);
			const root = container.firstElementChild!;
			expect(root.querySelectorAll("div.absolute").length).toBe(2);
			cleanup();
		}
	});

	it("renders with intensity presets", () => {
		const intensities = ["subtle", "medium", "vivid"] as const;
		for (const intensity of intensities) {
			expect(() => render(<AuroraBackground count={2} intensity={intensity} />)).not.toThrow();
			cleanup();
		}
	});

	it("pauses ribbons when tab becomes hidden via visibilitychange", () => {
		vi.mocked(useInView).mockReturnValue(true);
		const { container } = render(<AuroraBackground count={3} />);
		const root = container.firstElementChild!;

		expect(root.querySelectorAll("div.absolute").length).toBe(3);

		act(() => {
			Object.defineProperty(document, "visibilityState", {
				value: "hidden",
				writable: true,
				configurable: true,
			});
			document.dispatchEvent(new Event("visibilitychange"));
		});

		expect(root.querySelectorAll("div.absolute").length).toBe(0);

		act(() => {
			Object.defineProperty(document, "visibilityState", {
				value: "visible",
				writable: true,
				configurable: true,
			});
			document.dispatchEvent(new Event("visibilitychange"));
		});

		expect(root.querySelectorAll("div.absolute").length).toBe(3);
	});

	it("custom colors override palette", () => {
		// Should not crash with both colors and palette
		expect(() =>
			render(<AuroraBackground count={2} colors={["red", "blue"]} palette="moonstone" />),
		).not.toThrow();
	});
});

// ─── AuroraRibbonSet ────────────────────────────────────────────────

describe("AuroraRibbonSet", () => {
	const ribbons = generateRibbons(
		3,
		[300, 600],
		[100, 300],
		[0.15, 0.35],
		[40, 80],
		AURORA_PALETTES.jewelry,
		25,
	);

	it("renders nothing when isInView is false", () => {
		const { container } = render(
			<AuroraRibbonSet
				ribbons={ribbons}
				isInView={false}
				reducedMotion={false}
				blendMode="screen"
				intensity="medium"
			/>,
		);
		expect(container.innerHTML).toBe("");
	});

	it("renders static ribbons when reducedMotion is true", () => {
		const { container } = render(
			<AuroraRibbonSet
				ribbons={ribbons}
				isInView={true}
				reducedMotion={true}
				blendMode="screen"
				intensity="medium"
			/>,
		);
		const divs = container.querySelectorAll("div.absolute");
		expect(divs.length).toBe(3);
	});

	it("renders ribbons when reducedMotion is false", () => {
		const { container } = render(
			<AuroraRibbonSet
				ribbons={ribbons}
				isInView={true}
				reducedMotion={false}
				blendMode="screen"
				intensity="medium"
			/>,
		);
		// m.div is mocked as a string tag, so ribbons still render elements
		expect(container.children.length).toBeGreaterThan(0);
	});

	it("uses fallback MotionValues when mouseX/mouseY not provided", () => {
		// Should not throw when mouseX/mouseY are omitted
		expect(() =>
			render(
				<AuroraRibbonSet
					ribbons={ribbons}
					isInView={true}
					reducedMotion={false}
					blendMode="screen"
					intensity="medium"
				/>,
			),
		).not.toThrow();
	});
});

// ─── Mouse parallax ─────────────────────────────────────────────────

describe("AuroraBackground mouse parallax", () => {
	it("registers mousemove and mouseleave listeners on desktop", () => {
		const addSpy = vi.spyOn(HTMLElement.prototype, "addEventListener");
		render(<AuroraBackground count={2} />);

		const events = addSpy.mock.calls.map((c) => c[0]);
		expect(events).toContain("mousemove");
		expect(events).toContain("mouseleave");
		addSpy.mockRestore();
	});

	it("does not set up ResizeObserver (mouse effect) on touch devices", () => {
		resizeObserverInstances.length = 0;
		vi.mocked(useIsTouchDevice as ReturnType<typeof vi.fn>).mockReturnValue(true);
		render(<AuroraBackground count={2} />);

		// The mouse parallax effect creates a ResizeObserver; on touch it should be skipped
		expect(resizeObserverInstances).toHaveLength(0);

		vi.mocked(useIsTouchDevice as ReturnType<typeof vi.fn>).mockReturnValue(false);
	});
});

// ─── Interactive attraction ─────────────────────────────────────────

describe("AuroraBackground interactive", () => {
	it("renders with interactive prop on desktop without crashing", () => {
		vi.mocked(useIsTouchDevice as ReturnType<typeof vi.fn>).mockReturnValue(false);
		expect(() => render(<AuroraBackground count={3} interactive />)).not.toThrow();
	});

	it("disables interactive on touch devices even when prop is true", () => {
		vi.mocked(useIsTouchDevice as ReturnType<typeof vi.fn>).mockReturnValue(true);
		// interactive is disabled for touch — should still render without errors
		expect(() => render(<AuroraBackground count={3} interactive />)).not.toThrow();
		vi.mocked(useIsTouchDevice as ReturnType<typeof vi.fn>).mockReturnValue(false);
	});
});
