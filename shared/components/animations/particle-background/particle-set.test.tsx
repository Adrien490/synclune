import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Particle } from "./types";

// m.<tag> is proxied to the plain tag so animate/transition props never hit the DOM engine
vi.mock("motion/react", () => ({
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

afterEach(() => {
	cleanup();
});

// ─── StaticParticle (reducedMotion) ──────────────────────────────────

describe("StaticParticle", () => {
	const defaultProps = {
		isInView: true,
		reducedMotion: true as const,
		animationStyle: "float" as const,
	};

	it("renders a plain span for circle (CSS shape)", () => {
		const { container } = render(
			<ParticleSet {...defaultProps} particles={[makeParticle({ shape: "circle" })]} />,
		);
		const innerSpan = container.querySelector("span.absolute span") as HTMLElement;
		expect(innerSpan).toBeTruthy();
		expect(innerSpan.style.borderRadius).toBe("50%");
	});

	it("renders a clipPath span for heart", () => {
		const { container } = render(
			<ParticleSet {...defaultProps} particles={[makeParticle({ shape: "heart" })]} />,
		);
		const innerSpan = container.querySelector("span.absolute span") as HTMLElement;
		expect(innerSpan.style.clipPath).toContain("polygon");
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

	it("sets zIndex based on depthFactor (close particles on top)", () => {
		const { container } = render(
			<ParticleSet {...defaultProps} particles={[makeParticle({ depthFactor: 0.2 })]} />,
		);
		const outerSpan = container.querySelector("span.absolute") as HTMLElement;
		// zIndex = Math.round((1 - 0.2) * 10) = 8
		expect(outerSpan.style.zIndex).toBe("8");
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
		expect(container.querySelectorAll("span.absolute")).toHaveLength(1);
	});

	it("positions particles via left/top percentages on the outer span", () => {
		const { container } = render(
			<ParticleSet
				particles={[makeParticle({ x: 25, y: 75 })]}
				isInView={true}
				reducedMotion={false}
				animationStyle="float"
			/>,
		);
		const outerSpan = container.querySelector("span.absolute") as HTMLElement;
		expect(outerSpan.style.left).toBe("25%");
		expect(outerSpan.style.top).toBe("75%");
	});
});
