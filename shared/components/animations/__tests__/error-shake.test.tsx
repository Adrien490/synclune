import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion, capturedOnAnimationComplete } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
	capturedOnAnimationComplete: { fn: undefined as (() => void) | undefined },
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
						onAnimationComplete,
						...props
					}: Record<string, unknown> & {
						children?: unknown;
						onAnimationComplete?: () => void;
					},
					ref: unknown,
				) => {
					const { createElement } = require("react");
					capturedOnAnimationComplete.fn = onAnimationComplete;
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

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		(args as (string | boolean | null | undefined)[]).filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { ErrorShake } from "../error-shake";

describe("ErrorShake", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
		capturedOnAnimationComplete.fn = undefined;
	});

	afterEach(cleanup);

	it("renders children inside m.div", () => {
		render(<ErrorShake shake={false}>Form field</ErrorShake>);
		expect(screen.getByText("Form field")).toBeInTheDocument();
	});

	it("passes className to the wrapper", () => {
		const { container } = render(
			<ErrorShake shake={false} className="my-class">
				Content
			</ErrorShake>,
		);
		expect(container.firstChild).toHaveClass("my-class");
	});

	it("sets animate with x array when shake=true and reduced motion is off", () => {
		const { container } = render(<ErrorShake shake={true}>Content</ErrorShake>);
		const animate = JSON.parse((container.firstChild as Element).getAttribute("data-animate")!);
		expect(animate.x).toEqual([0, -10, 10, -10, 10, 0]);
	});

	it("sets animate with x array using custom intensity when shake=true", () => {
		const { container } = render(
			<ErrorShake shake={true} intensity={5}>
				Content
			</ErrorShake>,
		);
		const animate = JSON.parse((container.firstChild as Element).getAttribute("data-animate")!);
		expect(animate.x).toEqual([0, -5, 5, -5, 5, 0]);
	});

	it("sets animate to {x: 0} when shake=false", () => {
		const { container } = render(<ErrorShake shake={false}>Content</ErrorShake>);
		const animate = JSON.parse((container.firstChild as Element).getAttribute("data-animate")!);
		expect(animate).toEqual({ x: 0 });
	});

	it("sets animate to {x: 0} when shake=true and reduced motion is on", () => {
		mockReducedMotion.value = true;
		const { container } = render(<ErrorShake shake={true}>Content</ErrorShake>);
		const animate = JSON.parse((container.firstChild as Element).getAttribute("data-animate")!);
		expect(animate).toEqual({ x: 0 });
	});

	it("adds outline flash class when shake=true and reduced motion is on", () => {
		mockReducedMotion.value = true;
		const { container } = render(<ErrorShake shake={true}>Content</ErrorShake>);
		expect(container.firstChild).toHaveClass("outline-destructive");
		expect(container.firstChild).toHaveClass("rounded");
		expect(container.firstChild).toHaveClass("outline-2");
		expect(container.firstChild).toHaveClass("outline-offset-2");
	});

	it("does not add outline flash class when shake=false and reduced motion is on", () => {
		mockReducedMotion.value = true;
		const { container } = render(<ErrorShake shake={false}>Content</ErrorShake>);
		expect(container.firstChild).not.toHaveClass("outline-destructive");
	});

	it("does not add outline flash class when shake=true and reduced motion is off", () => {
		mockReducedMotion.value = false;
		const { container } = render(<ErrorShake shake={true}>Content</ErrorShake>);
		expect(container.firstChild).not.toHaveClass("outline-destructive");
	});

	it("calls onShakeComplete via onAnimationComplete when shake=true", () => {
		const onShakeComplete = vi.fn();
		render(
			<ErrorShake shake={true} onShakeComplete={onShakeComplete}>
				Content
			</ErrorShake>,
		);
		capturedOnAnimationComplete.fn?.();
		expect(onShakeComplete).toHaveBeenCalledOnce();
	});

	it("does not call onShakeComplete via onAnimationComplete when shake=false", () => {
		const onShakeComplete = vi.fn();
		render(
			<ErrorShake shake={false} onShakeComplete={onShakeComplete}>
				Content
			</ErrorShake>,
		);
		capturedOnAnimationComplete.fn?.();
		expect(onShakeComplete).not.toHaveBeenCalled();
	});

	it("does not throw when onShakeComplete is not provided and shake=true", () => {
		render(<ErrorShake shake={true}>Content</ErrorShake>);
		expect(() => capturedOnAnimationComplete.fn?.()).not.toThrow();
	});

	it("always renders animate attribute (never undefined)", () => {
		const { container } = render(<ErrorShake shake={false}>Content</ErrorShake>);
		expect(container.firstChild).toHaveAttribute("data-animate");
	});
});
