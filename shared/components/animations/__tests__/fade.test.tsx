import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion, mockIsTouchDevice } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
	mockIsTouchDevice: { value: false },
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
						exit: _exit,
						transition: _transition,
						viewport: _viewport,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement(
						"div",
						{
							ref,
							"data-initial": JSON.stringify(initial),
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

vi.mock("@/shared/hooks", () => ({
	useIsTouchDevice: () => mockIsTouchDevice.value,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		duration: { normal: 0.2 },
		transform: { fadeY: 8 },
		easing: { easeInOut: [0.25, 0.1, 0.25, 1] },
	},
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { Fade } from "../fade";

describe("Fade", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
		mockIsTouchDevice.value = false;
	});

	afterEach(cleanup);

	it("renders children inside m.div", () => {
		render(<Fade>Hello</Fade>);
		expect(screen.getByText("Hello")).toBeInTheDocument();
	});

	it("passes className to the wrapper", () => {
		const { container } = render(<Fade className="my-class">Content</Fade>);
		expect(container.firstChild).toHaveClass("my-class");
	});

	it("renders plain <div> when disableOnTouch + touch device", () => {
		mockIsTouchDevice.value = true;
		const { container } = render(<Fade disableOnTouch>Content</Fade>);
		// Plain div has no data-initial attribute (not m.div)
		expect(container.firstChild).not.toHaveAttribute("data-initial");
		expect(screen.getByText("Content")).toBeInTheDocument();
	});

	it("renders m.div when disableOnTouch=false + touch device", () => {
		mockIsTouchDevice.value = true;
		const { container } = render(<Fade disableOnTouch={false}>Content</Fade>);
		expect(container.firstChild).toHaveAttribute("data-initial");
	});

	it("uses whileInView when inView=true", () => {
		const { container } = render(<Fade inView>Content</Fade>);
		expect(container.firstChild).toHaveAttribute("data-while-in-view");
		expect(container.firstChild).not.toHaveAttribute("data-animate");
	});

	it("uses animate when inView=false", () => {
		const { container } = render(<Fade>Content</Fade>);
		expect(container.firstChild).toHaveAttribute("data-animate");
		expect(container.firstChild).not.toHaveAttribute("data-while-in-view");
	});

	it("sets opacity:1 in initial when reduced motion is on", () => {
		mockReducedMotion.value = true;
		const { container } = render(<Fade>Content</Fade>);
		const initial = JSON.parse((container.firstChild as Element).getAttribute("data-initial")!);
		expect(initial.opacity).toBe(1);
	});

	it("sets opacity:0 in initial when reduced motion is off", () => {
		const { container } = render(<Fade>Content</Fade>);
		const initial = JSON.parse((container.firstChild as Element).getAttribute("data-initial")!);
		expect(initial.opacity).toBe(0);
	});
});
