import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { POLAROID_ILLUSTRATIONS } from "../polaroid-illustrations-map";
import { POLAROIDS } from "../polaroid-config";

afterEach(() => {
	cleanup();
});

describe("POLAROID_ILLUSTRATIONS", () => {
	it("expose une scène par polaroid configuré (mêmes clés que POLAROIDS)", () => {
		for (const p of POLAROIDS) {
			expect(POLAROID_ILLUSTRATIONS[p.id], `scène manquante pour "${p.id}"`).toBeDefined();
		}
	});

	it.each(Object.keys(POLAROID_ILLUSTRATIONS))(
		"scène %s : svg décoratif (aria-hidden) au pipeline doodle-draw scroll-driven",
		(id) => {
			const Illustration = POLAROID_ILLUSTRATIONS[id]!;
			const { container } = render(<Illustration />);

			const svg = container.querySelector("svg");
			expect(svg).not.toBeNull();
			expect(svg).toHaveAttribute("aria-hidden", "true");
			expect(svg).toHaveAttribute("focusable", "false");
			expect(svg).toHaveAttribute("viewBox", "0 0 120 90");

			// Chaque tracé est normalisé (pathLength) et dessiné au scroll
			const shapes = container.querySelectorAll("path, circle");
			expect(shapes.length).toBeGreaterThan(0);
			for (const shape of shapes) {
				expect(shape.getAttribute("pathLength")).toBe("100");
				expect(shape.getAttribute("class")).toContain("doodle-draw-scroll");
				expect((shape as SVGElement).style.getPropertyValue("--path-length")).toBe("100");
			}
		},
	);
});
