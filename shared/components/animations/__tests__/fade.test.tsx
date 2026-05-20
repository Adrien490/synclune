import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { Fade } from "../fade";

// Fade is now a universal component driven entirely by CSS (`entrance-fade`
// keyframe) — no motion-react, no hooks, nothing to mock.

afterEach(cleanup);

describe("Fade", () => {
	it("renders children", () => {
		render(<Fade>Hello</Fade>);
		expect(screen.getByText("Hello")).toBeInTheDocument();
	});

	it("passes className to the wrapper", () => {
		const { container } = render(<Fade className="my-class">Content</Fade>);
		expect(container.firstChild).toHaveClass("my-class");
	});

	it("uses .enter-load when inView is false (default — runs on mount)", () => {
		const { container } = render(<Fade>Content</Fade>);
		expect(container.firstChild).toHaveClass("enter-load");
		expect(container.firstChild).not.toHaveClass("enter-inview");
	});

	it("uses .enter-inview when inView is true (scroll-triggered)", () => {
		const { container } = render(<Fade inView>Content</Fade>);
		expect(container.firstChild).toHaveClass("enter-inview");
		expect(container.firstChild).not.toHaveClass("enter-load");
	});

	it("sets the --enter-y custom property from the y prop", () => {
		const { container } = render(<Fade y={24}>Content</Fade>);
		expect((container.firstChild as HTMLElement).style.getPropertyValue("--enter-y")).toBe("24px");
	});

	it("converts duration + delay (seconds) to millisecond custom properties", () => {
		const { container } = render(
			<Fade duration={0.6} delay={0.3}>
				Content
			</Fade>,
		);
		const el = container.firstChild as HTMLElement;
		expect(el.style.getPropertyValue("--enter-duration")).toBe("600ms");
		expect(el.style.getPropertyValue("--enter-delay")).toBe("300ms");
	});

	it("accepts once + disableOnTouch without error (API-compat no-ops)", () => {
		const { container } = render(
			<Fade once disableOnTouch>
				Content
			</Fade>,
		);
		expect(container.firstChild).toHaveClass("enter-load");
		// No-op props must not leak to the DOM.
		expect(container.firstChild).not.toHaveAttribute("once");
		expect(container.firstChild).not.toHaveAttribute("disableOnTouch");
	});
});
