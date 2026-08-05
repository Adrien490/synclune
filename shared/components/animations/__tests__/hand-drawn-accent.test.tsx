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

	it('variant="underline" defaults to the medium stroke (viewBox "0 0 120 20")', () => {
		const { container } = render(<HandDrawnAccent variant="underline" />);
		const svg = container.querySelector("svg")!;
		expect(svg).toHaveAttribute("viewBox", "0 0 120 20");
		expect(svg).toHaveAttribute("width", "120");
		expect(svg).toHaveAttribute("height", "20");
	});

	it('length="s" and length="l" select the short and long strokes', () => {
		const { container: short } = render(<HandDrawnAccent length="s" />);
		expect(short.querySelector("svg")!).toHaveAttribute("viewBox", "0 0 60 12");

		cleanup();

		const { container: long } = render(<HandDrawnAccent length="l" />);
		expect(long.querySelector("svg")!).toHaveAttribute("viewBox", "0 0 176 16");
	});

	it('variant="circle" uses viewBox "0 0 100 95"', () => {
		const { container } = render(<HandDrawnAccent variant="circle" />);
		expect(container.querySelector("svg")!).toHaveAttribute("viewBox", "0 0 100 95");
	});

	it("derives the height from the native ratio when width is provided (no letterbox)", () => {
		// 96 sur le tracé m (120×20, ratio 6:1) → 16. L'ancien couple libre
		// width×height letterboxait l'encre (7 appelants payés, audit 2026-08-05).
		const { container } = render(<HandDrawnAccent width={96} />);
		const svg = container.querySelector("svg")!;
		expect(svg).toHaveAttribute("width", "96");
		expect(svg).toHaveAttribute("height", "16");
	});

	it("derives a non-integer height without rounding drift (130 on the l stroke)", () => {
		// 130 sur le tracé l (176×16) → 11.82 — arrondi à 2 décimales, stable SSR.
		const { container } = render(<HandDrawnAccent length="l" width={130} />);
		expect(container.querySelector("svg")!).toHaveAttribute("height", "11.82");
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
		// `delay` n'est accepté qu'avec inView={false} — en mode inview la timeline
		// view() ne lit pas --hand-delay (réglage fantôme, verrouillé par le type).
		const { container } = render(<HandDrawnAccent duration={0.5} inView={false} delay={0.15} />);
		const path = container.querySelector("path")!;
		expect(path.style.getPropertyValue("--hand-duration")).toBe("500ms");
		expect(path.style.getPropertyValue("--hand-delay")).toBe("150ms");
	});

	it("rejects delay without inView={false} at the type level", () => {
		// @ts-expect-error — delay est un réglage fantôme en mode inview (défaut).
		const invalid = <HandDrawnAccent delay={0.2} />;
		expect(invalid).toBeTruthy();
	});

	it("forwards className to the SVG", () => {
		const { container } = render(<HandDrawnAccent className="my-accent" />);
		expect(container.querySelector("svg")!.getAttribute("class")).toContain("my-accent");
	});
});

describe("HandDrawnUnderline", () => {
	it("renders the medium underline with the section-accent default (fallback primary)", () => {
		const { container } = render(<HandDrawnUnderline />);
		expect(container.querySelector("svg")!).toHaveAttribute("viewBox", "0 0 120 20");
		// Défaut cascadé : hérite de l'accent de section (data-accent), retombe sur le rose signature.
		expect(container.querySelector("path")!).toHaveAttribute(
			"stroke",
			"var(--section-accent, var(--primary))",
		);
	});
});
