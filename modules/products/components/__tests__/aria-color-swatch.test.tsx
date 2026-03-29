import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ColorSwatch } from "../aria-color-swatch";

afterEach(cleanup);

describe("ColorSwatch (aria-color-swatch)", () => {
	it("renders without crashing", () => {
		render(<ColorSwatch color="hsl(0 0% 50%)" />);
		expect(screen.getByRole("img")).toBeInTheDocument();
	});

	it("applies the default className including size and rounded-full", () => {
		render(<ColorSwatch color="#ff0000" />);
		const swatch = screen.getByRole("img");
		expect(swatch.className).toContain("size-8");
		expect(swatch.className).toContain("rounded-full");
		expect(swatch.className).toContain("border");
	});

	it("merges additional className with defaults", () => {
		render(<ColorSwatch color="#ff0000" className="custom-class" />);
		const swatch = screen.getByRole("img");
		expect(swatch.className).toContain("custom-class");
	});

	it("passes aria-label to the underlying element", () => {
		render(<ColorSwatch color="#ff0000" aria-label="Rouge" />);
		const swatch = screen.getByRole("img");
		expect(swatch).toHaveAttribute("aria-label", "Rouge");
	});

	it("uses colorName as aria-label when aria-label is not provided", () => {
		render(<ColorSwatch color="#ff0000" colorName="Rouge vif" />);
		const swatch = screen.getByRole("img");
		expect(swatch).toHaveAttribute("aria-label", "Rouge vif");
	});

	it("prefers aria-label over colorName", () => {
		render(<ColorSwatch color="#ff0000" aria-label="Custom" colorName="Rouge" />);
		const swatch = screen.getByRole("img");
		expect(swatch).toHaveAttribute("aria-label", "Custom");
	});

	it("applies background style derived from color prop", () => {
		render(<ColorSwatch color="#aabbcc" />);
		const swatch = screen.getByRole("img");
		const styleAttr = swatch.getAttribute("style") ?? "";
		expect(styleAttr).toContain("linear-gradient");
	});

	it("renders with no aria-label when none is provided", () => {
		render(<ColorSwatch color="#aabbcc" />);
		const swatch = screen.getByRole("img");
		expect(swatch).not.toHaveAttribute("aria-label");
	});
});
