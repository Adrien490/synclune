import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion, mockIsInView } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
	mockIsInView: { value: true },
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
						initial: _i,
						animate: _a,
						transition: _t,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement("div", { ref, ...props }, children);
				},
			),
		},
		useReducedMotion: () => mockReducedMotion.value,
		useInView: () => mockIsInView.value,
	};
});

vi.mock("@/shared/utils/seeded-random", () => ({
	seededRandom: (seed: number) => Math.abs(Math.sin(seed)) % 1,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { BubbleDream } from "../bubble-dream";

// ============================================================================
// TESTS
// ============================================================================

describe("BubbleDream", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
		mockIsInView.value = true;
	});

	afterEach(cleanup);

	it("renders with aria-hidden='true'", () => {
		const { container } = render(<BubbleDream />);
		expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
	});

	it("has data-testid='bubble-dream'", () => {
		render(<BubbleDream />);
		expect(screen.getByTestId("bubble-dream")).toBeInTheDocument();
	});

	it("renders desktop container with class 'hidden md:contents'", () => {
		const { container } = render(<BubbleDream />);
		const root = container.firstChild as HTMLElement;
		const desktopContainer = root.querySelector(".hidden.md\\:contents");
		expect(desktopContainer).toBeInTheDocument();
	});

	it("renders mobile container with class 'contents md:hidden'", () => {
		const { container } = render(<BubbleDream />);
		const root = container.firstChild as HTMLElement;
		const mobileContainer = root.querySelector(".contents.md\\:hidden");
		expect(mobileContainer).toBeInTheDocument();
	});

	it("renders bubble elements when in view", () => {
		mockIsInView.value = true;
		render(<BubbleDream />);
		// m.div mocked to render as <div>, bubbles render as divs with absolute class
		const container = screen.getByTestId("bubble-dream");
		const bubbles = container.querySelectorAll(".absolute.rounded-full");
		expect(bubbles.length).toBeGreaterThan(0);
	});

	it("renders no bubble elements when not in view", () => {
		mockIsInView.value = false;
		render(<BubbleDream />);
		const container = screen.getByTestId("bubble-dream");
		// BubbleSet returns null when not in view — no bubble divs rendered
		const bubbles = container.querySelectorAll(".absolute.rounded-full");
		// The only absolute element present is the background gradient div, not bubble divs
		// Bubble divs have both absolute AND rounded-full classes; background div does not have rounded-full
		expect(bubbles.length).toBe(0);
	});

	it("passes custom className to the container", () => {
		const { container } = render(<BubbleDream className="my-bg-class" />);
		expect(container.firstChild).toHaveClass("my-bg-class");
	});

	it("sets --bubble-opacity CSS variable with default intensity 0.15", () => {
		const { container } = render(<BubbleDream />);
		const root = container.firstChild as HTMLElement;
		expect(root.style.getPropertyValue("--bubble-opacity")).toBe("0.15");
	});

	it("clamps intensity below 0.1 to 0.1", () => {
		const { container } = render(<BubbleDream intensity={0.01} />);
		const root = container.firstChild as HTMLElement;
		expect(root.style.getPropertyValue("--bubble-opacity")).toBe("0.1");
	});

	it("clamps intensity above 0.3 to 0.3", () => {
		const { container } = render(<BubbleDream intensity={0.99} />);
		const root = container.firstChild as HTMLElement;
		expect(root.style.getPropertyValue("--bubble-opacity")).toBe("0.3");
	});

	it("respects intensity within valid range (0.1 - 0.3)", () => {
		const { container } = render(<BubbleDream intensity={0.2} />);
		const root = container.firstChild as HTMLElement;
		expect(root.style.getPropertyValue("--bubble-opacity")).toBe("0.2");
	});

	it("renders the correct number of bubbles with custom count prop", () => {
		mockIsInView.value = true;
		const count = 5;
		render(<BubbleDream count={count} />);
		const container = screen.getByTestId("bubble-dream");
		// With count=5, both desktop and mobile BubbleSets produce 5 bubbles each
		const bubbles = container.querySelectorAll(".absolute.rounded-full");
		// 5 desktop + 5 mobile = 10 total bubble divs
		expect(bubbles.length).toBe(count * 2);
	});

	it("renders default 25 desktop and 15 mobile bubbles when no count specified", () => {
		mockIsInView.value = true;
		render(<BubbleDream />);
		const container = screen.getByTestId("bubble-dream");
		const bubbles = container.querySelectorAll(".absolute.rounded-full");
		// 25 desktop + 15 mobile = 40 total
		expect(bubbles.length).toBe(40);
	});

	it("renders without reduced motion flag by default", () => {
		mockReducedMotion.value = false;
		// Should render bubbles normally — presence of bubbles confirms non-reduced path
		mockIsInView.value = true;
		render(<BubbleDream count={3} />);
		const container = screen.getByTestId("bubble-dream");
		const bubbles = container.querySelectorAll(".absolute.rounded-full");
		expect(bubbles.length).toBe(6);
	});

	it("still renders bubbles under reduced motion (animation differs, elements still present)", () => {
		mockReducedMotion.value = true;
		mockIsInView.value = true;
		render(<BubbleDream count={3} />);
		const container = screen.getByTestId("bubble-dream");
		const bubbles = container.querySelectorAll(".absolute.rounded-full");
		// Reduced motion uses a fade animation but still renders elements
		expect(bubbles.length).toBe(6);
	});
});
