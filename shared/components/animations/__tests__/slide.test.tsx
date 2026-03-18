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
						whileInView,
						viewport: _vp,
						transition: _t,
						exit: _e,
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
							"data-while-in-view": whileInView ? JSON.stringify(whileInView) : undefined,
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

import { Slide } from "../slide";

describe("Slide", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	it("renders children inside m.div", () => {
		render(<Slide>Hello</Slide>);
		expect(screen.getByText("Hello")).toBeInTheDocument();
	});

	it("passes className to the wrapper", () => {
		const { container } = render(<Slide className="my-class">Content</Slide>);
		expect(container.firstChild).toHaveClass("my-class");
	});

	it("always sets animate to opacity:1, x:0, y:0", () => {
		const { container } = render(<Slide>Content</Slide>);
		const animate = JSON.parse((container.firstChild as Element).getAttribute("data-animate")!);
		expect(animate.opacity).toBe(1);
		expect(animate.x).toBe(0);
		expect(animate.y).toBe(0);
	});

	it("direction 'up' sets initial y to +distance and opacity:0", () => {
		const { container } = render(<Slide direction="up">Content</Slide>);
		const initial = JSON.parse((container.firstChild as Element).getAttribute("data-initial")!);
		expect(initial.opacity).toBe(0);
		expect(initial.y).toBe(24);
		expect(initial.x).toBeUndefined();
	});

	it("direction 'down' sets initial y to -distance and opacity:0", () => {
		const { container } = render(<Slide direction="down">Content</Slide>);
		const initial = JSON.parse((container.firstChild as Element).getAttribute("data-initial")!);
		expect(initial.opacity).toBe(0);
		expect(initial.y).toBe(-24);
		expect(initial.x).toBeUndefined();
	});

	it("direction 'left' sets initial x to +distance and opacity:0", () => {
		const { container } = render(<Slide direction="left">Content</Slide>);
		const initial = JSON.parse((container.firstChild as Element).getAttribute("data-initial")!);
		expect(initial.opacity).toBe(0);
		expect(initial.x).toBe(24);
		expect(initial.y).toBeUndefined();
	});

	it("direction 'right' sets initial x to -distance and opacity:0", () => {
		const { container } = render(<Slide direction="right">Content</Slide>);
		const initial = JSON.parse((container.firstChild as Element).getAttribute("data-initial")!);
		expect(initial.opacity).toBe(0);
		expect(initial.x).toBe(-24);
		expect(initial.y).toBeUndefined();
	});

	it("default direction is 'up'", () => {
		const { container } = render(<Slide>Content</Slide>);
		const initial = JSON.parse((container.firstChild as Element).getAttribute("data-initial")!);
		expect(initial.y).toBe(24);
	});

	it("respects custom distance prop", () => {
		const { container } = render(
			<Slide direction="up" distance={50}>
				Content
			</Slide>,
		);
		const initial = JSON.parse((container.firstChild as Element).getAttribute("data-initial")!);
		expect(initial.y).toBe(50);
	});

	it("sets initial to opacity:1, x:0, y:0 when reduced motion is on", () => {
		mockReducedMotion.value = true;
		const { container } = render(<Slide>Content</Slide>);
		const initial = JSON.parse((container.firstChild as Element).getAttribute("data-initial")!);
		expect(initial.opacity).toBe(1);
		expect(initial.x).toBe(0);
		expect(initial.y).toBe(0);
	});

	it("still sets animate when reduced motion is on", () => {
		mockReducedMotion.value = true;
		const { container } = render(<Slide>Content</Slide>);
		expect(container.firstChild).toHaveAttribute("data-animate");
	});

	it("does not use whileInView (always uses animate)", () => {
		const { container } = render(<Slide>Content</Slide>);
		expect(container.firstChild).not.toHaveAttribute("data-while-in-view");
		expect(container.firstChild).toHaveAttribute("data-animate");
	});

	it("renders correctly with reduced motion and direction 'right'", () => {
		mockReducedMotion.value = true;
		const { container } = render(<Slide direction="right">Content</Slide>);
		const initial = JSON.parse((container.firstChild as Element).getAttribute("data-initial")!);
		// Reduced motion overrides direction — always returns {opacity:1, x:0, y:0}
		expect(initial.opacity).toBe(1);
		expect(initial.x).toBe(0);
		expect(initial.y).toBe(0);
	});
});
