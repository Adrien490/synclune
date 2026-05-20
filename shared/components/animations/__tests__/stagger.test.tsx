import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { Stagger } from "../stagger";

// Stagger is now a universal component: the container is a plain <div> and
// each child is wrapped in a <div> driven by the CSS `entrance-fade` keyframe.

afterEach(cleanup);

describe("Stagger", () => {
	it("renders every child", () => {
		render(
			<Stagger>
				<span>A</span>
				<span>B</span>
				<span>C</span>
			</Stagger>,
		);
		expect(screen.getByText("A")).toBeInTheDocument();
		expect(screen.getByText("B")).toBeInTheDocument();
		expect(screen.getByText("C")).toBeInTheDocument();
	});

	it("wraps each child in one item div", () => {
		const { container } = render(
			<Stagger>
				<span>A</span>
				<span>B</span>
			</Stagger>,
		);
		expect(container.firstChild!.childNodes).toHaveLength(2);
	});

	it("wraps each child in .enter-load when inView is false (default)", () => {
		const { container } = render(
			<Stagger>
				<span>A</span>
				<span>B</span>
			</Stagger>,
		);
		expect(container.querySelectorAll(".enter-load")).toHaveLength(2);
		expect(container.querySelectorAll(".enter-inview")).toHaveLength(0);
	});

	it("wraps each child in .enter-inview when inView is true", () => {
		const { container } = render(
			<Stagger inView>
				<span>A</span>
				<span>B</span>
			</Stagger>,
		);
		expect(container.querySelectorAll(".enter-inview")).toHaveLength(2);
	});

	it("applies an increasing --enter-delay per child (load cascade)", () => {
		const { container } = render(
			<Stagger stagger={0.1} delay={0}>
				<span>A</span>
				<span>B</span>
				<span>C</span>
			</Stagger>,
		);
		const items = [...container.querySelectorAll<HTMLElement>(".enter-load")];
		expect(items[0]!.style.getPropertyValue("--enter-delay")).toBe("0ms");
		expect(items[1]!.style.getPropertyValue("--enter-delay")).toBe("100ms");
		expect(items[2]!.style.getPropertyValue("--enter-delay")).toBe("200ms");
	});

	it("applies an increasing --enter-stagger per child (scroll cascade)", () => {
		const { container } = render(
			<Stagger inView>
				<span>A</span>
				<span>B</span>
			</Stagger>,
		);
		const items = [...container.querySelectorAll<HTMLElement>(".enter-inview")];
		expect(items[0]!.style.getPropertyValue("--enter-stagger")).toBe("0%");
		expect(items[1]!.style.getPropertyValue("--enter-stagger")).toBe("5%");
	});

	it("passes className and role to the container", () => {
		const { container } = render(
			<Stagger className="grid" role="list">
				<span>A</span>
			</Stagger>,
		);
		expect(container.firstChild).toHaveClass("grid");
		expect(container.firstChild).toHaveAttribute("role", "list");
	});

	it("forwards data-* attributes to the container", () => {
		const { container } = render(
			<Stagger data-carousel-scroll="true">
				<span>A</span>
			</Stagger>,
		);
		expect(container.firstChild).toHaveAttribute("data-carousel-scroll", "true");
	});

	it("renders keyed children without crashing", () => {
		const { container } = render(
			<Stagger>
				<span key="item-a">A</span>
				<span key="item-b">B</span>
			</Stagger>,
		);
		expect(container.firstChild!.childNodes).toHaveLength(2);
	});
});
