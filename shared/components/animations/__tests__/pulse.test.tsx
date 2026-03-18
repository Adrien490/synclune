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
						whileHover,
						whileTap,
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
							"data-while-hover": whileHover ? JSON.stringify(whileHover) : undefined,
							"data-while-tap": whileTap ? JSON.stringify(whileTap) : undefined,
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
		duration: { normal: 0.2, slow: 0.3 },
		transform: { fadeY: 8, slideDistance: 24 },
		easing: { easeInOut: [0.25, 0.1, 0.25, 1], easeOut: [0, 0, 0.2, 1] },
	},
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { Pulse } from "../pulse";

describe("Pulse", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	it("renders children inside m.div", () => {
		render(<Pulse>Badge</Pulse>);
		expect(screen.getByText("Badge")).toBeInTheDocument();
	});

	it("passes className to the wrapper", () => {
		const { container } = render(<Pulse className="my-class">Content</Pulse>);
		expect(container.firstChild).toHaveClass("my-class");
	});

	it("sets animate with default scale array [1, 1.1, 1] when reduced motion is off", () => {
		const { container } = render(<Pulse>Content</Pulse>);
		const animate = JSON.parse((container.firstChild as Element).getAttribute("data-animate")!);
		expect(animate.scale).toEqual([1, 1.1, 1]);
	});

	it("sets animate with custom scale in array when scale prop is provided", () => {
		const { container } = render(<Pulse scale={1.3}>Content</Pulse>);
		const animate = JSON.parse((container.firstChild as Element).getAttribute("data-animate")!);
		expect(animate.scale).toEqual([1, 1.3, 1]);
	});

	it("does not set animate when reduced motion is on", () => {
		mockReducedMotion.value = true;
		const { container } = render(<Pulse>Content</Pulse>);
		expect(container.firstChild).not.toHaveAttribute("data-animate");
	});

	it("does not set whileTap or whileHover", () => {
		const { container } = render(<Pulse>Content</Pulse>);
		expect(container.firstChild).not.toHaveAttribute("data-while-tap");
		expect(container.firstChild).not.toHaveAttribute("data-while-hover");
	});

	it("renders content correctly when reduced motion is on", () => {
		mockReducedMotion.value = true;
		render(<Pulse>Indicator</Pulse>);
		expect(screen.getByText("Indicator")).toBeInTheDocument();
	});
});
