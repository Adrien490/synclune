import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CursorGlow } from "../cursor-glow";

afterEach(cleanup);

describe("CursorGlow", () => {
	it("renders children inside the wrapper", () => {
		render(
			<CursorGlow>
				<span data-testid="child">Content</span>
			</CursorGlow>,
		);

		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("renders a wrapper div with the cursor-glow-wrapper class", () => {
		const { container } = render(
			<CursorGlow>
				<span>Content</span>
			</CursorGlow>,
		);

		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper).toBeInTheDocument();
		expect(wrapper.className).toContain("cursor-glow-wrapper");
	});

	it("sets --mx and --my CSS custom properties on pointer move", () => {
		const { container } = render(
			<CursorGlow>
				<span>Content</span>
			</CursorGlow>,
		);

		const wrapper = container.firstChild as HTMLElement;

		// Mock getBoundingClientRect to return a known rect
		wrapper.getBoundingClientRect = () => ({
			left: 100,
			top: 50,
			right: 500,
			bottom: 300,
			width: 400,
			height: 250,
			x: 100,
			y: 50,
			toJSON: () => {},
		});

		fireEvent.pointerMove(wrapper, { clientX: 200, clientY: 150 });

		expect(wrapper.style.getPropertyValue("--mx")).toBe("100px");
		expect(wrapper.style.getPropertyValue("--my")).toBe("100px");
	});

	it("updates CSS properties correctly at top-left corner (clientX === rect.left)", () => {
		const { container } = render(
			<CursorGlow>
				<span>Content</span>
			</CursorGlow>,
		);

		const wrapper = container.firstChild as HTMLElement;
		wrapper.getBoundingClientRect = () => ({
			left: 50,
			top: 30,
			right: 300,
			bottom: 200,
			width: 250,
			height: 170,
			x: 50,
			y: 30,
			toJSON: () => {},
		});

		fireEvent.pointerMove(wrapper, { clientX: 50, clientY: 30 });

		expect(wrapper.style.getPropertyValue("--mx")).toBe("0px");
		expect(wrapper.style.getPropertyValue("--my")).toBe("0px");
	});

	it("renders multiple children", () => {
		render(
			<CursorGlow>
				<span data-testid="child-1">First</span>
				<span data-testid="child-2">Second</span>
			</CursorGlow>,
		);

		expect(screen.getByTestId("child-1")).toBeInTheDocument();
		expect(screen.getByTestId("child-2")).toBeInTheDocument();
	});

	it("updates CSS vars on multiple pointer moves", () => {
		const { container } = render(
			<CursorGlow>
				<span>Content</span>
			</CursorGlow>,
		);

		const wrapper = container.firstChild as HTMLElement;
		wrapper.getBoundingClientRect = () => ({
			left: 0,
			top: 0,
			right: 400,
			bottom: 300,
			width: 400,
			height: 300,
			x: 0,
			y: 0,
			toJSON: () => {},
		});

		fireEvent.pointerMove(wrapper, { clientX: 100, clientY: 80 });
		expect(wrapper.style.getPropertyValue("--mx")).toBe("100px");
		expect(wrapper.style.getPropertyValue("--my")).toBe("80px");

		fireEvent.pointerMove(wrapper, { clientX: 250, clientY: 150 });
		expect(wrapper.style.getPropertyValue("--mx")).toBe("250px");
		expect(wrapper.style.getPropertyValue("--my")).toBe("150px");
	});

	it("caches the rect on pointer enter, not on every move (no forced reflow per move)", () => {
		const { container } = render(
			<CursorGlow>
				<span>Content</span>
			</CursorGlow>,
		);

		const wrapper = container.firstChild as HTMLElement;
		let rectCalls = 0;
		wrapper.getBoundingClientRect = () => {
			rectCalls += 1;
			return {
				left: 0,
				top: 0,
				right: 400,
				bottom: 300,
				width: 400,
				height: 300,
				x: 0,
				y: 0,
				toJSON: () => {},
			};
		};

		fireEvent.pointerEnter(wrapper);
		fireEvent.pointerMove(wrapper, { clientX: 100, clientY: 80 });
		fireEvent.pointerMove(wrapper, { clientX: 250, clientY: 150 });
		fireEvent.pointerMove(wrapper, { clientX: 300, clientY: 200 });

		// getBoundingClientRect read once (on enter) — not on each of the 3 moves
		expect(rectCalls).toBe(1);
		expect(wrapper.style.getPropertyValue("--mx")).toBe("300px");
		expect(wrapper.style.getPropertyValue("--my")).toBe("200px");
	});

	it("invalidates the cached rect on pointer leave", () => {
		const { container } = render(
			<CursorGlow>
				<span>Content</span>
			</CursorGlow>,
		);

		const wrapper = container.firstChild as HTMLElement;
		let rectCalls = 0;
		wrapper.getBoundingClientRect = () => {
			rectCalls += 1;
			return {
				left: 0,
				top: 0,
				right: 400,
				bottom: 300,
				width: 400,
				height: 300,
				x: 0,
				y: 0,
				toJSON: () => {},
			};
		};

		fireEvent.pointerEnter(wrapper); // call 1 — caches rect
		fireEvent.pointerMove(wrapper, { clientX: 10, clientY: 10 });
		fireEvent.pointerLeave(wrapper); // invalidates the cache
		fireEvent.pointerMove(wrapper, { clientX: 20, clientY: 20 }); // ref null → fallback call 2

		expect(rectCalls).toBe(2);
		expect(wrapper.style.getPropertyValue("--mx")).toBe("20px");
		expect(wrapper.style.getPropertyValue("--my")).toBe("20px");
	});
});
