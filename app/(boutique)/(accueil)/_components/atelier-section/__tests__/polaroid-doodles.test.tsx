import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ---------------------------------------------------------------------------

afterEach(() => {
	cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PolaroidDoodles", () => {
	let PolaroidDoodles: React.ComponentType;

	beforeAll(async () => {
		({ PolaroidDoodles } = await import("../polaroid-doodles"));
	});

	it("renders 5 SVG doodle elements", () => {
		const { container } = render(<PolaroidDoodles />);

		const svgs = container.querySelectorAll("svg");
		expect(svgs).toHaveLength(5);
	});

	it("all SVGs have aria-hidden=true", () => {
		const { container } = render(<PolaroidDoodles />);

		const svgs = container.querySelectorAll("svg");
		svgs.forEach((svg) => {
			expect(svg.getAttribute("aria-hidden")).toBe("true");
		});
	});

	it("all paths have doodle-draw and doodle-draw-scroll classes", () => {
		const { container } = render(<PolaroidDoodles />);

		const paths = container.querySelectorAll("path");
		expect(paths.length).toBeGreaterThan(0);
		paths.forEach((path) => {
			expect(path.classList.contains("doodle-draw")).toBe(true);
			expect(path.classList.contains("doodle-draw-scroll")).toBe(true);
		});
	});

	it("renders 2 heart doodles", () => {
		const { container } = render(<PolaroidDoodles />);

		const paths = container.querySelectorAll("path");
		const heartPaths = Array.from(paths).filter((p) => p.getAttribute("d")?.startsWith("M25 45"));
		expect(heartPaths).toHaveLength(2);
	});

	it("renders 1 arrow doodle (path has fill='none')", () => {
		const { container } = render(<PolaroidDoodles />);

		const paths = container.querySelectorAll("path");
		const arrowPaths = Array.from(paths).filter((p) => p.getAttribute("fill") === "none");
		expect(arrowPaths).toHaveLength(1);
	});

	it("renders 2 star doodles", () => {
		const { container } = render(<PolaroidDoodles />);

		const paths = container.querySelectorAll("path");
		const starPaths = Array.from(paths).filter((p) => p.getAttribute("d")?.startsWith("M25 2"));
		expect(starPaths).toHaveLength(2);
	});

	it("all SVGs have pointer-events-none class", () => {
		const { container } = render(<PolaroidDoodles />);

		const svgs = container.querySelectorAll("svg");
		svgs.forEach((svg) => {
			expect(svg.classList.contains("pointer-events-none")).toBe(true);
		});
	});

	it("each path has --draw-delay custom property set", () => {
		const { container } = render(<PolaroidDoodles />);

		const paths = container.querySelectorAll("path");
		paths.forEach((path) => {
			const style = path.getAttribute("style") ?? "";
			expect(style).toContain("--draw-delay");
		});
	});

	it("each path has --path-length custom property set", () => {
		const { container } = render(<PolaroidDoodles />);

		const paths = container.querySelectorAll("path");
		paths.forEach((path) => {
			const style = path.getAttribute("style") ?? "";
			expect(style).toContain("--path-length");
		});
	});
});
