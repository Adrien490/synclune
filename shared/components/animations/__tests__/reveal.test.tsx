import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion, mockIsTouchDevice, mockMounted } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
	mockIsTouchDevice: { value: false },
	mockMounted: { value: true },
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

vi.mock("@/shared/hooks", () => ({
	useIsTouchDevice: () => mockIsTouchDevice.value,
	useMounted: () => mockMounted.value,
}));

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

import { Reveal } from "../reveal";

describe("Reveal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
		mockIsTouchDevice.value = false;
		mockMounted.value = true;
	});

	afterEach(cleanup);

	it("renders children inside m.div", () => {
		render(<Reveal>Hello</Reveal>);
		expect(screen.getByText("Hello")).toBeInTheDocument();
	});

	it("passes className to the wrapper", () => {
		const { container } = render(<Reveal className="my-class">Content</Reveal>);
		expect(container.firstChild).toHaveClass("my-class");
	});

	it("forwards role prop to the wrapper", () => {
		const { container } = render(<Reveal role="region">Content</Reveal>);
		expect(container.firstChild).toHaveAttribute("role", "region");
	});

	it("uses whileInView animation props when mounted and no reduced motion", () => {
		const { container } = render(<Reveal>Content</Reveal>);
		expect(container.firstChild).toHaveAttribute("data-initial");
		expect(container.firstChild).toHaveAttribute("data-while-in-view");
		expect(container.firstChild).not.toHaveAttribute("data-animate");
	});

	it("sets initial opacity:0 and y offset from MOTION_CONFIG", () => {
		const { container } = render(<Reveal>Content</Reveal>);
		const initial = JSON.parse((container.firstChild as Element).getAttribute("data-initial")!);
		expect(initial.opacity).toBe(0);
		expect(initial.y).toBe(8);
	});

	it("sets custom y offset via prop", () => {
		const { container } = render(<Reveal y={20}>Content</Reveal>);
		const initial = JSON.parse((container.firstChild as Element).getAttribute("data-initial")!);
		expect(initial.y).toBe(20);
	});

	it("sets whileInView to opacity:1 and y:0", () => {
		const { container } = render(<Reveal>Content</Reveal>);
		const whileInView = JSON.parse(
			(container.firstChild as Element).getAttribute("data-while-in-view")!,
		);
		expect(whileInView.opacity).toBe(1);
		expect(whileInView.y).toBe(0);
	});

	it("renders without animation props when reduced motion is on (client-side)", () => {
		mockMounted.value = true;
		mockReducedMotion.value = true;
		const { container } = render(<Reveal>Content</Reveal>);
		expect(container.firstChild).not.toHaveAttribute("data-initial");
		expect(container.firstChild).not.toHaveAttribute("data-while-in-view");
		expect(screen.getByText("Content")).toBeInTheDocument();
	});

	it("renders WITH animation props when reduced motion is on but not yet mounted (SSR hydration)", () => {
		mockMounted.value = false;
		mockReducedMotion.value = true;
		const { container } = render(<Reveal>Content</Reveal>);
		// shouldReduceMotion = isClient && prefersReducedMotion = false && true = false
		expect(container.firstChild).toHaveAttribute("data-initial");
		expect(container.firstChild).toHaveAttribute("data-while-in-view");
	});

	it("renders without animation props when disableOnTouch + touch device", () => {
		mockIsTouchDevice.value = true;
		const { container } = render(<Reveal disableOnTouch>Content</Reveal>);
		expect(container.firstChild).not.toHaveAttribute("data-initial");
		expect(container.firstChild).not.toHaveAttribute("data-while-in-view");
		expect(screen.getByText("Content")).toBeInTheDocument();
	});

	it("renders WITH animation props when disableOnTouch=false and touch device", () => {
		mockIsTouchDevice.value = true;
		const { container } = render(<Reveal disableOnTouch={false}>Content</Reveal>);
		expect(container.firstChild).toHaveAttribute("data-initial");
		expect(container.firstChild).toHaveAttribute("data-while-in-view");
	});

	it("renders WITH animation props when disableOnTouch=true but non-touch device", () => {
		mockIsTouchDevice.value = false;
		const { container } = render(<Reveal disableOnTouch>Content</Reveal>);
		expect(container.firstChild).toHaveAttribute("data-initial");
		expect(container.firstChild).toHaveAttribute("data-while-in-view");
	});

	it("does not suppress animation when disableOnTouch is not set and touch device", () => {
		mockIsTouchDevice.value = true;
		const { container } = render(<Reveal>Content</Reveal>);
		// disableOnTouch defaults to false, so touch device alone does not skip animation
		expect(container.firstChild).toHaveAttribute("data-initial");
	});
});
