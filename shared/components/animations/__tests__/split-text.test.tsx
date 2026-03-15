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
			span: fRef(
				(
					{
						children,
						initial,
						animate,
						variants: _variants,
						transition: _transition,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement(
						"span",
						{
							ref,
							"data-initial": initial ? String(initial) : undefined,
							"data-animate": animate ? String(animate) : undefined,
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
		easing: { easeInOut: [0.25, 0.1, 0.25, 1] },
	},
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { SplitText } from "../split-text";

describe("SplitText", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	it('splits "Hello World" into 2 word spans', () => {
		render(<SplitText>Hello World</SplitText>);
		const ariaHiddenSpans = screen.getAllByText(/Hello|World/);
		expect(ariaHiddenSpans).toHaveLength(2);
	});

	it('splits "One Two Three" into 3 word spans', () => {
		render(<SplitText>One Two Three</SplitText>);
		// Each word is rendered with aria-hidden
		const spans = screen.getByRole("group").querySelectorAll("[aria-hidden='true']");
		expect(spans).toHaveLength(3);
	});

	it("each word span has aria-hidden=true", () => {
		render(<SplitText>Hello World</SplitText>);
		const group = screen.getByRole("group");
		const wordSpans = group.querySelectorAll("[aria-hidden='true']");
		wordSpans.forEach((span) => {
			expect(span).toHaveAttribute("aria-hidden", "true");
		});
	});

	it('container has role="group" and aria-label equal to text', () => {
		render(<SplitText>Hello World</SplitText>);
		const group = screen.getByRole("group");
		expect(group).toHaveAttribute("aria-label", "Hello World");
	});

	it("adds non-breaking space between words except the last", () => {
		render(<SplitText>A B C</SplitText>);
		const group = screen.getByRole("group");
		const wordSpans = group.querySelectorAll("[aria-hidden='true']");
		// First two words should contain \u00A0, last should not
		expect(wordSpans[0]!.textContent).toContain("\u00A0");
		expect(wordSpans[1]!.textContent).toContain("\u00A0");
		expect(wordSpans[2]!.textContent).not.toContain("\u00A0");
	});

	it('sets initial="visible" when reduced motion', () => {
		mockReducedMotion.value = true;
		const { container } = render(<SplitText>Hello</SplitText>);
		const outerSpan = container.firstChild as HTMLElement;
		expect(outerSpan.getAttribute("data-initial")).toBe("visible");
	});

	it('sets initial="hidden" when not reduced motion', () => {
		const { container } = render(<SplitText>Hello</SplitText>);
		const outerSpan = container.firstChild as HTMLElement;
		expect(outerSpan.getAttribute("data-initial")).toBe("hidden");
	});
});
