import { describe, expect, it } from "vitest";
import { ANIMATION_PRESETS, SHAPE_CONFIGS } from "./constants";
import type { Particle, ParticleShape } from "./types";
import { seededRandom } from "@/shared/utils/seeded-random";
import {
	generateParticles,
	getShapeStyles,
	getSvgConfig,
	getTransition,
	isSvgShape,
} from "./utils";

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

// ─── ANIMATION_PRESETS ───────────────────────────────────────────────

describe("ANIMATION_PRESETS", () => {
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

	it("sparkle preset produces twinkle in/out scale pattern", () => {
		const result = ANIMATION_PRESETS.sparkle(makeParticle());
		expect(result.scale).toEqual([0.3, 0.3, 1.2, 1.2, 0.3]);
	});

	it("sparkle preset fades from 0 to boosted opacity and back", () => {
		const p = makeParticle({ opacity: 0.3 });
		const result = ANIMATION_PRESETS.sparkle(p);
		const peak = Math.min(0.3 * 1.5, 1);
		expect(result.opacity).toEqual([0, 0, peak, peak, 0]);
	});

	it("sparkle preset clamps opacity to 1", () => {
		const p = makeParticle({ opacity: 0.8 });
		const result = ANIMATION_PRESETS.sparkle(p);
		// 0.8 * 1.5 = 1.2, should be clamped to 1
		expect(result.opacity).toEqual([0, 0, 1, 1, 0]);
	});

	it("sparkle preset adds rotation for non-round shapes", () => {
		const p = makeParticle({ shape: "diamond" });
		const result = ANIMATION_PRESETS.sparkle(p);
		expect(result.rotate).toBeDefined();
	});

	it("sparkle preset omits rotation for round shapes", () => {
		const p = makeParticle({ shape: "circle" });
		const result = ANIMATION_PRESETS.sparkle(p);
		expect(result.rotate).toBeUndefined();
	});

	// ─── float ──────────────────────────────────────────────────────

	it("float preset animates scale, opacity, x, and y", () => {
		const p = makeParticle({ opacity: 0.3 });
		const result = ANIMATION_PRESETS.float(p);
		expect(result.scale).toEqual([1, 1.4, 0.8, 1]);
		expect(result.x).toEqual(["0%", "8%", "-8%", "0%"]);
		expect(result.y).toEqual(["0%", "-6%", "6%", "0%"]);
		expect(result.opacity).toEqual([0.3, Math.min(0.3 * 1.2, 1), 0.3 * 0.8, 0.3]);
	});

	it("float preset clamps boosted opacity to 1", () => {
		const p = makeParticle({ opacity: 0.9 });
		const result = ANIMATION_PRESETS.float(p);
		expect((result.opacity as number[])[1]).toBe(1);
	});

	it("float preset adds rotation for non-round shapes", () => {
		const result = ANIMATION_PRESETS.float(makeParticle({ shape: "heart" }));
		expect(result.rotate).toBeDefined();
	});

	it("float preset omits rotation for round shapes", () => {
		const result = ANIMATION_PRESETS.float(makeParticle({ shape: "pearl" }));
		expect(result.rotate).toBeUndefined();
	});

	// ─── drift ─────────────────────────────────────────────────────

	it("drift preset animates x and y with wider lateral range", () => {
		const p = makeParticle({ opacity: 0.4 });
		const result = ANIMATION_PRESETS.drift(p);
		expect(result.x).toEqual(["0%", "15%", "-5%", "0%"]);
		expect(result.y).toEqual(["0%", "-10%", "5%", "0%"]);
		expect(result.opacity).toEqual([0.4, 0.4 * 0.9, 0.4]);
	});

	it("drift preset adds rotation for non-round shapes", () => {
		const result = ANIMATION_PRESETS.drift(makeParticle({ shape: "sparkle-4" }));
		expect(result.rotate).toBeDefined();
	});

	// ─── rise ──────────────────────────────────────────────────────

	it("rise preset has 5-keyframe vertical movement", () => {
		const p = makeParticle({ opacity: 0.3 });
		const result = ANIMATION_PRESETS.rise(p);
		expect(result.y).toEqual(["0%", "-25%", "-50%", "-25%", "0%"]);
		expect(result.x).toEqual(["0%", "5%", "-3%", "-5%", "0%"]);
		expect((result.opacity as number[])).toHaveLength(5);
	});

	it("rise preset fades at mid-point and clamps peak opacity", () => {
		const p = makeParticle({ opacity: 0.9 });
		const result = ANIMATION_PRESETS.rise(p);
		// Mid-point opacity is reduced
		expect((result.opacity as number[])[2]).toBe(0.9 * 0.6);
		// Peak opacity: min(0.9 * 1.1, 1) = 0.99
		expect((result.opacity as number[])[1]).toBe(Math.min(0.9 * 1.1, 1));

		// With opacity high enough to trigger clamping
		const pHigh = makeParticle({ opacity: 1 });
		const resultHigh = ANIMATION_PRESETS.rise(pHigh);
		expect((resultHigh.opacity as number[])[1]).toBe(1);
	});

	// ─── orbit ─────────────────────────────────────────────────────

	it("orbit preset creates a looping elliptical path", () => {
		const p = makeParticle({ opacity: 0.3 });
		const result = ANIMATION_PRESETS.orbit(p);
		expect(result.x).toEqual(["0%", "20%", "0%", "-20%", "0%"]);
		expect(result.y).toEqual(["0%", "-12%", "0%", "12%", "0%"]);
		// Opacity dips at 90° and 270°
		expect((result.opacity as number[])[1]).toBe(0.3 * 0.85);
		expect((result.opacity as number[])[3]).toBe(0.3 * 0.85);
		// Opacity returns at 0° and 180°
		expect((result.opacity as number[])[0]).toBe(0.3);
		expect((result.opacity as number[])[2]).toBe(0.3);
	});

	// ─── breathe ───────────────────────────────────────────────────

	it("breathe preset animates scale and opacity without movement", () => {
		const p = makeParticle({ opacity: 0.3 });
		const result = ANIMATION_PRESETS.breathe(p);
		expect(result.scale).toEqual([1, 1.3, 1, 0.85, 1]);
		expect(result.opacity).toEqual([
			0.3,
			Math.min(0.3 * 1.3, 1),
			0.3,
			0.3 * 0.7,
			0.3,
		]);
		// No x/y movement
		expect(result.x).toBeUndefined();
		expect(result.y).toBeUndefined();
	});

	it("breathe preset clamps boosted opacity to 1", () => {
		const p = makeParticle({ opacity: 0.9 });
		const result = ANIMATION_PRESETS.breathe(p);
		expect((result.opacity as number[])[1]).toBe(1);
	});

	it("breathe preset does not add rotation (pure scale animation)", () => {
		const result = ANIMATION_PRESETS.breathe(makeParticle({ shape: "diamond" }));
		expect(result.rotate).toBeUndefined();
	});

	it("all presets return valid TargetAndTransition objects", () => {
		const p = makeParticle();
		for (const [name, preset] of Object.entries(ANIMATION_PRESETS)) {
			const result = preset(p);
			expect(result).toBeDefined();
			// Every preset should have at least opacity or scale
			const hasAnimatableProperty = "opacity" in result || "scale" in result || "x" in result || "y" in result;
			expect(hasAnimatableProperty).toBe(true);
		}
	});
});
