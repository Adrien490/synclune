import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => {
	const { forwardRef: fRef } = require("react");
	return {
		m: {
			div: fRef(
				(
					{
						children,
						initial,
						animate,
						exit: _exit,
						transition: _t,
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

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		spring: {
			success: {
				type: "spring",
				damping: 12,
				stiffness: 200,
			},
		},
	},
}));

// Mock lucide-react CircleCheck as a simple identifiable element
vi.mock("lucide-react", () => ({
	CircleCheck: ({ className }: { className?: string }) => {
		const { createElement } = require("react");
		return createElement("svg", { "data-testid": "check-circle-icon", className });
	},
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { SuccessIcon } from "../success-icon";

// ============================================================================
// TESTS
// ============================================================================

describe("SuccessIcon", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	describe("default rendering (motion enabled)", () => {
		it("renders the check circle icon", () => {
			render(<SuccessIcon />);

			expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
		});

		it("renders two nested m.div wrappers for layered animation", () => {
			const { container } = render(<SuccessIcon />);

			const motionDivs = container.querySelectorAll("[data-initial]");
			expect(motionDivs.length).toBe(2);
		});

		it("outer wrapper starts hidden (opacity:0, scale:0.5)", () => {
			const { container } = render(<SuccessIcon />);

			const motionDivs = container.querySelectorAll("[data-initial]");
			const outerInitial = JSON.parse(motionDivs[0]!.getAttribute("data-initial")!);
			expect(outerInitial.opacity).toBe(0);
			expect(outerInitial.scale).toBe(0.5);
		});

		it("outer wrapper animates to visible (opacity:1, scale:1)", () => {
			const { container } = render(<SuccessIcon />);

			const motionDivs = container.querySelectorAll("[data-animate]");
			const outerAnimate = JSON.parse(motionDivs[0]!.getAttribute("data-animate")!);
			expect(outerAnimate.opacity).toBe(1);
			expect(outerAnimate.scale).toBe(1);
		});

		it("inner wrapper starts rotated (-45 degrees) and hidden", () => {
			const { container } = render(<SuccessIcon />);

			const motionDivs = container.querySelectorAll("[data-initial]");
			const innerInitial = JSON.parse(motionDivs[1]!.getAttribute("data-initial")!);
			expect(innerInitial.scale).toBe(0.5);
			expect(innerInitial.opacity).toBe(0);
			expect(innerInitial.rotate).toBe(-45);
		});

		it("inner wrapper animates to upright position", () => {
			const { container } = render(<SuccessIcon />);

			const motionDivs = container.querySelectorAll("[data-animate]");
			const innerAnimate = JSON.parse(motionDivs[1]!.getAttribute("data-animate")!);
			expect(innerAnimate.scale).toBe(1);
			expect(innerAnimate.opacity).toBe(1);
			expect(innerAnimate.rotate).toBe(0);
		});
	});

	describe("reduced motion behavior", () => {
		it("renders a plain div instead of m.div when reduced motion is on", () => {
			mockReducedMotion.value = true;
			const { container } = render(<SuccessIcon />);

			// No motion elements — no data-initial attributes
			expect(container.querySelectorAll("[data-initial]").length).toBe(0);
		});

		it("still renders the check circle icon when reduced motion is on", () => {
			mockReducedMotion.value = true;
			render(<SuccessIcon />);

			expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
		});

		it("renders static wrapper div with expected classes when reduced motion is on", () => {
			mockReducedMotion.value = true;
			const { container } = render(<SuccessIcon />);

			// The outer div should still have the styling classes for layout
			const wrapper = container.querySelector("div");
			expect(wrapper).not.toBeNull();
			expect(wrapper).toHaveClass("rounded-full");
		});
	});

	describe("accessibility", () => {
		it("check icon carries text-primary class for correct color", () => {
			render(<SuccessIcon />);

			const icon = screen.getByTestId("check-circle-icon");
			expect(icon).toHaveClass("text-primary");
		});

		it("check icon carries text-primary class in reduced motion mode", () => {
			mockReducedMotion.value = true;
			render(<SuccessIcon />);

			const icon = screen.getByTestId("check-circle-icon");
			expect(icon).toHaveClass("text-primary");
		});

		it("outer wrapper has bg-primary/10 background class in both modes", () => {
			// Motion mode
			const { container: c1 } = render(<SuccessIcon />);
			expect(c1.querySelector("div")).toHaveClass("bg-primary/10");
			cleanup();

			// Reduced motion mode
			mockReducedMotion.value = true;
			const { container: c2 } = render(<SuccessIcon />);
			expect(c2.querySelector("div")).toHaveClass("bg-primary/10");
		});
	});
});
