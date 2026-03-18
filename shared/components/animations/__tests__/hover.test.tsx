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

import { Hover } from "../hover";

describe("Hover", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	it("renders children inside m.div", () => {
		render(<Hover>Hover me</Hover>);
		expect(screen.getByText("Hover me")).toBeInTheDocument();
	});

	it("passes className to the wrapper", () => {
		const { container } = render(<Hover className="my-class">Content</Hover>);
		expect(container.firstChild).toHaveClass("my-class");
	});

	it("sets whileHover with default values when reduced motion is off", () => {
		const { container } = render(<Hover>Content</Hover>);
		const whileHover = JSON.parse(
			(container.firstChild as Element).getAttribute("data-while-hover")!,
		);
		expect(whileHover.scale).toBe(1.05);
		expect(whileHover.y).toBe(0);
		expect(whileHover.rotate).toBe(0);
		expect(whileHover.opacity).toBe(1);
	});

	it("sets whileHover with custom scale when provided", () => {
		const { container } = render(<Hover scale={1.2}>Content</Hover>);
		const whileHover = JSON.parse(
			(container.firstChild as Element).getAttribute("data-while-hover")!,
		);
		expect(whileHover.scale).toBe(1.2);
	});

	it("sets whileHover with custom y when provided", () => {
		const { container } = render(<Hover y={-8}>Content</Hover>);
		const whileHover = JSON.parse(
			(container.firstChild as Element).getAttribute("data-while-hover")!,
		);
		expect(whileHover.y).toBe(-8);
	});

	it("sets whileHover with custom rotate when provided", () => {
		const { container } = render(<Hover rotate={5}>Content</Hover>);
		const whileHover = JSON.parse(
			(container.firstChild as Element).getAttribute("data-while-hover")!,
		);
		expect(whileHover.rotate).toBe(5);
	});

	it("sets whileHover with custom opacity when provided", () => {
		const { container } = render(<Hover opacity={0.8}>Content</Hover>);
		const whileHover = JSON.parse(
			(container.firstChild as Element).getAttribute("data-while-hover")!,
		);
		expect(whileHover.opacity).toBe(0.8);
	});

	it("does not set whileHover when reduced motion is on", () => {
		mockReducedMotion.value = true;
		const { container } = render(<Hover>Content</Hover>);
		expect(container.firstChild).not.toHaveAttribute("data-while-hover");
	});

	it("does not set whileTap", () => {
		const { container } = render(<Hover>Content</Hover>);
		expect(container.firstChild).not.toHaveAttribute("data-while-tap");
	});

	it("renders content correctly when reduced motion is on", () => {
		mockReducedMotion.value = true;
		render(<Hover>Link text</Hover>);
		expect(screen.getByText("Link text")).toBeInTheDocument();
	});
});
