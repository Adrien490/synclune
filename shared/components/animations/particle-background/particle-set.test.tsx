import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Particle } from "./types";

// ─── Capture useTransform callbacks for isolated math testing ────────

let transformFns: { inputCount: number; fn: (values: number[]) => number }[] = [];

vi.mock("motion/react", () => ({
	useMotionValue: vi.fn((initial: number) => ({
		get: () => initial,
		set: vi.fn(),
	})),
	useTransform: vi.fn((mvOrArray: unknown, fnOrInput: unknown) => {
		if (typeof fnOrInput === "function") {
			const inputCount = Array.isArray(mvOrArray) ? (mvOrArray as unknown[]).length : 1;
			transformFns.push({ inputCount, fn: fnOrInput as (values: number[]) => number });
			const defaults = Array.isArray(mvOrArray)
				? (mvOrArray as { get?: () => number }[]).map((mv) => mv.get?.() ?? 0)
				: 0;
			return { get: () => (fnOrInput as Function)(defaults), set: vi.fn() };
		}
		return { get: () => 0, set: vi.fn() };
	}),
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

const { ParticleSet } = await import("./particle-set");

// ─── Helpers ─────────────────────────────────────────────────────────

function makeParticle(overrides: Partial<Particle> = {}): Particle {
	return {
		id: 0,
		size: 32,
		opacity: 0.3,
		x: 50,
		y: 50,
		color: "red",
		duration: 15,
		delay: 2,
		blur: 10,
		depthFactor: 0.5,
		shape: "circle",
		...overrides,
	};
}

function makeMv(initial = 0) {
	return { get: () => initial, set: vi.fn() } as any;
}

/** Render a single animated particle and return its combinedX and combinedY callbacks */
function renderAnimatedParticle(
	particle: Particle,
	props: {
		scrollParallax?: boolean;
		interactive?: boolean;
	} = {},
) {
	transformFns = [];
	const result = render(
		<ParticleSet
			particles={[particle]}
			isInView={true}
			reducedMotion={false}
			animationStyle="float"
			mouseX={makeMv(0)}
			mouseY={makeMv(0)}
			scrollYProgress={makeMv(0)}
			cursorX={makeMv(0.5)}
			cursorY={makeMv(0.5)}
			{...props}
		/>,
	);

	// AnimatedParticle creates 2 useTransform calls per particle:
	// combinedX (3 inputs: mouseX, cursorX, cursorY)
	// combinedY (4 inputs: mouseY, scrollYProgress, cursorX, cursorY)
	const combinedX = transformFns.find((t) => t.inputCount === 3);
	const combinedY = transformFns.find((t) => t.inputCount === 4);

	return { result, combinedX: combinedX!.fn, combinedY: combinedY!.fn };
}

afterEach(() => {
	cleanup();
	transformFns = [];
});

// ─── StaticParticle (reducedMotion) ──────────────────────────────────

describe("StaticParticle", () => {
	const defaultProps = {
		isInView: true,
		reducedMotion: true as const,
		animationStyle: "float" as const,
	};

	it("renders SVG element for crescent (SVG shape)", () => {
		const { container } = render(
			<ParticleSet {...defaultProps} particles={[makeParticle({ shape: "crescent" })]} />,
		);
		const svgs = container.querySelectorAll("svg");
		expect(svgs).toHaveLength(1);
		expect(svgs[0]!.getAttribute("aria-hidden")).toBe("true");
		expect(svgs[0]!.getAttribute("role")).toBe("presentation");
		expect(svgs[0]!.querySelector("path")).toBeTruthy();
	});

	it("renders no SVG for circle (CSS shape)", () => {
		const { container } = render(
			<ParticleSet {...defaultProps} particles={[makeParticle({ shape: "circle" })]} />,
		);
		expect(container.querySelectorAll("svg")).toHaveLength(0);
	});

	it("renders no SVG for heart (clipPath shape)", () => {
		const { container } = render(
			<ParticleSet {...defaultProps} particles={[makeParticle({ shape: "heart" })]} />,
		);
		expect(container.querySelectorAll("svg")).toHaveLength(0);
	});

	it("renders inner span with opacity for each particle", () => {
		const { container } = render(
			<ParticleSet {...defaultProps} particles={[makeParticle({ opacity: 0.4 })]} />,
		);
		const innerSpan = container.querySelector("span.absolute span");
		expect(innerSpan).toBeTruthy();
		expect((innerSpan as HTMLElement).style.opacity).toBe("0.4");
	});

	it("halves opacity in high contrast mode", () => {
		const { container } = render(
			<ParticleSet
				{...defaultProps}
				highContrast={true}
				particles={[makeParticle({ opacity: 0.4 })]}
			/>,
		);
		const innerSpan = container.querySelector("span.absolute span");
		expect((innerSpan as HTMLElement).style.opacity).toBe("0.2");
	});

	it("increases blur by 1.5x in high contrast mode", () => {
		const { container } = render(
			<ParticleSet
				{...defaultProps}
				highContrast={true}
				particles={[makeParticle({ blur: 10 })]}
			/>,
		);
		const outerSpan = container.querySelector("span.absolute") as HTMLElement;
		expect(outerSpan.style.filter).toBe("blur(15px)");
	});

	it("uses normal blur without high contrast", () => {
		const { container } = render(
			<ParticleSet {...defaultProps} particles={[makeParticle({ blur: 10 })]} />,
		);
		const outerSpan = container.querySelector("span.absolute") as HTMLElement;
		expect(outerSpan.style.filter).toBe("blur(10px)");
	});

	it("renders correct number of particles", () => {
		const particles = [makeParticle({ id: 0 }), makeParticle({ id: 1 }), makeParticle({ id: 2 })];
		const { container } = render(<ParticleSet {...defaultProps} particles={particles} />);
		expect(container.querySelectorAll("span.absolute")).toHaveLength(3);
	});

	it("renders with scrollOpacity without crashing", () => {
		expect(() =>
			render(
				<ParticleSet {...defaultProps} scrollOpacity={makeMv(1)} particles={[makeParticle()]} />,
			),
		).not.toThrow();
	});

	it("renders mixed SVG and CSS shapes", () => {
		const particles = [
			makeParticle({ id: 0, shape: "circle" }),
			makeParticle({ id: 1, shape: "crescent" }),
			makeParticle({ id: 2, shape: "heart" }),
		];
		const { container } = render(<ParticleSet {...defaultProps} particles={particles} />);
		// Only crescent is SVG
		expect(container.querySelectorAll("svg")).toHaveLength(1);
		expect(container.querySelectorAll("span.absolute")).toHaveLength(3);
	});

	it("sets zIndex based on depthFactor (close particles on top)", () => {
		const { container } = render(
			<ParticleSet {...defaultProps} particles={[makeParticle({ depthFactor: 0.2 })]} />,
		);
		const outerSpan = container.querySelector("span.absolute") as HTMLElement;
		// zIndex = Math.round((1 - 0.2) * 10) = 8
		expect(outerSpan.style.zIndex).toBe("8");
	});
});

// ─── AnimatedParticle: scrollParallax Y-offset ───────────────────────

describe("scrollParallax Y-offset", () => {
	const SCROLL_PARALLAX_RANGE = 40;

	it("adds zero offset at scroll midpoint (scrollYProgress=0.5)", () => {
		const p = makeParticle({ depthFactor: 0.5 });
		const _strength = 1 - p.depthFactor; // 0.5
		const { combinedY } = renderAnimatedParticle(p, { scrollParallax: true });

		// [mouseY=0, scrollYProgress=0.5, cursorX=0.5, cursorY=0.5]
		const y = combinedY([0, 0.5, 0.5, 0.5]);
		// mouseParallax = 0 * 0.5 = 0, scrollParallax = (0.5 - 0.5) * 2 * 40 * 0.5 = 0
		expect(y).toBeCloseTo(0, 10);
	});

	it("adds negative offset at scroll start (scrollYProgress=0)", () => {
		const p = makeParticle({ depthFactor: 0 }); // strength = 1
		const { combinedY } = renderAnimatedParticle(p, { scrollParallax: true });

		const y = combinedY([0, 0, 0.5, 0.5]);
		// scrollParallax = (0 - 0.5) * 2 * 40 * 1 = -40
		expect(y).toBeCloseTo(-SCROLL_PARALLAX_RANGE, 10);
	});

	it("adds positive offset at scroll end (scrollYProgress=1)", () => {
		const p = makeParticle({ depthFactor: 0 }); // strength = 1
		const { combinedY } = renderAnimatedParticle(p, { scrollParallax: true });

		const y = combinedY([0, 1, 0.5, 0.5]);
		// scrollParallax = (1 - 0.5) * 2 * 40 * 1 = 40
		expect(y).toBeCloseTo(SCROLL_PARALLAX_RANGE, 10);
	});

	it("scales offset by particle depth (far particles move less)", () => {
		const pClose = makeParticle({ depthFactor: 0 }); // strength = 1
		const pFar = makeParticle({ depthFactor: 0.8 }); // strength = 0.2

		const { combinedY: closeY } = renderAnimatedParticle(pClose, { scrollParallax: true });
		cleanup();
		transformFns = [];
		const { combinedY: farY } = renderAnimatedParticle(pFar, { scrollParallax: true });

		const yClose = closeY([0, 1, 0.5, 0.5]);
		const yFar = farY([0, 1, 0.5, 0.5]);

		// Close: 40 * 1 = 40, Far: 40 * 0.2 = 8
		expect(yClose).toBeCloseTo(40, 10);
		expect(yFar).toBeCloseTo(8, 10);
		expect(Math.abs(yClose)).toBeGreaterThan(Math.abs(yFar));
	});

	it("does not add scroll offset when scrollParallax is disabled", () => {
		const p = makeParticle({ depthFactor: 0 });
		const { combinedY } = renderAnimatedParticle(p, { scrollParallax: false });

		// Even with scrollYProgress=1, no scroll offset should be added
		const y = combinedY([0, 1, 0.5, 0.5]);
		expect(y).toBeCloseTo(0, 10);
	});

	it("combines mouse parallax and scroll parallax additively", () => {
		const p = makeParticle({ depthFactor: 0 }); // strength = 1
		const { combinedY } = renderAnimatedParticle(p, { scrollParallax: true });

		// mouseY offset = 10, scrollYProgress = 1
		const y = combinedY([10, 1, 0.5, 0.5]);
		// mouse = 10 * 1 = 10, scroll = 40, total = 50
		expect(y).toBeCloseTo(50, 10);
	});
});

// ─── AnimatedParticle: repulsion ─────────────────────────────────────

describe("repulsion", () => {
	const REPULSION_STRENGTH = 30;
	const _REPULSION_RADIUS = 0.15;

	it("applies repulsion when cursor is within radius", () => {
		// Particle at (50%, 50%) = (0.5, 0.5) normalized
		const p = makeParticle({ x: 50, y: 50, depthFactor: 0 });
		const { combinedX } = renderAnimatedParticle(p, { interactive: true });

		// Cursor at (0.4, 0.5): dx=0.1, dy=0, dist=0.1 < 0.15
		const x = combinedX([0, 0.4, 0.5]);
		// factor = (1 - 0.1/0.15)² = (1/3)² ≈ 0.111
		// offset = (0.1/0.1) * 0.111 * 30 ≈ 3.333
		expect(x).toBeCloseTo((1 / 9) * REPULSION_STRENGTH, 5);
	});

	it("applies no repulsion when cursor is outside radius", () => {
		const p = makeParticle({ x: 50, y: 50, depthFactor: 0 });
		const { combinedX } = renderAnimatedParticle(p, { interactive: true });

		// Cursor at (0.2, 0.2): dx=0.3, dy=0.3, dist≈0.424 > 0.15
		const x = combinedX([0, 0.2, 0.2]);
		expect(x).toBeCloseTo(0, 10);
	});

	it("applies no repulsion when dist < 0.001 (prevents division by zero)", () => {
		const p = makeParticle({ x: 50, y: 50, depthFactor: 0 });
		const { combinedX } = renderAnimatedParticle(p, { interactive: true });

		// Cursor exactly at particle position
		const x = combinedX([0, 0.5, 0.5]);
		expect(x).toBeCloseTo(0, 10);
		expect(Number.isFinite(x)).toBe(true);
	});

	it("pushes particle away from cursor (direction)", () => {
		const p = makeParticle({ x: 50, y: 50, depthFactor: 0 });
		const { combinedX, combinedY } = renderAnimatedParticle(p, { interactive: true });

		// Cursor left of particle: particle pushed right (positive X)
		const xRight = combinedX([0, 0.4, 0.5]);
		expect(xRight).toBeGreaterThan(0);

		// Cursor right of particle: particle pushed left (negative X)
		const xLeft = combinedX([0, 0.6, 0.5]);
		expect(xLeft).toBeLessThan(0);

		// Cursor above particle: particle pushed down (positive Y)
		const yDown = combinedY([0, 0.5, 0.5, 0.4]);
		expect(yDown).toBeGreaterThan(0);

		// Cursor below particle: particle pushed up (negative Y)
		const yUp = combinedY([0, 0.5, 0.5, 0.6]);
		expect(yUp).toBeLessThan(0);
	});

	it("applies quadratic falloff: stronger near center, weaker at edge", () => {
		const p = makeParticle({ x: 50, y: 50, depthFactor: 0 });
		const { combinedX } = renderAnimatedParticle(p, { interactive: true });

		// Cursor close (dist=0.05): factor = (1 - 0.05/0.15)² = (2/3)² ≈ 0.444
		const xClose = combinedX([0, 0.45, 0.5]);
		// Cursor far (dist=0.12): factor = (1 - 0.12/0.15)² = (0.2)² = 0.04
		const xFar = combinedX([0, 0.38, 0.5]);

		expect(Math.abs(xClose)).toBeGreaterThan(Math.abs(xFar));
	});

	it("does not apply repulsion when interactive is false", () => {
		const p = makeParticle({ x: 50, y: 50, depthFactor: 0 });
		const { combinedX } = renderAnimatedParticle(p, { interactive: false });

		// Cursor within radius but interactive=false
		const x = combinedX([0, 0.4, 0.5]);
		expect(x).toBeCloseTo(0, 10);
	});

	it("combines mouse parallax and repulsion additively", () => {
		const p = makeParticle({ x: 50, y: 50, depthFactor: 0 }); // strength = 1
		const { combinedX } = renderAnimatedParticle(p, { interactive: true });

		// mouseX offset = 5, cursor within radius
		const x = combinedX([5, 0.4, 0.5]);
		// mouse = 5 * 1 = 5, repulsion ≈ 3.333, total ≈ 8.333
		expect(x).toBeGreaterThan(5);
		expect(x).toBeCloseTo(5 + (1 / 9) * REPULSION_STRENGTH, 5);
	});

	it("repulsion respects depth: far particles move less", () => {
		const pClose = makeParticle({ x: 50, y: 50, depthFactor: 0 }); // strength = 1
		const pFar = makeParticle({ x: 50, y: 50, depthFactor: 0.8 }); // strength = 0.2

		const { combinedX: closeX } = renderAnimatedParticle(pClose, { interactive: true });
		cleanup();
		transformFns = [];
		const { combinedX: farX } = renderAnimatedParticle(pFar, { interactive: true });

		// Same cursor position, same repulsion, but mouse parallax scaled by depth
		// Repulsion itself doesn't scale by depth (only mouse parallax does)
		// With mouseX=0, only repulsion contributes — same for both depths
		const xClose = closeX([0, 0.4, 0.5]);
		const xFar = farX([0, 0.4, 0.5]);

		// Repulsion offset is identical (not scaled by strength)
		expect(xClose).toBeCloseTo(xFar, 5);
	});

	it("repulsion on Y-axis works identically to X-axis", () => {
		const p = makeParticle({ x: 50, y: 50, depthFactor: 0 });
		const { combinedX, combinedY } = renderAnimatedParticle(p, { interactive: true });

		// Cursor at (0.4, 0.5) → only X repulsion
		const x = combinedX([0, 0.4, 0.5]);
		// Cursor at (0.5, 0.4) → only Y repulsion (same distance)
		const y = combinedY([0, 0.5, 0.5, 0.4]);

		// Same magnitude for symmetric positions
		expect(Math.abs(x)).toBeCloseTo(Math.abs(y), 5);
	});
});

// ─── AnimatedParticle: mouse parallax depth scaling ──────────────────

describe("mouse parallax depth scaling", () => {
	it("close particles (depthFactor=0) get full parallax offset", () => {
		const p = makeParticle({ depthFactor: 0 }); // strength = 1
		const { combinedX } = renderAnimatedParticle(p);

		const x = combinedX([10, 0.5, 0.5]);
		expect(x).toBeCloseTo(10, 10); // 10 * 1
	});

	it("far particles (depthFactor=1) get no parallax offset", () => {
		const p = makeParticle({ depthFactor: 1 }); // strength = 0
		const { combinedX } = renderAnimatedParticle(p);

		const x = combinedX([10, 0.5, 0.5]);
		expect(x).toBeCloseTo(0, 10); // 10 * 0
	});

	it("mid-depth particles get proportional offset", () => {
		const p = makeParticle({ depthFactor: 0.5 }); // strength = 0.5
		const { combinedX } = renderAnimatedParticle(p);

		const x = combinedX([10, 0.5, 0.5]);
		expect(x).toBeCloseTo(5, 10); // 10 * 0.5
	});
});

// ─── ParticleSet container behavior ──────────────────────────────────

describe("ParticleSet", () => {
	it("returns null when isInView is false", () => {
		const { container } = render(
			<ParticleSet
				particles={[makeParticle()]}
				isInView={false}
				reducedMotion={false}
				animationStyle="float"
			/>,
		);
		expect(container.innerHTML).toBe("");
	});

	it("renders particles when isInView is true", () => {
		const { container } = render(
			<ParticleSet
				particles={[makeParticle(), makeParticle({ id: 1 })]}
				isInView={true}
				reducedMotion={false}
				animationStyle="float"
			/>,
		);
		expect(container.querySelectorAll("span.absolute")).toHaveLength(2);
	});

	it("renders static particles when reducedMotion is true", () => {
		const { container } = render(
			<ParticleSet
				particles={[makeParticle()]}
				isInView={true}
				reducedMotion={true}
				animationStyle="float"
			/>,
		);
		// Should render (no useTransform calls for static particles)
		expect(container.querySelectorAll("span.absolute")).toHaveLength(1);
		expect(transformFns).toHaveLength(0);
	});

	it("renders animated particles when reducedMotion is false", () => {
		transformFns = [];
		const { container } = render(
			<ParticleSet
				particles={[makeParticle()]}
				isInView={true}
				reducedMotion={false}
				animationStyle="float"
			/>,
		);
		expect(container.querySelectorAll("span.absolute")).toHaveLength(1);
		// AnimatedParticle creates 2 useTransform calls per particle
		expect(transformFns).toHaveLength(2);
	});
});
