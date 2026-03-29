import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { FaqDoodles } from "../faq-doodles";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("FaqDoodles", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders without crashing", () => {
		expect(() => render(<FaqDoodles />)).not.toThrow();
	});

	it("renders two SVG doodles", () => {
		const { container } = render(<FaqDoodles />);
		const svgs = container.querySelectorAll("svg");
		expect(svgs).toHaveLength(2);
	});

	// ─── Accessibility ────────────────────────────────────────────────────────

	it("all doodle SVGs are aria-hidden (decorative only)", () => {
		const { container } = render(<FaqDoodles />);
		const svgs = container.querySelectorAll("svg");
		svgs.forEach((svg) => {
			expect(svg).toHaveAttribute("aria-hidden", "true");
		});
	});

	// ─── Pointer events ───────────────────────────────────────────────────────

	it("SVGs have pointer-events-none class", () => {
		const { container } = render(<FaqDoodles />);
		const svgs = container.querySelectorAll("svg");
		svgs.forEach((svg) => {
			// SVGAnimatedString: use getAttribute for class checks
			expect(svg.getAttribute("class")).toContain("pointer-events-none");
		});
	});

	// ─── SVG paths ────────────────────────────────────────────────────────────

	it("renders paths inside each SVG", () => {
		const { container } = render(<FaqDoodles />);
		const paths = container.querySelectorAll("svg path");
		expect(paths.length).toBeGreaterThanOrEqual(2);
	});

	// ─── Desktop-only visibility ──────────────────────────────────────────────

	it("heart doodle has desktop-only class (hidden by default)", () => {
		const { container } = render(<FaqDoodles />);
		const svgs = container.querySelectorAll("svg");
		// First SVG is the heart
		expect(svgs[0]?.getAttribute("class")).toContain("hidden");
		expect(svgs[0]?.getAttribute("class")).toContain("lg:block");
	});

	it("star doodle has desktop-only class (hidden by default)", () => {
		const { container } = render(<FaqDoodles />);
		const svgs = container.querySelectorAll("svg");
		// Second SVG is the star
		expect(svgs[1]?.getAttribute("class")).toContain("hidden");
		expect(svgs[1]?.getAttribute("class")).toContain("lg:block");
	});

	// ─── Doodle animation class ───────────────────────────────────────────────

	it("paths have doodle-draw class for CSS animation", () => {
		const { container } = render(<FaqDoodles />);
		const paths = container.querySelectorAll("path.doodle-draw");
		expect(paths.length).toBeGreaterThanOrEqual(2);
	});

	// ─── CSS custom properties for animation ─────────────────────────────────

	it("paths have --draw-delay CSS custom property", () => {
		const { container } = render(<FaqDoodles />);
		const paths = container.querySelectorAll("path.doodle-draw");
		paths.forEach((path) => {
			const style = (path as HTMLElement).style;
			expect(style.getPropertyValue("--draw-delay")).toBeTruthy();
		});
	});
});
