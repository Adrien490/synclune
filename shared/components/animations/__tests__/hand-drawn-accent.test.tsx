import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

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
			path: fRef(
				(
					{
						initial: _initial,
						animate: _animate,
						transition: _transition,
						...props
					}: Record<string, unknown>,
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement("path", {
						ref,
						"data-animated": "true",
						...props,
					});
				},
			),
		},
		useInView: () => mockIsInView.value,
		useReducedMotion: () => mockReducedMotion.value,
	};
});

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { HandDrawnAccent, HandDrawnUnderline, HandDrawnCircle } from "../hand-drawn-accent";

describe("HandDrawnAccent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
		mockIsInView.value = true;
	});

	afterEach(cleanup);

	it("renders SVG with aria-hidden and focusable=false", () => {
		const { container } = render(<HandDrawnAccent />);
		const svg = container.querySelector("svg")!;
		expect(svg).toHaveAttribute("aria-hidden", "true");
		expect(svg).toHaveAttribute("focusable", "false");
	});

	it('variant="underline" uses viewBox "0 0 120 20"', () => {
		const { container } = render(<HandDrawnAccent variant="underline" />);
		const svg = container.querySelector("svg")!;
		expect(svg).toHaveAttribute("viewBox", "0 0 120 20");
		expect(svg).toHaveAttribute("width", "120");
		expect(svg).toHaveAttribute("height", "20");
	});

	it('variant="circle" uses viewBox "0 0 100 95"', () => {
		const { container } = render(<HandDrawnAccent variant="circle" />);
		const svg = container.querySelector("svg")!;
		expect(svg).toHaveAttribute("viewBox", "0 0 100 95");
	});

	it("custom width/height override defaults", () => {
		const { container } = render(<HandDrawnAccent width={200} height={50} />);
		const svg = container.querySelector("svg")!;
		expect(svg).toHaveAttribute("width", "200");
		expect(svg).toHaveAttribute("height", "50");
	});

	it("renders static <path> (not m.path) when reduced motion", () => {
		mockReducedMotion.value = true;
		const { container } = render(<HandDrawnAccent />);
		const path = container.querySelector("path")!;
		// Static path has no data-animated attribute
		expect(path).not.toHaveAttribute("data-animated");
	});

	it("star and heart variants use fill={color} with fillOpacity", () => {
		mockReducedMotion.value = true;
		const { container: starContainer } = render(<HandDrawnAccent variant="star" color="red" />);
		const starPath = starContainer.querySelector("path")!;
		expect(starPath).toHaveAttribute("fill", "red");
		expect(starPath.getAttribute("fill-opacity")).toBe("0.15");

		cleanup();

		const { container: heartContainer } = render(<HandDrawnAccent variant="heart" color="pink" />);
		const heartPath = heartContainer.querySelector("path")!;
		expect(heartPath).toHaveAttribute("fill", "pink");
	});

	it('underline and circle variants use fill="none"', () => {
		mockReducedMotion.value = true;
		const { container } = render(<HandDrawnAccent variant="underline" />);
		const path = container.querySelector("path")!;
		expect(path).toHaveAttribute("fill", "none");
	});

	it("className is forwarded to SVG", () => {
		const { container } = render(<HandDrawnAccent className="my-accent" />);
		const svg = container.querySelector("svg")!;
		expect(svg.className.baseVal).toContain("my-accent");
	});
});

describe("HandDrawnUnderline", () => {
	beforeEach(() => {
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	it('renders with variant="underline" and default primary color', () => {
		const { container } = render(<HandDrawnUnderline />);
		const svg = container.querySelector("svg")!;
		expect(svg).toHaveAttribute("viewBox", "0 0 120 20");
		// m.path rendered with animated attribute
		const path = container.querySelector("path")!;
		expect(path).toHaveAttribute("stroke", "var(--primary)");
	});
});

describe("HandDrawnCircle", () => {
	beforeEach(() => {
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	it('renders with variant="circle" and default secondary color', () => {
		const { container } = render(<HandDrawnCircle />);
		const svg = container.querySelector("svg")!;
		expect(svg).toHaveAttribute("viewBox", "0 0 100 95");
		const path = container.querySelector("path")!;
		expect(path).toHaveAttribute("stroke", "var(--secondary)");
	});
});
