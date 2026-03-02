import { describe, it, expect } from "vitest";
import { getDistance, getCenter, clampPosition, getZoomToPointPosition } from "../touch-geometry";

function createTouchList(...points: { clientX: number; clientY: number }[]): TouchList {
	return {
		length: points.length,
		item: (index: number) => points[index] as Touch,
		...Object.fromEntries(points.map((p, i) => [i, p])),
		[Symbol.iterator]: function* () {
			for (const p of points) yield p as Touch;
		},
	} as unknown as TouchList;
}

describe("getDistance", () => {
	it("returns 0 for a single touch", () => {
		const touches = createTouchList({ clientX: 10, clientY: 20 });
		expect(getDistance(touches)).toBe(0);
	});

	it("calculates distance between two horizontal touches", () => {
		const touches = createTouchList({ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 0 });
		expect(getDistance(touches)).toBe(100);
	});

	it("calculates distance between two vertical touches", () => {
		const touches = createTouchList({ clientX: 0, clientY: 0 }, { clientX: 0, clientY: 50 });
		expect(getDistance(touches)).toBe(50);
	});

	it("calculates diagonal distance (3-4-5 triangle)", () => {
		const touches = createTouchList({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 });
		expect(getDistance(touches)).toBe(5);
	});

	it("returns 0 for empty touch list", () => {
		const touches = createTouchList();
		expect(getDistance(touches)).toBe(0);
	});
});

describe("getCenter", () => {
	it("returns the single touch position for one touch", () => {
		const touches = createTouchList({ clientX: 42, clientY: 84 });
		expect(getCenter(touches)).toEqual({ x: 42, y: 84 });
	});

	it("returns the midpoint of two touches", () => {
		const touches = createTouchList({ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 200 });
		expect(getCenter(touches)).toEqual({ x: 50, y: 100 });
	});

	it("returns exact position when both touches overlap", () => {
		const touches = createTouchList({ clientX: 50, clientY: 50 }, { clientX: 50, clientY: 50 });
		expect(getCenter(touches)).toEqual({ x: 50, y: 50 });
	});
});

describe("clampPosition", () => {
	const rect = { width: 200, height: 100 } as DOMRect;

	it("returns origin when scale <= 1", () => {
		expect(clampPosition({ x: 50, y: 50 }, 1, rect)).toEqual({ x: 0, y: 0 });
	});

	it("returns origin when containerRect is null", () => {
		expect(clampPosition({ x: 50, y: 50 }, 2, null)).toEqual({ x: 0, y: 0 });
	});

	it("clamps position within bounds at scale 2", () => {
		// maxX = 200 * (2-1) / 2 = 100, maxY = 100 * (2-1) / 2 = 50
		expect(clampPosition({ x: 200, y: 80 }, 2, rect)).toEqual({ x: 100, y: 50 });
	});

	it("clamps negative overflow", () => {
		expect(clampPosition({ x: -200, y: -80 }, 2, rect)).toEqual({ x: -100, y: -50 });
	});

	it("allows position within bounds", () => {
		expect(clampPosition({ x: 30, y: 20 }, 2, rect)).toEqual({ x: 30, y: 20 });
	});
});

describe("getZoomToPointPosition", () => {
	const rect = {
		left: 0,
		top: 0,
		width: 200,
		height: 100,
	} as DOMRect;

	it("returns origin when tapping center at scale 2", () => {
		const result = getZoomToPointPosition({ x: 100, y: 50 }, rect, 2);
		// -0 and 0 are mathematically equivalent; clampPosition returns -0 here
		expect(result.x + 0).toBe(0);
		expect(result.y + 0).toBe(0);
	});

	it("calculates zoom offset for top-left tap", () => {
		const result = getZoomToPointPosition({ x: 0, y: 0 }, rect, 2);
		// tapX = 0 - 0 - 100 = -100, tapY = 0 - 0 - 50 = -50
		// position = { x: 100, y: 50 } -> clamped to maxX=100, maxY=50
		expect(result).toEqual({ x: 100, y: 50 });
	});

	it("calculates zoom offset for bottom-right tap", () => {
		const result = getZoomToPointPosition({ x: 200, y: 100 }, rect, 2);
		// tapX = 200 - 0 - 100 = 100, tapY = 100 - 0 - 50 = 50
		// position = { x: -100, y: -50 } -> clamped
		expect(result).toEqual({ x: -100, y: -50 });
	});
});
