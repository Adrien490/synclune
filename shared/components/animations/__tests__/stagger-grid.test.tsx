import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { StaggerGrid } from "../stagger-grid";

// StaggerGrid is now a universal component: the container is a plain <div>
// and each child is wrapped in a <div> driven by the CSS `entrance-fade`
// keyframe (with `--enter-scale`).

afterEach(cleanup);

describe("StaggerGrid", () => {
	it("renders every child", () => {
		render(
			<StaggerGrid>
				<span>A</span>
				<span>B</span>
				<span>C</span>
			</StaggerGrid>,
		);
		expect(screen.getByText("A")).toBeInTheDocument();
		expect(screen.getByText("B")).toBeInTheDocument();
		expect(screen.getByText("C")).toBeInTheDocument();
	});

	it("wraps each child in .enter-inview by default (inView defaults to true)", () => {
		const { container } = render(
			<StaggerGrid>
				<span>A</span>
				<span>B</span>
			</StaggerGrid>,
		);
		expect(container.querySelectorAll(".enter-inview")).toHaveLength(2);
	});

	it("wraps each child in .enter-load when inView is false", () => {
		const { container } = render(
			<StaggerGrid inView={false}>
				<span>A</span>
			</StaggerGrid>,
		);
		expect(container.querySelectorAll(".enter-load")).toHaveLength(1);
		expect(container.querySelectorAll(".enter-inview")).toHaveLength(0);
	});

	it("sets the --enter-scale custom property from the scale prop", () => {
		const { container } = render(
			<StaggerGrid scale={0.9}>
				<span>A</span>
			</StaggerGrid>,
		);
		const item = container.querySelector<HTMLElement>(".enter-inview");
		expect(item!.style.getPropertyValue("--enter-scale")).toBe("0.9");
	});

	it("applies an increasing --enter-stagger per child", () => {
		const { container } = render(
			<StaggerGrid>
				<span>A</span>
				<span>B</span>
			</StaggerGrid>,
		);
		const items = [...container.querySelectorAll<HTMLElement>(".enter-inview")];
		expect(items[0]!.style.getPropertyValue("--enter-stagger")).toBe("0%");
		expect(items[1]!.style.getPropertyValue("--enter-stagger")).toBe("5%");
	});

	it("passes className, role and data-* to the container", () => {
		const { container } = render(
			<StaggerGrid className="grid-cols-3" role="list" data-testid="my-grid">
				<span>A</span>
			</StaggerGrid>,
		);
		expect(container.firstChild).toHaveClass("grid-cols-3");
		expect(container.firstChild).toHaveAttribute("role", "list");
		expect(container.firstChild).toHaveAttribute("data-testid", "my-grid");
	});

	it("wraps a single child correctly", () => {
		const { container } = render(
			<StaggerGrid>
				<span>Only</span>
			</StaggerGrid>,
		);
		expect(container.firstChild!.childNodes).toHaveLength(1);
		expect(screen.getByText("Only")).toBeInTheDocument();
	});
});
