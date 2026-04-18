import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const { mockReducedMotion, mockTriggerHaptic } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
	mockTriggerHaptic: vi.fn(),
}));

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
						onTapStart,
						transition: _t,
						...props
					}: Record<string, unknown> & {
						children?: unknown;
						onTapStart?: (e: unknown) => void;
					},
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
							onPointerDown: onTapStart,
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

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockTriggerHaptic,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		duration: { normal: 0.2, slow: 0.3 },
		transform: { fadeY: 8, slideDistance: 24 },
		easing: { easeInOut: [0.25, 0.1, 0.25, 1], easeOut: [0, 0, 0.2, 1] },
	},
}));

import { Tap } from "../tap";

describe("Tap", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	it("renders children inside m.div", () => {
		render(<Tap>Click me</Tap>);
		expect(screen.getByText("Click me")).toBeInTheDocument();
	});

	it("passes className to the wrapper", () => {
		const { container } = render(<Tap className="my-class">Content</Tap>);
		expect(container.firstChild).toHaveClass("my-class");
	});

	it("does not force tabIndex on the wrapper (preserves child focus management)", () => {
		const { container } = render(<Tap>Content</Tap>);
		expect(container.firstChild).not.toHaveAttribute("tabindex");
	});

	it("forwards role prop", () => {
		const { container } = render(<Tap role="button">Content</Tap>);
		expect(container.firstChild).toHaveAttribute("role", "button");
	});

	it("sets whileTap with default scale 0.97 when reduced motion is off", () => {
		const { container } = render(<Tap>Content</Tap>);
		const whileTap = JSON.parse((container.firstChild as Element).getAttribute("data-while-tap")!);
		expect(whileTap.scale).toBe(0.97);
	});

	it("sets whileTap with custom scale when provided", () => {
		const { container } = render(<Tap scale={0.9}>Content</Tap>);
		const whileTap = JSON.parse((container.firstChild as Element).getAttribute("data-while-tap")!);
		expect(whileTap.scale).toBe(0.9);
	});

	it("does not set whileTap when reduced motion is on", () => {
		mockReducedMotion.value = true;
		const { container } = render(<Tap>Content</Tap>);
		expect(container.firstChild).not.toHaveAttribute("data-while-tap");
	});

	it("does not set whileHover", () => {
		const { container } = render(<Tap>Content</Tap>);
		expect(container.firstChild).not.toHaveAttribute("data-while-hover");
	});

	it("triggers haptic 'selection' on tap by default", () => {
		const { container } = render(<Tap>Content</Tap>);
		fireEvent.pointerDown(container.firstChild as Element);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		expect(mockTriggerHaptic).toHaveBeenCalledTimes(1);
	});

	it("triggers haptic with the custom pattern", () => {
		const { container } = render(<Tap haptic="medium">Content</Tap>);
		fireEvent.pointerDown(container.firstChild as Element);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
	});

	it("does not trigger haptic when haptic={false}", () => {
		const { container } = render(<Tap haptic={false}>Content</Tap>);
		fireEvent.pointerDown(container.firstChild as Element);
		expect(mockTriggerHaptic).not.toHaveBeenCalled();
	});
});
