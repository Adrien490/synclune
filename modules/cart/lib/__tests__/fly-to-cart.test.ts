import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { dispatchFlyToCart, CART_TARGET_ATTR, FLY_TO_CART_EVENT } from "../fly-to-cart";
import type { FlyToCartDetail } from "../fly-to-cart";

// ============================================================================
// Tests: exported constants
// ============================================================================

describe("exported constants", () => {
	it("exports CART_TARGET_ATTR as 'data-cart-target'", () => {
		expect(CART_TARGET_ATTR).toBe("data-cart-target");
	});

	it("exports FLY_TO_CART_EVENT as 'fly-to-cart'", () => {
		expect(FLY_TO_CART_EVENT).toBe("fly-to-cart");
	});
});

// ============================================================================
// Tests: dispatchFlyToCart
// ============================================================================

describe("dispatchFlyToCart", () => {
	let dispatchEventSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	function makeElement(rect: Partial<DOMRect>): HTMLElement {
		const el = document.createElement("button");
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
			left: 0,
			top: 0,
			right: 0,
			bottom: 0,
			width: 0,
			height: 0,
			x: 0,
			y: 0,
			toJSON: () => ({}),
			...rect,
		} as DOMRect);
		return el;
	}

	it("dispatches a CustomEvent on window", () => {
		const el = makeElement({ left: 100, top: 200, width: 40, height: 20 });

		dispatchFlyToCart(el);

		expect(dispatchEventSpy).toHaveBeenCalledOnce();
		const event = dispatchEventSpy.mock.calls[0]![0] as CustomEvent;
		expect(event).toBeInstanceOf(CustomEvent);
	});

	it("dispatches an event with the FLY_TO_CART_EVENT type", () => {
		const el = makeElement({ left: 100, top: 200, width: 40, height: 20 });

		dispatchFlyToCart(el);

		const event = dispatchEventSpy.mock.calls[0]![0] as CustomEvent;
		expect(event.type).toBe(FLY_TO_CART_EVENT);
	});

	it("computes fromX as left + width / 2", () => {
		const el = makeElement({ left: 100, top: 200, width: 40, height: 20 });

		dispatchFlyToCart(el);

		const event = dispatchEventSpy.mock.calls[0]![0] as CustomEvent<FlyToCartDetail>;
		expect(event.detail.fromX).toBe(120); // 100 + 40/2
	});

	it("computes fromY as top + height / 2", () => {
		const el = makeElement({ left: 100, top: 200, width: 40, height: 20 });

		dispatchFlyToCart(el);

		const event = dispatchEventSpy.mock.calls[0]![0] as CustomEvent<FlyToCartDetail>;
		expect(event.detail.fromY).toBe(210); // 200 + 20/2
	});

	it("handles zero-size element (point at origin)", () => {
		const el = makeElement({ left: 0, top: 0, width: 0, height: 0 });

		dispatchFlyToCart(el);

		const event = dispatchEventSpy.mock.calls[0]![0] as CustomEvent<FlyToCartDetail>;
		expect(event.detail.fromX).toBe(0);
		expect(event.detail.fromY).toBe(0);
	});

	it("handles element at non-zero origin with fractional center", () => {
		const el = makeElement({ left: 50, top: 75, width: 30, height: 50 });

		dispatchFlyToCart(el);

		const event = dispatchEventSpy.mock.calls[0]![0] as CustomEvent<FlyToCartDetail>;
		expect(event.detail.fromX).toBe(65); // 50 + 30/2
		expect(event.detail.fromY).toBe(100); // 75 + 50/2
	});

	it("handles element positioned off-screen to the right and bottom", () => {
		const el = makeElement({ left: 1200, top: 900, width: 100, height: 60 });

		dispatchFlyToCart(el);

		const event = dispatchEventSpy.mock.calls[0]![0] as CustomEvent<FlyToCartDetail>;
		expect(event.detail.fromX).toBe(1250); // 1200 + 100/2
		expect(event.detail.fromY).toBe(930); // 900 + 60/2
	});

	it("calls getBoundingClientRect on the provided element", () => {
		const el = makeElement({ left: 10, top: 20, width: 80, height: 40 });
		const rectSpy = el.getBoundingClientRect as ReturnType<typeof vi.spyOn>;

		dispatchFlyToCart(el);

		expect(rectSpy).toHaveBeenCalledOnce();
	});

	it("dispatches the event exactly once per call", () => {
		const el = makeElement({ left: 0, top: 0, width: 10, height: 10 });

		dispatchFlyToCart(el);

		expect(dispatchEventSpy).toHaveBeenCalledOnce();
	});

	it("detail object contains only fromX and fromY keys", () => {
		const el = makeElement({ left: 10, top: 20, width: 80, height: 40 });

		dispatchFlyToCart(el);

		const event = dispatchEventSpy.mock.calls[0]![0] as CustomEvent<FlyToCartDetail>;
		const detailKeys = Object.keys(event.detail);
		expect(detailKeys).toEqual(expect.arrayContaining(["fromX", "fromY"]));
		expect(detailKeys).toHaveLength(2);
	});
});
