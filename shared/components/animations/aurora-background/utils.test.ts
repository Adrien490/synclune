import { beforeEach, describe, expect, it } from "vitest";
import { AURORA_PALETTES, DEFAULT_AURORA_COLORS } from "./constants";
import type { Ribbon } from "./types";
import {
	buildRibbonGradient,
	clearRibbonCache,
	generateRibbons,
	getRibbonAnimation,
	getRibbonTransition,
} from "./utils";
import { ribbonStyle } from "./aurora-ribbon-set";

// ─── generateRibbons ─────────────────────────────────────────────────

describe("generateRibbons", () => {
	beforeEach(() => {
		clearRibbonCache();
	});

	const defaults = {
		count: 4,
		width: [300, 600] as [number, number],
		height: [100, 300] as [number, number],
		opacity: [0.15, 0.35] as [number, number],
		blur: [40, 80] as [number, number],
		colors: AURORA_PALETTES.jewelry,
		baseDuration: 25,
	};

	function generate(overrides: Partial<typeof defaults> = {}): Ribbon[] {
		const d = { ...defaults, ...overrides };
		return generateRibbons(d.count, d.width, d.height, d.opacity, d.blur, d.colors, d.baseDuration);
	}

	it("generates the correct number of ribbons", () => {
		expect(generate({ count: 0 })).toHaveLength(0);
		expect(generate({ count: 1 })).toHaveLength(1);
		expect(generate({ count: 8 })).toHaveLength(8);
	});

	it("generates ribbons with width within the specified range", () => {
		const ribbons = generate({ count: 20 });
		for (const r of ribbons) {
			expect(r.width).toBeGreaterThanOrEqual(300);
			expect(r.width).toBeLessThanOrEqual(600);
		}
	});

	it("generates ribbons with height within the specified range", () => {
		const ribbons = generate({ count: 20 });
		for (const r of ribbons) {
			expect(r.height).toBeGreaterThanOrEqual(100);
			expect(r.height).toBeLessThanOrEqual(300);
		}
	});

	it("generates ribbons with opacity within the specified range", () => {
		const ribbons = generate({ count: 20 });
		for (const r of ribbons) {
			expect(r.opacity).toBeGreaterThanOrEqual(0.15);
			expect(r.opacity).toBeLessThanOrEqual(0.35);
		}
	});

	it("positions ribbons within 5-95% range", () => {
		const ribbons = generate({ count: 50 });
		for (const r of ribbons) {
			expect(r.x).toBeGreaterThanOrEqual(5);
			expect(r.x).toBeLessThanOrEqual(95);
			expect(r.y).toBeGreaterThanOrEqual(5);
			expect(r.y).toBeLessThanOrEqual(95);
		}
	});

	it("assigns 3 gradient colors from the provided array", () => {
		const colors = ["red", "blue", "green"];
		const ribbons = generate({ count: 10, colors });
		for (const r of ribbons) {
			expect(r.gradientColors).toHaveLength(3);
			for (const c of r.gradientColors) {
				expect(colors).toContain(c);
			}
		}
	});

	it("falls back to DEFAULT_AURORA_COLORS when colors array is empty", () => {
		const ribbons = generate({ count: 3, colors: [] });
		for (const r of ribbons) {
			for (const c of r.gradientColors) {
				expect(DEFAULT_AURORA_COLORS).toContain(c);
			}
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

	it("produces deterministic output (same params = same ribbons)", () => {
		const params = {
			count: 5,
			width: [200, 400] as [number, number],
			height: [80, 200] as [number, number],
			opacity: [0.2, 0.4] as [number, number],
			blur: [30, 60] as [number, number],
			colors: ["#abc"],
			baseDuration: 20,
		};
		const a = generateRibbons(
			params.count,
			params.width,
			params.height,
			params.opacity,
			params.blur,
			params.colors,
			params.baseDuration,
		);
		expect(a[0]!.x).toMatchInlineSnapshot(`23.007253880500684`);
		expect(a[0]!.y).toMatchInlineSnapshot(`92.75422286465073`);
		expect(a[2]!.width).toMatchInlineSnapshot(`391.8802511171634`);
	});

	it("handles width range where min equals max", () => {
		const ribbons = generate({ count: 5, width: [400, 400] });
		for (const r of ribbons) {
			expect(r.width).toBe(400);
		}
	});

	it("normalizes reversed ranges (min > max)", () => {
		const ribbons = generate({ count: 5, width: [600, 300] });
		for (const r of ribbons) {
			expect(r.width).toBeGreaterThanOrEqual(300);
			expect(r.width).toBeLessThanOrEqual(600);
		}
	});

	it("evicts oldest entry when cache exceeds MAX_CACHE_SIZE (30)", () => {
		const firstResult = generateRibbons(
			1,
			[100, 100],
			[100, 100],
			[0.1, 0.1],
			[10, 10],
			["red"],
			10,
		);
		for (let i = 1; i <= 30; i++) {
			generateRibbons(1, [100, 100], [100, 100], [0.1, 0.1], [10, 10], ["red"], 10 + i);
		}
		const reGenerated = generateRibbons(
			1,
			[100, 100],
			[100, 100],
			[0.1, 0.1],
			[10, 10],
			["red"],
			10,
		);
		expect(reGenerated).not.toBe(firstResult);
		expect(reGenerated).toEqual(firstResult);
	});

	it("assigns rotation in -15 to 15 degree range", () => {
		const ribbons = generate({ count: 30 });
		for (const r of ribbons) {
			expect(r.rotation).toBeGreaterThanOrEqual(-15);
			expect(r.rotation).toBeLessThanOrEqual(15);
		}
	});

	it("assigns scale in 0.8 to 1.2 range", () => {
		const ribbons = generate({ count: 30 });
		for (const r of ribbons) {
			expect(r.scale).toBeGreaterThanOrEqual(0.8);
			expect(r.scale).toBeLessThanOrEqual(1.2);
		}
	});
});

// ─── buildRibbonGradient ─────────────────────────────────────────────

describe("buildRibbonGradient", () => {
	it("returns a valid CSS linear-gradient with 3 colors", () => {
		const result = buildRibbonGradient(45, ["red", "blue", "green"]);
		expect(result).toBe("linear-gradient(45deg, red, blue, green)");
	});

	it("handles 0 degree angle", () => {
		const result = buildRibbonGradient(0, ["#abc", "#def", "#123"]);
		expect(result).toContain("0deg");
		expect(result).toContain("#abc");
		expect(result).toContain("#def");
		expect(result).toContain("#123");
	});

	it("handles oklch colors", () => {
		const colors: [string, string, string] = [
			"oklch(0.82 0.12 340)",
			"oklch(0.72 0.14 280)",
			"oklch(0.88 0.08 85)",
		];
		const result = buildRibbonGradient(180, colors);
		expect(result).toContain("oklch(0.82 0.12 340)");
	});
});

// ─── getRibbonTransition ─────────────────────────────────────────────

describe("getRibbonTransition", () => {
	const makeRibbon = (overrides: Partial<Ribbon> = {}): Ribbon => ({
		id: 0,
		width: 400,
		height: 150,
		x: 50,
		y: 50,
		opacity: 0.25,
		blur: 50,
		rotation: 5,
		gradientAngle: 90,
		gradientColors: ["red", "blue", "green"],
		duration: 20,
		delay: 3,
		scale: 1,
		depthFactor: 0.5,
		...overrides,
	});

	it("uses ribbon duration and delay", () => {
		const t = getRibbonTransition(makeRibbon({ duration: 18, delay: 4 }));
		expect(t.duration).toBe(18);
		expect(t.delay).toBe(4);
	});

	it("repeats infinitely with reverse", () => {
		const t = getRibbonTransition(makeRibbon());
		expect(t.repeat).toBe(Infinity);
		expect(t.repeatType).toBe("reverse");
	});

	it("cycles easings based on ribbon id", () => {
		const t0 = getRibbonTransition(makeRibbon({ id: 0 }));
		const t1 = getRibbonTransition(makeRibbon({ id: 1 }));
		const t4 = getRibbonTransition(makeRibbon({ id: 4 }));
		expect(t0.ease).toEqual(t4.ease);
		expect(t0.ease).not.toEqual(t1.ease);
	});

	it("sets repeatDelay as fraction of delay", () => {
		const t = getRibbonTransition(makeRibbon({ delay: 5 }));
		expect(t.repeatDelay).toBeCloseTo(0.75); // 5 * 0.15
	});
});

// ─── getRibbonAnimation ─────────────────────────────────────────────

describe("getRibbonAnimation", () => {
	const makeRibbon = (overrides: Partial<Ribbon> = {}): Ribbon => ({
		id: 0,
		width: 400,
		height: 150,
		x: 50,
		y: 50,
		opacity: 0.25,
		blur: 50,
		rotation: 5,
		gradientAngle: 90,
		gradientColors: ["red", "blue", "green"],
		duration: 20,
		delay: 3,
		scale: 1,
		depthFactor: 0.5,
		...overrides,
	});

	it("returns arrays for x, y, scale, rotate, and opacity", () => {
		const result = getRibbonAnimation(makeRibbon(), "medium");
		expect(result.x).toHaveLength(4);
		expect(result.y).toHaveLength(4);
		expect(result.scale).toHaveLength(4);
		expect(result.rotate).toHaveLength(4);
		expect(result.opacity).toHaveLength(4);
	});

	it("x and y keyframes start and end at 0", () => {
		const result = getRibbonAnimation(makeRibbon(), "subtle");
		expect(result.x[0]).toBe("0%");
		expect(result.x[3]).toBe("0%");
		expect(result.y[0]).toBe("0%");
		expect(result.y[3]).toBe("0%");
	});

	it("subtle intensity has smaller translate range than vivid", () => {
		const subtle = getRibbonAnimation(makeRibbon({ id: 1 }), "subtle");
		const vivid = getRibbonAnimation(makeRibbon({ id: 1 }), "vivid");
		// Parse the max absolute translate value from the x keyframes
		const maxSubtle = Math.max(...subtle.x.slice(1, 3).map((v) => Math.abs(parseFloat(v))));
		const maxVivid = Math.max(...vivid.x.slice(1, 3).map((v) => Math.abs(parseFloat(v))));
		expect(maxSubtle).toBeLessThan(maxVivid);
	});

	it("vivid intensity has higher opacity multiplier", () => {
		const ribbon = makeRibbon({ opacity: 0.3 });
		const subtle = getRibbonAnimation(ribbon, "subtle");
		const vivid = getRibbonAnimation(ribbon, "vivid");
		// Vivid base opacity = 0.3 * 1.3, Subtle = 0.3 * 0.7
		expect(vivid.opacity[0]!).toBeGreaterThan(subtle.opacity[0]!);
	});

	it("scale keyframes include ribbon.scale", () => {
		const ribbon = makeRibbon({ scale: 1.1 });
		const result = getRibbonAnimation(ribbon, "medium");
		expect(result.scale[0]).toBe(1.1);
		expect(result.scale[3]).toBe(1.1);
	});

	it("rotate keyframes center on ribbon.rotation", () => {
		const ribbon = makeRibbon({ rotation: 10 });
		const result = getRibbonAnimation(ribbon, "medium");
		expect(result.rotate[0]).toBe(10);
		expect(result.rotate[3]).toBe(10);
	});

	it("opacity clamps to 1", () => {
		const ribbon = makeRibbon({ opacity: 0.9 });
		const result = getRibbonAnimation(ribbon, "vivid");
		// 0.9 * 1.3 * 1.2 = 1.404, should be clamped
		expect(result.opacity[1]).toBeLessThanOrEqual(1);
	});
});

// ─── ribbonStyle ────────────────────────────────────────────────────

describe("ribbonStyle", () => {
	const makeRibbon = (overrides: Partial<Ribbon> = {}): Ribbon => ({
		id: 0,
		width: 400,
		height: 150,
		x: 50,
		y: 50,
		opacity: 0.25,
		blur: 50,
		rotation: 5,
		gradientAngle: 90,
		gradientColors: ["red", "blue", "green"],
		duration: 20,
		delay: 3,
		scale: 1,
		depthFactor: 0.5,
		...overrides,
	});

	it("returns correct width, height, left, top, filter, mixBlendMode, and zIndex", () => {
		const style = ribbonStyle(
			makeRibbon({ width: 300, height: 120, x: 30, y: 70, blur: 60, depthFactor: 0.5 }),
			"screen",
			false,
		);
		expect(style.width).toBe(300);
		expect(style.height).toBe(120);
		expect(style.left).toBe("30%");
		expect(style.top).toBe("70%");
		expect(style.filter).toBe("blur(60px)");
		expect(style.mixBlendMode).toBe("screen");
		expect(style.zIndex).toBe(5); // round((1-0.5)*10)
	});

	it("increases blur by 1.5x when highContrast is true", () => {
		const normal = ribbonStyle(makeRibbon({ blur: 40 }), "screen", false);
		const highContrast = ribbonStyle(makeRibbon({ blur: 40 }), "screen", true);
		expect(normal.filter).toBe("blur(40px)");
		expect(highContrast.filter).toBe("blur(60px)");
	});

	it("maps depthFactor to zIndex (0 depth → z10, 1 depth → z0)", () => {
		const close = ribbonStyle(makeRibbon({ depthFactor: 0 }), "screen", false);
		const far = ribbonStyle(makeRibbon({ depthFactor: 1 }), "screen", false);
		const mid = ribbonStyle(makeRibbon({ depthFactor: 0.3 }), "screen", false);
		expect(close.zIndex).toBe(10);
		expect(far.zIndex).toBe(0);
		expect(mid.zIndex).toBe(7); // round((1-0.3)*10)
	});

	it("uses the provided blendMode", () => {
		const style = ribbonStyle(makeRibbon(), "soft-light", false);
		expect(style.mixBlendMode).toBe("soft-light");
	});
});
