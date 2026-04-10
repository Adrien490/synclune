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

	it("accounts for container rect offset (non-zero left/top)", () => {
		const offsetRect = { left: 50, top: 25, width: 200, height: 100 } as DOMRect;
		// Tapping at (150, 75) is the center of the offsetRect
		const result = getZoomToPointPosition({ x: 150, y: 75 }, offsetRect, 2);
		expect(result.x + 0).toBe(0);
		expect(result.y + 0).toBe(0);
	});

	it("returns clamped position for very high scale factor", () => {
		const result = getZoomToPointPosition({ x: 0, y: 0 }, rect, 5);
		// maxX = 200*(5-1)/2 = 400, maxY = 100*(5-1)/2 = 200
		// tapX = 0 - 0 - 100 = -100, tapY = 0 - 0 - 50 = -50
		// raw x = -(-100)*(5-1) = 400, y = 200 — within bounds
		expect(result).toEqual({ x: 400, y: 200 });
	});
});

describe("getDistance - additional cases", () => {
	it("returns positive distance regardless of touch order", () => {
		// t1 and t2 reversed — distance should be the same
		const touches1 = createTouchList({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 });
		const touches2 = createTouchList({ clientX: 3, clientY: 4 }, { clientX: 0, clientY: 0 });
		expect(getDistance(touches1)).toBe(getDistance(touches2));
	});

	it("returns distance for negative coordinates", () => {
		const touches = createTouchList({ clientX: -50, clientY: 0 }, { clientX: 50, clientY: 0 });
		expect(getDistance(touches)).toBe(100);
	});
});

describe("getCenter - additional cases", () => {
	it("returns correct midpoint for negative coordinates", () => {
		const touches = createTouchList(
			{ clientX: -100, clientY: -200 },
			{ clientX: 100, clientY: 200 },
		);
		expect(getCenter(touches)).toEqual({ x: 0, y: 0 });
	});
});

describe("clampPosition - additional cases", () => {
	it("returns origin when scale equals 1 exactly", () => {
		const rect = { width: 400, height: 300 } as DOMRect;
		expect(clampPosition({ x: 10, y: 10 }, 1, rect)).toEqual({ x: 0, y: 0 });
	});

	it("clamps asymmetrically for non-square containers", () => {
		// width=400, height=100, scale=3 => maxX=400, maxY=100
		const wideRect = { width: 400, height: 100 } as DOMRect;
		const result = clampPosition({ x: 500, y: 200 }, 3, wideRect);
		expect(result.x).toBe(400);
		expect(result.y).toBe(100);
	});

	it("handles position exactly at boundary", () => {
		const rect = { width: 200, height: 100 } as DOMRect;
		// scale=2 => maxX=100, maxY=50
		expect(clampPosition({ x: 100, y: 50 }, 2, rect)).toEqual({ x: 100, y: 50 });
		expect(clampPosition({ x: -100, y: -50 }, 2, rect)).toEqual({ x: -100, y: -50 });
	});
});
