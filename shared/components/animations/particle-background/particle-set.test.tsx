import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Particle } from "./types";

// ─── Capture useTransform callbacks for isolated math testing ────────

let transformFns: { inputCount: number; fn: (value: number) => number }[] = [];

vi.mock("motion/react", () => ({
	useMotionValue: vi.fn((initial: number) => ({
		get: () => initial,
		set: vi.fn(),
	})),
	useTransform: vi.fn((mvOrArray: unknown, fnOrInput: unknown) => {
		if (typeof fnOrInput === "function") {
			const inputCount = Array.isArray(mvOrArray) ? (mvOrArray as unknown[]).length : 1;
			transformFns.push({ inputCount, fn: fnOrInput as (value: number) => number });
			const def = Array.isArray(mvOrArray)
				? (mvOrArray as { get?: () => number }[]).map((mv) => mv.get?.() ?? 0)
				: 0;
			return { get: () => (fnOrInput as (v: unknown) => number)(def), set: vi.fn() };
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

/** Render a single animated particle and return its scroll-parallax transform callback */
function renderAnimatedParticle(particle: Particle, props: { scrollParallax?: boolean } = {}) {
	transformFns = [];
	const result = render(
		<ParticleSet
			particles={[particle]}
			isInView={true}
			reducedMotion={false}
			animationStyle="float"
			scrollYProgress={makeMv(0)}
			{...props}
		/>,
	);

	// AnimatedParticle creates exactly one useTransform per particle: the scroll parallax offset.
	const scrollY = transformFns.find((t) => t.inputCount === 1);
	return { result, scrollY: scrollY!.fn };
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

// ─── AnimatedParticle: scrollParallax Y-offset (scroll-driven, not pointer) ───

describe("scrollParallax Y-offset", () => {
	const SCROLL_PARALLAX_RANGE = 40;

	it("adds zero offset at scroll midpoint (scrollYProgress=0.5)", () => {
		const p = makeParticle({ depthFactor: 0.5 }); // strength = 0.5
		const { scrollY } = renderAnimatedParticle(p, { scrollParallax: true });
		// (0.5 - 0.5) * 2 * 40 * 0.5 = 0
		expect(scrollY(0.5)).toBeCloseTo(0, 10);
	});

	it("adds negative offset at scroll start (scrollYProgress=0)", () => {
		const p = makeParticle({ depthFactor: 0 }); // strength = 1
		const { scrollY } = renderAnimatedParticle(p, { scrollParallax: true });
		// (0 - 0.5) * 2 * 40 * 1 = -40
		expect(scrollY(0)).toBeCloseTo(-SCROLL_PARALLAX_RANGE, 10);
	});

	it("adds positive offset at scroll end (scrollYProgress=1)", () => {
		const p = makeParticle({ depthFactor: 0 }); // strength = 1
		const { scrollY } = renderAnimatedParticle(p, { scrollParallax: true });
		// (1 - 0.5) * 2 * 40 * 1 = 40
		expect(scrollY(1)).toBeCloseTo(SCROLL_PARALLAX_RANGE, 10);
	});

	it("scales offset by particle depth (far particles move less)", () => {
		const pClose = makeParticle({ depthFactor: 0 }); // strength = 1
		const pFar = makeParticle({ depthFactor: 0.8 }); // strength = 0.2

		const { scrollY: closeY } = renderAnimatedParticle(pClose, { scrollParallax: true });
		cleanup();
		transformFns = [];
		const { scrollY: farY } = renderAnimatedParticle(pFar, { scrollParallax: true });

		// Close: 40 * 1 = 40, Far: 40 * 0.2 = 8
		expect(closeY(1)).toBeCloseTo(40, 10);
		expect(farY(1)).toBeCloseTo(8, 10);
		expect(Math.abs(closeY(1))).toBeGreaterThan(Math.abs(farY(1)));
	});

	it("does not add scroll offset when scrollParallax is disabled", () => {
		const p = makeParticle({ depthFactor: 0 });
		const { scrollY } = renderAnimatedParticle(p, { scrollParallax: false });
		// Even with scrollYProgress=1, no scroll offset should be added
		expect(scrollY(1)).toBeCloseTo(0, 10);
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
		// AnimatedParticle creates exactly one useTransform per particle (scroll parallax offset)
		expect(transformFns).toHaveLength(1);
	});
});
