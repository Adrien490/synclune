import type React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockScrollChangeCallback, mockReducedMotion } = vi.hoisted(() => ({
	mockScrollChangeCallback: { current: null as ((value: number) => void) | null },
	mockReducedMotion: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => {
	const { forwardRef: fRef } = require("react");
	return {
		AnimatePresence: ({ children }: { children: unknown }) => children,
		m: {
			button: fRef(
				(
					{
						children,
						initial: _i,
						animate: _a,
						exit: _e,
						transition: _t,
						whileHover: _wh,
						whileTap: _wt,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement("button", { ref, ...props }, children);
				},
			),
			circle: fRef((props: Record<string, unknown>, ref: unknown) => {
				const { createElement } = require("react");
				return createElement("circle", { ref, ...props });
			}),
		},
		useScroll: () => ({
			scrollY: { get: () => 0, on: vi.fn() },
			scrollYProgress: { get: () => 0, on: vi.fn() },
		}),
		useMotionValueEvent: (_value: unknown, _event: string, callback: (v: number) => void) => {
			mockScrollChangeCallback.current = callback;
		},
		useReducedMotion: () => mockReducedMotion.value,
	};
});

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: { spring: { snappy: { type: "spring" } } },
	maybeReduceMotion: (config: unknown) => config,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { ScrollToTop } from "../scroll-to-top";

describe("ScrollToTop", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockScrollChangeCallback.current = null;
		mockReducedMotion.value = false;
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	});
	afterEach(cleanup);

	function simulateScroll(value: number) {
		act(() => {
			mockScrollChangeCallback.current?.(value);
		});
	}

	// ============================================================================
	// VISIBILITY
	// ============================================================================

	it("is not visible at initial render", () => {
		render(<ScrollToTop />);
		expect(screen.queryByLabelText("Retour en haut de la page")).not.toBeInTheDocument();
	});

	it("becomes visible when scroll > 1200", () => {
		render(<ScrollToTop />);
		simulateScroll(1500);
		expect(screen.getByLabelText("Retour en haut de la page")).toBeInTheDocument();
	});

	it("hides when scroll drops below threshold", () => {
		render(<ScrollToTop />);
		simulateScroll(1500);
		expect(screen.getByLabelText("Retour en haut de la page")).toBeInTheDocument();
		simulateScroll(500);
		expect(screen.queryByLabelText("Retour en haut de la page")).not.toBeInTheDocument();
	});

	// ============================================================================
	// CLICK BEHAVIOR
	// ============================================================================

	it("scrolls to top with smooth behavior on click", () => {
		render(<ScrollToTop />);
		simulateScroll(1500);
		fireEvent.click(screen.getByLabelText("Retour en haut de la page"));
		expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
	});

	it("scrolls to top with instant behavior when reduced motion", () => {
		mockReducedMotion.value = true;
		render(<ScrollToTop />);
		simulateScroll(1500);
		fireEvent.click(screen.getByLabelText("Retour en haut de la page"));
		expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
	});

	// ============================================================================
	// SR STATUS
	// ============================================================================

	it("has sr-only status region", () => {
		render(<ScrollToTop />);
		const status = screen.getByRole("status");
		expect(status).toHaveClass("sr-only");
	});

	it("announces 'Retour en haut disponible' when visible", () => {
		render(<ScrollToTop />);
		simulateScroll(1500);
		const status = screen.getByRole("status");
		expect(status.textContent).toBe("Retour en haut disponible");
	});

	// ============================================================================
	// SCROLL RING
	// ============================================================================

	it("renders ScrollRing when not reduced motion", () => {
		render(<ScrollToTop />);
		simulateScroll(1500);
		const button = screen.getByLabelText("Retour en haut de la page");
		const svg = button.querySelector("svg");
		expect(svg).toBeInTheDocument();
	});

	it("does not render ScrollRing when reduced motion", () => {
		mockReducedMotion.value = true;
		render(<ScrollToTop />);
		simulateScroll(1500);
		const button = screen.getByLabelText("Retour en haut de la page");
		// ScrollRing renders an SVG with a circle inside; ChevronUp is a different SVG
		// With reduced motion, ScrollRing should not be rendered
		const circles = button.querySelectorAll("circle");
		expect(circles).toHaveLength(0);
	});
});
