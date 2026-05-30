import { describe, expect, it } from "vitest";
import { buildSparklinePath } from "../sparkline-path.service";

describe("buildSparklinePath", () => {
	it("returns null for fewer than 2 points", () => {
		expect(buildSparklinePath([])).toBeNull();
		expect(buildSparklinePath([42])).toBeNull();
	});

	it("returns null for a perfectly flat series (no trend)", () => {
		expect(buildSparklinePath([10, 10, 10])).toBeNull();
		expect(buildSparklinePath([0, 0])).toBeNull();
	});

	it("builds a path starting with M and using L segments", () => {
		const path = buildSparklinePath([1, 2, 3]);
		expect(path).not.toBeNull();
		expect(path!.startsWith("M ")).toBe(true);
		expect(path!.split(" L ")).toHaveLength(3);
	});

	it("spans the full viewBox width across points", () => {
		const path = buildSparklinePath([5, 1, 5]);
		// first x = 0, last x = 100 (VIEWBOX_WIDTH)
		expect(path).toMatch(/^M 0 /);
		expect(path).toContain("100 ");
	});

	it("maps the max value near the top and min near the bottom (inverted Y)", () => {
		// 2 points: min then max → first y is bottom (large), second y is top (small)
		const path = buildSparklinePath([0, 100]);
		expect(path).not.toBeNull();
		const [start, end] = path!.replace("M ", "").split(" L ");
		const startY = Number(start!.split(" ")[1]);
		const endY = Number(end!.split(" ")[1]);
		expect(startY).toBeGreaterThan(endY); // higher value → smaller y
		expect(endY).toBeCloseTo(3, 1); // PADDING_Y top
	});
});
