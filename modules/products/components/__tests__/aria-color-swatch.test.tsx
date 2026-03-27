import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Mock react-aria-components ColorSwatch — renders a plain div
vi.mock("react-aria-components", () => ({
	ColorSwatch: ({
		className,
		style,
		"aria-label": ariaLabel,
		color,
		...rest
	}: {
		className?: string | ((renderProps: unknown) => string);
		style?: ((renderProps: { color: string }) => React.CSSProperties) | React.CSSProperties;
		"aria-label"?: string;
		color?: string;
		[key: string]: unknown;
	}) => {
		const resolvedClass = typeof className === "function" ? className({}) : className;
		const resolvedStyle = typeof style === "function" ? style({ color: color ?? "#000" }) : style;
		return (
			<div
				data-testid="color-swatch"
				className={resolvedClass}
				style={resolvedStyle}
				aria-label={ariaLabel}
				{...rest}
			/>
		);
	},
}));

// Mock composeTailwindRenderProps — returns static class combination
vi.mock("@/shared/lib/react-aria-utils", () => ({
	composeTailwindRenderProps: (base: unknown, extra: string) =>
		[base, extra].filter(Boolean).join(" "),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { ColorSwatch } from "../aria-color-swatch";

afterEach(cleanup);

describe("ColorSwatch (aria-color-swatch)", () => {
	it("renders without crashing", () => {
		render(<ColorSwatch color="hsl(0 0% 50%)" />);
		expect(screen.getByTestId("color-swatch")).toBeInTheDocument();
	});

	it("applies the default className including size and rounded-full", () => {
		render(<ColorSwatch color="#ff0000" />);
		const swatch = screen.getByTestId("color-swatch");
		expect(swatch.className).toContain("size-8");
		expect(swatch.className).toContain("rounded-full");
		expect(swatch.className).toContain("border");
	});

	it("merges additional className with defaults", () => {
		render(<ColorSwatch color="#ff0000" className="custom-class" />);
		const swatch = screen.getByTestId("color-swatch");
		expect(swatch.className).toContain("custom-class");
		expect(swatch.className).toContain("size-8");
	});

	it("passes aria-label to the underlying element", () => {
		render(<ColorSwatch color="#ff0000" aria-label="Rouge" />);
		const swatch = screen.getByTestId("color-swatch");
		expect(swatch).toHaveAttribute("aria-label", "Rouge");
	});

	it("applies background style derived from color prop", () => {
		render(<ColorSwatch color="#aabbcc" />);
		const swatch = screen.getByTestId("color-swatch");
		// The style function uses the color to build a linear-gradient background
		const styleAttr = swatch.getAttribute("style") ?? "";
		expect(styleAttr).toContain("linear-gradient");
	});

	it("renders with no aria-label when none is provided", () => {
		render(<ColorSwatch color="#aabbcc" />);
		const swatch = screen.getByTestId("color-swatch");
		expect(swatch).not.toHaveAttribute("aria-label");
	});
});
