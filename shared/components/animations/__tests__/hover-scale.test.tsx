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

import { HoverScale } from "../hover-scale";

describe("HoverScale", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	it("renders children inside m.div", () => {
		render(<HoverScale>Product card</HoverScale>);
		expect(screen.getByText("Product card")).toBeInTheDocument();
	});

	it("passes className to the wrapper", () => {
		const { container } = render(<HoverScale className="my-class">Content</HoverScale>);
		expect(container.firstChild).toHaveClass("my-class");
	});

	it("sets whileHover with default scale 1.02 and y -4 when reduced motion is off", () => {
		const { container } = render(<HoverScale>Content</HoverScale>);
		const whileHover = JSON.parse(
			(container.firstChild as Element).getAttribute("data-while-hover")!,
		);
		expect(whileHover.scale).toBe(1.02);
		expect(whileHover.y).toBe(-4);
	});

	it("sets whileHover with custom scale when provided", () => {
		const { container } = render(<HoverScale scale={1.05}>Content</HoverScale>);
		const whileHover = JSON.parse(
			(container.firstChild as Element).getAttribute("data-while-hover")!,
		);
		expect(whileHover.scale).toBe(1.05);
	});

	it("sets whileHover with custom y when provided", () => {
		const { container } = render(<HoverScale y={-8}>Content</HoverScale>);
		const whileHover = JSON.parse(
			(container.firstChild as Element).getAttribute("data-while-hover")!,
		);
		expect(whileHover.y).toBe(-8);
	});

	it("does not set whileHover when reduced motion is on", () => {
		mockReducedMotion.value = true;
		const { container } = render(<HoverScale>Content</HoverScale>);
		expect(container.firstChild).not.toHaveAttribute("data-while-hover");
	});

	it("shadow prop does not affect whileHover", () => {
		const { container: containerWithShadow } = render(
			<HoverScale shadow={true}>Content</HoverScale>,
		);
		const { container: containerNoShadow } = render(
			<HoverScale shadow={false}>Content</HoverScale>,
		);
		const whileHoverWith = JSON.parse(
			(containerWithShadow.firstChild as Element).getAttribute("data-while-hover")!,
		);
		const whileHoverWithout = JSON.parse(
			(containerNoShadow.firstChild as Element).getAttribute("data-while-hover")!,
		);
		expect(whileHoverWith).toEqual(whileHoverWithout);
	});

	it("does not set whileTap", () => {
		const { container } = render(<HoverScale>Content</HoverScale>);
		expect(container.firstChild).not.toHaveAttribute("data-while-tap");
	});

	it("renders content correctly when reduced motion is on", () => {
		mockReducedMotion.value = true;
		render(<HoverScale>Collection card</HoverScale>);
		expect(screen.getByText("Collection card")).toBeInTheDocument();
	});
});
