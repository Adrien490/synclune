import { describe, expect, it } from "vitest";
import { SHAPE_CONFIGS } from "./constants";
import type { Particle, ParticleShape } from "./types";
import { seededRandom } from "@/shared/utils/seeded-random";
import {
	generateParticles,
	getShapeStyles,
	getSvgConfig,
	getTransition,
	isSvgShape,
} from "./utils";

// ─── seededRandom ───────────────────────────────────────────────────

describe("seededRandom", () => {
	it("returns deterministic results for the same seed", () => {
		expect(seededRandom(42)).toBe(seededRandom(42));
		expect(seededRandom(0)).toBe(seededRandom(0));
		expect(seededRandom(9999)).toBe(seededRandom(9999));
	});

	it("returns different results for different seeds", () => {
		const values = new Set([
			seededRandom(1),
			seededRandom(2),
			seededRandom(3),
			seededRandom(100),
		]);
		expect(values.size).toBe(4);
	});

	it("returns values in [0, 1) range", () => {
		for (let i = 0; i < 1000; i++) {
			const v = seededRandom(i);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});
});

// ─── generateParticles ─────────────────────────────────────────────

describe("generateParticles", () => {
	const defaults = {
		count: 4,
		size: [10, 50] as [number, number],
		opacity: [0.1, 0.4] as [number, number],
		colors: ["red", "blue"],
		blur: [5, 20] as [number, number],
		depthParallax: true,
		shapes: ["circle"] as ParticleShape[],
		baseDuration: 20,
	};

	function generate(overrides: Partial<typeof defaults> = {}): Particle[] {
		const d = { ...defaults, ...overrides };
		return generateParticles(
			d.count,
			d.size,
			d.opacity,
			d.colors,
			d.blur,
			d.depthParallax,
			d.shapes,
			d.baseDuration,
		);
	}

	it("generates the correct number of particles", () => {
		expect(generate({ count: 0 })).toHaveLength(0);
		expect(generate({ count: 1 })).toHaveLength(1);
		expect(generate({ count: 10 })).toHaveLength(10);
	});

	it("generates particles with sizes within the specified range", () => {
		const particles = generate({ count: 20, size: [10, 50] });
		for (const p of particles) {
			expect(p.size).toBeGreaterThanOrEqual(10);
			expect(p.size).toBeLessThanOrEqual(50);
		}
	});

	it("generates particles with opacity within the specified range", () => {
		const particles = generate({ count: 20, opacity: [0.1, 0.4] });
		for (const p of particles) {
			expect(p.opacity).toBeGreaterThanOrEqual(0.1);
			expect(p.opacity).toBeLessThanOrEqual(0.4);
		}
	});

	it("assigns colors from the provided array", () => {
		const particles = generate({ count: 20, colors: ["red", "blue", "green"] });
		for (const p of particles) {
			expect(["red", "blue", "green"]).toContain(p.color);
		}
	});

	it("falls back to 'currentColor' when colors array is empty", () => {
		const particles = generate({ count: 5, colors: [] });
		for (const p of particles) {
			expect(p.color).toBe("currentColor");
		}
	});

	it("cycles shapes across particles", () => {
		const particles = generate({
			count: 6,
			shapes: ["circle", "diamond", "heart"],
		});
		expect(particles[0].shape).toBe("circle");
		expect(particles[1].shape).toBe("diamond");
		expect(particles[2].shape).toBe("heart");
		expect(particles[3].shape).toBe("circle");
	});

	it("positions particles within 5-95% range", () => {
		const particles = generate({ count: 50 });
		for (const p of particles) {
			expect(p.x).toBeGreaterThanOrEqual(5);
			expect(p.x).toBeLessThanOrEqual(95);
			expect(p.y).toBeGreaterThanOrEqual(5);
			expect(p.y).toBeLessThanOrEqual(95);
		}
	});

	it("returns cached results for identical parameters", () => {
		const a = generate();
		const b = generate();
		expect(a).toBe(b); // same reference
	});

	it("returns different results for different parameters", () => {
		const a = generate({ count: 3 });
		const b = generate({ count: 4 });
		expect(a).not.toBe(b);
		expect(a.length).not.toBe(b.length);
	});

	it("produces deterministic output (same params = same particles)", () => {
		// Use unique params to avoid cache hits from other tests
		const params = {
			count: 7,
			size: [3, 33] as [number, number],
			opacity: [0.2, 0.5] as [number, number],
			colors: ["#abc"],
			blur: [1, 10] as [number, number],
			depthParallax: false,
			shapes: ["diamond"] as ParticleShape[],
			baseDuration: 15,
		};
		const a = generateParticles(
			params.count,
			params.size,
			params.opacity,
			params.colors,
			params.blur,
			params.depthParallax,
			params.shapes,
			params.baseDuration,
		);
		// Verify a few values are deterministic
		expect(a[0].x).toMatchInlineSnapshot(`23.007253880500684`);
		expect(a[0].y).toMatchInlineSnapshot(`92.75422286465073`);
		expect(a[2].size).toMatchInlineSnapshot(`31.782037667574514`);
	});

	it("handles scalar blur (no array)", () => {
		const particles = generate({ blur: 10 as unknown as [number, number] });
		for (const p of particles) {
			expect(p.blur).toBe(10);
		}
	});

	it("handles size range where min equals max", () => {
		const particles = generate({ count: 5, size: [20, 20] });
		for (const p of particles) {
			expect(p.size).toBe(20);
		}
	});

	it("evicts oldest entry when cache exceeds MAX_CACHE_SIZE (50)", () => {
		// Generate 51 unique configs to trigger cache eviction
		const firstResult = generateParticles(1, [1, 1], [0.1, 0.1], ["red"], 0, false, ["circle"], 10);
		for (let i = 1; i <= 50; i++) {
			generateParticles(1, [1, 1], [0.1, 0.1], ["red"], 0, false, ["circle"], 10 + i);
		}
		// The first entry should have been evicted — re-generating returns a new reference
		const reGenerated = generateParticles(1, [1, 1], [0.1, 0.1], ["red"], 0, false, ["circle"], 10);
		expect(reGenerated).not.toBe(firstResult);
		// But the values should still be identical (deterministic)
		expect(reGenerated).toEqual(firstResult);
	});

	it("uses uniform duration multiplier when depthParallax is false", () => {
		const particles = generate({
			count: 10,
			depthParallax: false,
			blur: [5, 30],
			size: [10, 60],
		});
		// With depthParallax=false, parallaxMultiplier is always 1.
		// Particles with same seed offset for rand(5) and same baseDuration
		// will only vary by the random component, not by depth.
		// Verify no particle's depthFactor affects its duration:
		// duration = baseDuration * 0.7 * 1 + rand(5) * baseDuration * 0.6 * 1
		for (const p of particles) {
			const rand5 = seededRandom(p.id * 1000 + 5);
			const expected = defaults.baseDuration * 0.7 + rand5 * defaults.baseDuration * 0.6;
			expect(p.duration).toBeCloseTo(expected, 10);
		}
	});
});

// ─── getShapeStyles ─────────────────────────────────────────────────

describe("getShapeStyles", () => {
	it("returns borderRadius for circle shape", () => {
		const styles = getShapeStyles("circle", 32, "red");
		expect(styles).toHaveProperty("backgroundColor", "red");
		expect(styles).toHaveProperty("borderRadius", "50%");
	});

	it("returns special gradient background for pearl shape", () => {
		const styles = getShapeStyles("pearl", 32, "pink");
		expect(styles).toHaveProperty("background");
		expect(styles).not.toHaveProperty("backgroundColor");
		expect((styles as { background: string }).background).toContain("radial-gradient");
		expect((styles as { background: string }).background).toContain("pink");
	});

	it("returns clipPath for heart shape", () => {
		const styles = getShapeStyles("heart", 32, "red");
		expect(styles).toHaveProperty("backgroundColor", "red");
		expect(styles).toHaveProperty("clipPath");
	});

	it("returns clipPath for drop shape", () => {
		const styles = getShapeStyles("drop", 32, "blue");
		expect(styles).toHaveProperty("clipPath");
	});

	it("returns clipPath for sparkle-4 shape", () => {
		const styles = getShapeStyles("sparkle-4", 32, "gold");
		expect(styles).toHaveProperty("clipPath");
	});

	it("returns transparent background for SVG shapes", () => {
		const styles = getShapeStyles("crescent", 32, "white");
		expect(styles).toHaveProperty("backgroundColor", "transparent");
	});

	it("returns rotate style for diamond shape", () => {
		const styles = getShapeStyles("diamond", 32, "blue");
		expect(styles).toHaveProperty("backgroundColor", "blue");
		expect(styles).toHaveProperty("rotate", "45deg");
	});
});

// ─── isSvgShape / getSvgConfig ──────────────────────────────────────

describe("isSvgShape", () => {
	it("returns true for SVG shapes", () => {
		const svgShapes = (Object.keys(SHAPE_CONFIGS) as ParticleShape[]).filter(
			(s) => SHAPE_CONFIGS[s].type === "svg",
		);
		for (const shape of svgShapes) {
			expect(isSvgShape(shape)).toBe(true);
		}
	});

	it("returns false for non-SVG shapes", () => {
		expect(isSvgShape("circle")).toBe(false);
		expect(isSvgShape("diamond")).toBe(false);
		expect(isSvgShape("heart")).toBe(false);
		expect(isSvgShape("pearl")).toBe(false);
	});
});

describe("getSvgConfig", () => {
	it("returns viewBox and path for SVG shapes", () => {
		const config = getSvgConfig("crescent");
		expect(config).not.toBeNull();
		expect(config).toHaveProperty("viewBox");
		expect(config).toHaveProperty("path");
		expect(config!.fillRule).toBe("evenodd");
	});

	it("returns null for non-SVG shapes", () => {
		expect(getSvgConfig("circle")).toBeNull();
		expect(getSvgConfig("diamond")).toBeNull();
		expect(getSvgConfig("heart")).toBeNull();
	});
});

// ─── getTransition ──────────────────────────────────────────────────

describe("getTransition", () => {
	const makeParticle = (overrides: Partial<Particle> = {}): Particle => ({
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
	});

	it("uses particle duration and delay", () => {
		const t = getTransition(makeParticle({ duration: 12, delay: 3 }));
		expect(t.duration).toBe(12);
		expect(t.delay).toBe(3);
	});

	it("repeats infinitely with reverse", () => {
		const t = getTransition(makeParticle());
		expect(t.repeat).toBe(Infinity);
		expect(t.repeatType).toBe("reverse");
	});

	it("cycles easings based on particle id", () => {
		const t0 = getTransition(makeParticle({ id: 0 }));
		const t1 = getTransition(makeParticle({ id: 1 }));
		const t4 = getTransition(makeParticle({ id: 4 }));
		// id 0 and id 4 should have the same easing (4 easings total)
		expect(t0.ease).toEqual(t4.ease);
		// id 0 and id 1 should have different easings
		expect(t0.ease).not.toEqual(t1.ease);
	});

	it("sets repeatDelay as fraction of delay", () => {
		const t = getTransition(makeParticle({ delay: 5 }));
		expect(t.repeatDelay).toBe(1); // 5 * 0.2
	});
});
