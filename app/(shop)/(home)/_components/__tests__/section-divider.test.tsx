import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionDivider } from "../section-divider";

describe("SectionDivider", () => {
	it("renders a decorative svg (aria-hidden, non focusable)", () => {
		const { container } = render(<SectionDivider />);
		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();
		expect(svg).toHaveAttribute("aria-hidden", "true");
		expect(svg).toHaveAttribute("focusable", "false");
	});

	it("stroke inherits the section accent with primary fallback", () => {
		const { container } = render(<SectionDivider />);
		const path = container.querySelector("path");
		expect(path).toHaveAttribute("stroke", "var(--section-accent, var(--primary))");
	});

	it("uses the scroll-driven hand-draw pipeline (pathLength normalised)", () => {
		const { container } = render(<SectionDivider />);
		const path = container.querySelector("path")!;
		expect(path.getAttribute("class")).toContain("hand-draw-inview");
		expect(path).toHaveAttribute("pathLength", "1");
	});

	it("merges custom className on the svg", () => {
		const { container } = render(<SectionDivider className="my-extra" />);
		expect(container.querySelector("svg")!.getAttribute("class")).toContain("my-extra");
	});
});
