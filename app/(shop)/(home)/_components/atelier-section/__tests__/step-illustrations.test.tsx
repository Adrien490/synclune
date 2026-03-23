import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import {
	AssemblyIllustration,
	DrawingIllustration,
	FinishingIllustration,
	IdeaIllustration,
	STEP_ILLUSTRATIONS,
} from "../step-illustrations";

afterEach(() => {
	cleanup();
});

describe("step-illustrations", () => {
	const illustrations = [
		{ name: "IdeaIllustration", Component: IdeaIllustration, id: "idea" },
		{ name: "DrawingIllustration", Component: DrawingIllustration, id: "drawing" },
		{ name: "AssemblyIllustration", Component: AssemblyIllustration, id: "assembly" },
		{ name: "FinishingIllustration", Component: FinishingIllustration, id: "finishing" },
	];

	describe.each(illustrations)("$name", ({ Component }) => {
		it("renders an SVG with aria-hidden and pointer-events-none", () => {
			const { container } = render(<Component />);
			const svg = container.querySelector("svg");

			expect(svg).not.toBeNull();
			expect(svg!.getAttribute("aria-hidden")).toBe("true");
			expect(svg!.getAttribute("class")).toContain("pointer-events-none");
		});

		it("has focusable=false for IE/Edge Legacy compatibility", () => {
			const { container } = render(<Component />);
			const svg = container.querySelector("svg");

			expect(svg!.getAttribute("focusable")).toBe("false");
		});

		it("has viewBox 0 0 48 48", () => {
			const { container } = render(<Component />);
			const svg = container.querySelector("svg");

			expect(svg!.getAttribute("viewBox")).toBe("0 0 48 48");
		});

		it("all paths have doodle-draw animation classes", () => {
			const { container } = render(<Component />);
			const paths = container.querySelectorAll("path");

			expect(paths.length).toBeGreaterThan(0);
			for (const path of paths) {
				expect(path.getAttribute("class")).toContain("doodle-draw");
				expect(path.getAttribute("class")).toContain("doodle-draw-scroll");
			}
		});

		it("all paths have --path-length and --draw-delay custom properties", () => {
			const { container } = render(<Component />);
			const paths = container.querySelectorAll("path");

			for (const path of paths) {
				expect(path.style.getPropertyValue("--path-length")).not.toBe("");
				expect(path.style.getPropertyValue("--draw-delay")).not.toBe("");
			}
		});

		it("all paths use stroke=currentColor and fill=none", () => {
			const { container } = render(<Component />);
			const paths = container.querySelectorAll("path");

			for (const path of paths) {
				expect(path.getAttribute("stroke")).toBe("currentColor");
				expect(path.getAttribute("fill")).toBe("none");
			}
		});

		it("passes className to the SVG element", () => {
			const { container } = render(<Component className="custom-class" />);
			const svg = container.querySelector("svg");

			expect(svg!.getAttribute("class")).toContain("custom-class");
		});
	});

	describe("STEP_ILLUSTRATIONS map", () => {
		it("maps all 4 step IDs to their components", () => {
			expect(Object.keys(STEP_ILLUSTRATIONS)).toEqual(["idea", "drawing", "assembly", "finishing"]);
		});

		it("idea maps to IdeaIllustration", () => {
			expect(STEP_ILLUSTRATIONS.idea).toBe(IdeaIllustration);
		});

		it("drawing maps to DrawingIllustration", () => {
			expect(STEP_ILLUSTRATIONS.drawing).toBe(DrawingIllustration);
		});

		it("assembly maps to AssemblyIllustration", () => {
			expect(STEP_ILLUSTRATIONS.assembly).toBe(AssemblyIllustration);
		});

		it("finishing maps to FinishingIllustration", () => {
			expect(STEP_ILLUSTRATIONS.finishing).toBe(FinishingIllustration);
		});
	});

	describe("draw delay staggering", () => {
		it("first path of each illustration starts at 0s delay", () => {
			for (const { Component } of illustrations) {
				const { container, unmount } = render(<Component />);
				const firstPath = container.querySelector("path");

				expect(firstPath!.style.getPropertyValue("--draw-delay")).toBe("0s");
				unmount();
			}
		});
	});
});
