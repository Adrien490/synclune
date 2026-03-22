import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion, mockMounted } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
	mockMounted: { value: true },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => {
	const { forwardRef: fRef } = require("react");
	return {
		AnimatePresence: ({ children }: { children: unknown }) => children,
		m: {
			div: fRef(
				(
					{
						children,
						initial,
						animate,
						exit,
						transition: _t,
						onAnimationComplete,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement(
						"div",
						{
							ref,
							"data-initial": initial ? JSON.stringify(initial) : undefined,
							"data-animate": animate ? JSON.stringify(animate) : undefined,
							"data-exit": exit ? JSON.stringify(exit) : undefined,
							"data-testid": "fly-dot",
							// Expose onAnimationComplete so tests can trigger it
							"data-on-animation-complete": onAnimationComplete ? "true" : undefined,
							onClick: onAnimationComplete as (() => void) | undefined,
							...props,
						},
						children,
					);
				},
			),
		},
		useReducedMotion: () => mockReducedMotion.value,
	};
});

vi.mock("@/shared/hooks/use-mounted", () => ({
	useMounted: () => mockMounted.value,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		easing: { easeInOut: [0.25, 0.1, 0.25, 1] },
	},
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { FlyToCartOverlay } from "../fly-to-cart-overlay";
import { FLY_TO_CART_EVENT, CART_TARGET_ATTR } from "@/modules/cart/lib/fly-to-cart";

// ============================================================================
// HELPERS
// ============================================================================

function dispatchFlyEvent(fromX = 100, fromY = 200) {
	const event = new CustomEvent(FLY_TO_CART_EVENT, {
		detail: { fromX, fromY },
	});
	window.dispatchEvent(event);
}

function setupCartTarget(left = 300, top = 50, width = 40, height = 40) {
	const target = document.createElement("div");
	target.setAttribute(CART_TARGET_ATTR, "");
	// jsdom getBoundingClientRect returns zeros; override for the target
	target.getBoundingClientRect = () => ({
		left,
		top,
		width,
		height,
		right: left + width,
		bottom: top + height,
		x: left,
		y: top,
		toJSON: () => ({}),
	});
	document.body.appendChild(target);
	return target;
}

// ============================================================================
// TESTS
// ============================================================================

describe("FlyToCartOverlay", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
		mockMounted.value = true;
	});

	afterEach(() => {
		// Clean up any cart target elements appended during tests
		document
			.querySelectorAll(`[${CART_TARGET_ATTR}]`)
			.forEach((el) => el.parentNode?.removeChild(el));
		cleanup();
	});

	describe("reduced motion behavior", () => {
		it("renders nothing when prefersReducedMotion is true", () => {
			mockReducedMotion.value = true;
			const { container } = render(<FlyToCartOverlay />);

			expect(container.innerHTML).toBe("");
		});

		it("renders nothing when not mounted (SSR)", () => {
			mockMounted.value = false;
			const { container } = render(<FlyToCartOverlay />);

			expect(container.innerHTML).toBe("");
		});

		it("renders a portal container when mounted and motion is allowed", () => {
			// No dots yet — the portal renders but with no dot children
			render(<FlyToCartOverlay />);
			// No dots should be present initially
			expect(document.querySelectorAll('[data-testid="fly-dot"]').length).toBe(0);
		});
	});

	describe("event listener registration", () => {
		it("adds fly-to-cart event listener on mount", () => {
			const addSpy = vi.spyOn(window, "addEventListener");
			render(<FlyToCartOverlay />);

			expect(addSpy).toHaveBeenCalledWith(FLY_TO_CART_EVENT, expect.any(Function));
		});

		it("removes fly-to-cart event listener on unmount", () => {
			const removeSpy = vi.spyOn(window, "removeEventListener");
			const { unmount } = render(<FlyToCartOverlay />);

			unmount();

			expect(removeSpy).toHaveBeenCalledWith(FLY_TO_CART_EVENT, expect.any(Function));
		});
	});

	describe("dot creation on fly-to-cart event", () => {
		it("does not create a dot when cart target is absent", () => {
			render(<FlyToCartOverlay />);

			act(() => {
				dispatchFlyEvent(100, 200);
			});

			expect(document.querySelectorAll('[data-testid="fly-dot"]').length).toBe(0);
		});

		it("creates a dot when cart target exists and event is dispatched", () => {
			setupCartTarget();
			render(<FlyToCartOverlay />);

			act(() => {
				dispatchFlyEvent(100, 200);
			});

			expect(document.querySelectorAll('[data-testid="fly-dot"]').length).toBe(1);
		});

		it("creates multiple dots for multiple events", () => {
			setupCartTarget();
			render(<FlyToCartOverlay />);

			act(() => {
				dispatchFlyEvent(100, 200);
				dispatchFlyEvent(150, 250);
				dispatchFlyEvent(200, 300);
			});

			expect(document.querySelectorAll('[data-testid="fly-dot"]').length).toBe(3);
		});
	});

	describe("dot animation props", () => {
		it("sets initial position based on fromX/fromY coordinates", () => {
			setupCartTarget(300, 50, 40, 40);
			render(<FlyToCartOverlay />);

			act(() => {
				dispatchFlyEvent(100, 200);
			});

			const dot = document.querySelector('[data-testid="fly-dot"]');
			expect(dot).not.toBeNull();
			const initial = JSON.parse(dot!.getAttribute("data-initial")!);
			// from.x - DOT_RADIUS = 100 - 6 = 94
			expect(initial.x).toBe(94);
			// from.y - DOT_RADIUS = 200 - 6 = 194
			expect(initial.y).toBe(194);
			expect(initial.scale).toBe(1);
			expect(initial.opacity).toBe(1);
		});

		it("sets animate arrays for curved trajectory", () => {
			setupCartTarget(300, 50, 40, 40);
			render(<FlyToCartOverlay />);

			act(() => {
				dispatchFlyEvent(100, 200);
			});

			const dot = document.querySelector('[data-testid="fly-dot"]');
			const animate = JSON.parse(dot!.getAttribute("data-animate")!);
			// animate.x is an array [from, mid, to]
			expect(Array.isArray(animate.x)).toBe(true);
			expect(animate.x).toHaveLength(3);
			expect(Array.isArray(animate.y)).toBe(true);
			expect(animate.y).toHaveLength(3);
			// Scale goes from 1 → 1.2 → 0.5
			expect(animate.scale).toEqual([1, 1.2, 0.5]);
			// Opacity fades out at the end
			expect(animate.opacity).toEqual([1, 1, 0]);
		});

		it("uses target center coordinates as animation destination", () => {
			// Target: left=300, top=50, width=40, height=40 → center=(320,70)
			setupCartTarget(300, 50, 40, 40);
			render(<FlyToCartOverlay />);

			act(() => {
				dispatchFlyEvent(100, 200);
			});

			const dot = document.querySelector('[data-testid="fly-dot"]');
			const animate = JSON.parse(dot!.getAttribute("data-animate")!);
			// to.x - DOT_RADIUS = (300 + 40/2) - 6 = 320 - 6 = 314
			expect(animate.x[2]).toBe(314);
			// to.y - DOT_RADIUS = (50 + 40/2) - 6 = 70 - 6 = 64
			expect(animate.y[2]).toBe(64);
		});

		it("sets exit prop with opacity:0", () => {
			setupCartTarget();
			render(<FlyToCartOverlay />);

			act(() => {
				dispatchFlyEvent(100, 200);
			});

			const dot = document.querySelector('[data-testid="fly-dot"]');
			const exit = JSON.parse(dot!.getAttribute("data-exit")!);
			expect(exit.opacity).toBe(0);
		});
	});

	describe("dot removal after animation", () => {
		it("removes dot from state when onAnimationComplete fires (click proxy)", () => {
			setupCartTarget();
			render(<FlyToCartOverlay />);

			act(() => {
				dispatchFlyEvent(100, 200);
			});

			// createPortal renders into document.body, not into container
			expect(document.querySelectorAll('[data-testid="fly-dot"]').length).toBe(1);

			// The mock exposes onAnimationComplete via onClick — trigger it
			act(() => {
				const dot = document.querySelector('[data-testid="fly-dot"]') as HTMLElement;
				fireEvent.click(dot);
			});

			expect(document.querySelectorAll('[data-testid="fly-dot"]').length).toBe(0);
		});

		it("removes only the completed dot when multiple dots exist", () => {
			setupCartTarget();
			render(<FlyToCartOverlay />);

			act(() => {
				dispatchFlyEvent(100, 200);
				dispatchFlyEvent(150, 250);
			});

			// createPortal renders into document.body
			expect(document.querySelectorAll('[data-testid="fly-dot"]').length).toBe(2);

			// Complete first dot
			act(() => {
				const dots = document.querySelectorAll('[data-testid="fly-dot"]');
				fireEvent.click(dots[0] as HTMLElement);
			});

			expect(document.querySelectorAll('[data-testid="fly-dot"]').length).toBe(1);
		});
	});

	describe("dot styling", () => {
		it("dot has pointer-events-none and fixed positioning classes", () => {
			setupCartTarget();
			render(<FlyToCartOverlay />);

			act(() => {
				dispatchFlyEvent(100, 200);
			});

			const dot = document.querySelector('[data-testid="fly-dot"]');
			expect(dot).toHaveClass("pointer-events-none");
			expect(dot).toHaveClass("fixed");
			expect(dot).toHaveClass("rounded-full");
		});
	});
});
