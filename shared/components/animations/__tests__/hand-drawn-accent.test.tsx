import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { HandDrawnAccent, HandDrawnUnderline } from "../hand-drawn-accent";

// HandDrawnAccent is now a universal component: the SVG <path> draws via the
// CSS `hand-draw` keyframe (stroke-dashoffset), with `pathLength="1"` so no JS
// measurement is needed. No motion-react, nothing to mock.

afterEach(cleanup);

describe("HandDrawnAccent", () => {
	it("renders an SVG with aria-hidden and focusable=false", () => {
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
		expect(container.querySelector("svg")!).toHaveAttribute("viewBox", "0 0 100 95");
	});

	it("custom width/height override the variant defaults", () => {
		const { container } = render(<HandDrawnAccent width={200} height={50} />);
		const svg = container.querySelector("svg")!;
		expect(svg).toHaveAttribute("width", "200");
		expect(svg).toHaveAttribute("height", "50");
	});

	it("normalises the path length via pathLength=1 (no JS measurement)", () => {
		const { container } = render(<HandDrawnAccent />);
		expect(container.querySelector("path")!).toHaveAttribute("pathLength", "1");
	});

	it("uses the .hand-draw-inview class by default (inView defaults to true)", () => {
		const { container } = render(<HandDrawnAccent />);
		expect(container.querySelector("path")!.getAttribute("class")).toBe("hand-draw-inview");
	});

	it("uses the .hand-draw-load class when inView is false", () => {
		const { container } = render(<HandDrawnAccent inView={false} />);
		expect(container.querySelector("path")!.getAttribute("class")).toBe("hand-draw-load");
	});

	it("star/heart variants fill with the color and set --hand-fill-opacity", () => {
		const { container: starContainer } = render(<HandDrawnAccent variant="star" color="red" />);
		const starPath = starContainer.querySelector("path")!;
		expect(starPath).toHaveAttribute("fill", "red");
		expect(starPath.style.getPropertyValue("--hand-fill-opacity")).toBe("0.15");

		cleanup();

		const { container: heartContainer } = render(<HandDrawnAccent variant="heart" color="pink" />);
		expect(heartContainer.querySelector("path")!).toHaveAttribute("fill", "pink");
	});

	it('underline/circle variants use fill="none" and a zero fill opacity', () => {
		const { container } = render(<HandDrawnAccent variant="underline" />);
		const path = container.querySelector("path")!;
		expect(path).toHaveAttribute("fill", "none");
		expect(path.style.getPropertyValue("--hand-fill-opacity")).toBe("0");
	});

	it("converts duration + delay (seconds) to millisecond custom properties", () => {
		const { container } = render(<HandDrawnAccent duration={0.5} delay={0.15} />);
		const path = container.querySelector("path")!;
		expect(path.style.getPropertyValue("--hand-duration")).toBe("500ms");
		expect(path.style.getPropertyValue("--hand-delay")).toBe("150ms");
	});

	it("forwards className to the SVG", () => {
		const { container } = render(<HandDrawnAccent className="my-accent" />);
		expect(container.querySelector("svg")!.getAttribute("class")).toContain("my-accent");
	});
});

describe("HandDrawnUnderline", () => {
	it('renders with variant="underline" and the section-accent default (fallback primary)', () => {
		const { container } = render(<HandDrawnUnderline />);
		expect(container.querySelector("svg")!).toHaveAttribute("viewBox", "0 0 120 20");
		// Défaut cascadé : hérite de l'accent de section (data-accent), retombe sur le rose signature.
		expect(container.querySelector("path")!).toHaveAttribute(
			"stroke",
			"var(--section-accent, var(--primary))",
		);
	});
});
