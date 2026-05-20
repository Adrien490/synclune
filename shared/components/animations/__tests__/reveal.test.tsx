import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { Reveal } from "../reveal";

// Reveal is now a universal component — a plain <div> with `.enter-inview`,
// driven by the CSS `entrance-fade` keyframe via `animation-timeline: view()`.

afterEach(cleanup);

describe("Reveal", () => {
	it("renders children", () => {
		render(<Reveal>Hello</Reveal>);
		expect(screen.getByText("Hello")).toBeInTheDocument();
	});

	it("passes className to the wrapper", () => {
		const { container } = render(<Reveal className="my-class">Content</Reveal>);
		expect(container.firstChild).toHaveClass("my-class");
	});

	it("always uses .enter-inview (scroll-triggered)", () => {
		const { container } = render(<Reveal>Content</Reveal>);
		expect(container.firstChild).toHaveClass("enter-inview");
	});

	it("forwards the role prop", () => {
		const { container } = render(<Reveal role="region">Content</Reveal>);
		expect(container.firstChild).toHaveAttribute("role", "region");
	});

	it("sets the --enter-y custom property from the y prop", () => {
		const { container } = render(<Reveal y={20}>Content</Reveal>);
		expect((container.firstChild as HTMLElement).style.getPropertyValue("--enter-y")).toBe("20px");
	});

	it("forwards data-* attributes to the wrapper", () => {
		const { container } = render(<Reveal data-testid="reveal-x">Content</Reveal>);
		expect(container.firstChild).toHaveAttribute("data-testid", "reveal-x");
	});

	it("does not leak no-op props (delay/once/amount/disableOnTouch) to the DOM", () => {
		const { container } = render(
			<Reveal delay={0.5} once amount={0.5} disableOnTouch>
				Content
			</Reveal>,
		);
		const el = container.firstChild as HTMLElement;
		expect(el).not.toHaveAttribute("delay");
		expect(el).not.toHaveAttribute("once");
		expect(el).not.toHaveAttribute("amount");
		expect(el).not.toHaveAttribute("disableOnTouch");
	});
});
