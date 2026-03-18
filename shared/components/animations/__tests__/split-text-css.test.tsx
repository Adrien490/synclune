import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { SplitTextCSS } from "../split-text-css";

describe("SplitTextCSS", () => {
	afterEach(cleanup);

	it("renders all words from the children string", () => {
		render(<SplitTextCSS>Hello world test</SplitTextCSS>);
		expect(screen.getByText("Hello")).toBeInTheDocument();
		expect(screen.getByText((content) => content.startsWith("world"))).toBeInTheDocument();
		expect(screen.getByText((content) => content.startsWith("test"))).toBeInTheDocument();
	});

	it("sets aria-label on the outer span equal to the full children string", () => {
		const { container } = render(<SplitTextCSS>Hello world</SplitTextCSS>);
		expect(container.firstChild).toHaveAttribute("aria-label", "Hello world");
	});

	it("sets role='group' on the outer span", () => {
		const { container } = render(<SplitTextCSS>Hello world</SplitTextCSS>);
		expect(container.firstChild).toHaveAttribute("role", "group");
	});

	it("passes className to the outer span", () => {
		const { container } = render(<SplitTextCSS className="hero-title">Hello world</SplitTextCSS>);
		expect(container.firstChild).toHaveClass("hero-title");
	});

	it("renders correct number of word spans", () => {
		const { container } = render(<SplitTextCSS>one two three four</SplitTextCSS>);
		const wordSpans = container.firstChild!.childNodes;
		expect(wordSpans).toHaveLength(4);
	});

	it("each word span has aria-hidden='true'", () => {
		const { container } = render(<SplitTextCSS>Hello world</SplitTextCSS>);
		const spans = container.firstChild!.childNodes;
		spans.forEach((span) => {
			expect(span as Element).toHaveAttribute("aria-hidden", "true");
		});
	});

	it("each word span has the animate-split-text-reveal and inline-block classes", () => {
		const { container } = render(<SplitTextCSS>Hello world</SplitTextCSS>);
		const spans = Array.from(container.firstChild!.childNodes) as HTMLElement[];
		spans.forEach((span) => {
			expect(span).toHaveClass("animate-split-text-reveal");
			expect(span).toHaveClass("inline-block");
		});
	});

	it("applies --i CSS custom property as the word index", () => {
		const { container } = render(<SplitTextCSS>alpha beta gamma</SplitTextCSS>);
		const spans = Array.from(container.firstChild!.childNodes) as HTMLElement[];
		expect(spans[0].style.getPropertyValue("--i")).toBe("0");
		expect(spans[1].style.getPropertyValue("--i")).toBe("1");
		expect(spans[2].style.getPropertyValue("--i")).toBe("2");
	});

	it("applies --stagger CSS custom property using default 80ms", () => {
		const { container } = render(<SplitTextCSS>Hello world</SplitTextCSS>);
		const spans = Array.from(container.firstChild!.childNodes) as HTMLElement[];
		spans.forEach((span) => {
			expect(span.style.getPropertyValue("--stagger")).toBe("80ms");
		});
	});

	it("applies --stagger CSS custom property using custom stagger value", () => {
		const { container } = render(<SplitTextCSS stagger={120}>Hello world</SplitTextCSS>);
		const spans = Array.from(container.firstChild!.childNodes) as HTMLElement[];
		spans.forEach((span) => {
			expect(span.style.getPropertyValue("--stagger")).toBe("120ms");
		});
	});

	it("appends non-breaking space after each word except the last", () => {
		const { container } = render(<SplitTextCSS>one two three</SplitTextCSS>);
		const spans = Array.from(container.firstChild!.childNodes) as HTMLElement[];
		// First and second word spans should contain a non-breaking space after the word text
		expect(spans[0].textContent).toBe("one\u00A0");
		expect(spans[1].textContent).toBe("two\u00A0");
		// Last word has no trailing non-breaking space
		expect(spans[2].textContent).toBe("three");
	});

	it("renders a single word without non-breaking space", () => {
		const { container } = render(<SplitTextCSS>Solo</SplitTextCSS>);
		const spans = Array.from(container.firstChild!.childNodes) as HTMLElement[];
		expect(spans).toHaveLength(1);
		expect(spans[0].textContent).toBe("Solo");
	});

	it("renders correctly with stagger=0", () => {
		const { container } = render(<SplitTextCSS stagger={0}>Hello world</SplitTextCSS>);
		const spans = Array.from(container.firstChild!.childNodes) as HTMLElement[];
		spans.forEach((span) => {
			expect(span.style.getPropertyValue("--stagger")).toBe("0ms");
		});
	});
});
