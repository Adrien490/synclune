import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

// Import AFTER (no mocks needed — no external deps)
import { HamburgerIcon } from "../icons/hamburger-icon";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("HamburgerIcon", () => {
	describe("rendering", () => {
		it("renders an SVG element", () => {
			const { container } = render(<HamburgerIcon isOpen={false} />);

			expect(container.querySelector("svg")).toBeInTheDocument();
		});

		it("renders three <line> elements", () => {
			const { container } = render(<HamburgerIcon isOpen={false} />);
			const lines = container.querySelectorAll("line");

			expect(lines).toHaveLength(3);
		});

		it("renders with 20x20 dimensions", () => {
			const { container } = render(<HamburgerIcon isOpen={false} />);
			const svg = container.querySelector("svg");

			expect(svg).toHaveAttribute("width", "20");
			expect(svg).toHaveAttribute("height", "20");
		});

		it("renders with viewBox 0 0 20 20", () => {
			const { container } = render(<HamburgerIcon isOpen={false} />);

			expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 20 20");
		});
	});

	describe("accessibility", () => {
		it("is aria-hidden (decorative icon, labelled by parent button)", () => {
			const { container } = render(<HamburgerIcon isOpen={false} />);

			expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
		});

		it("does not expose a role='img' (decorative)", () => {
			const { container } = render(<HamburgerIcon isOpen={false} />);

			expect(container.querySelector("svg")).not.toHaveAttribute("role");
		});
	});

	describe("closed state (isOpen=false)", () => {
		it("top bar has correct closed coordinates", () => {
			const { container } = render(<HamburgerIcon isOpen={false} />);
			const [topBar] = container.querySelectorAll("line");

			// Closed: x1=3 x2=17 y1=5 y2=5 (horizontal line)
			expect(topBar).toHaveAttribute("x1", "3");
			expect(topBar).toHaveAttribute("x2", "17");
			expect(topBar).toHaveAttribute("y1", "5");
			expect(topBar).toHaveAttribute("y2", "5");
		});

		it("middle bar is fully visible (opacity=1)", () => {
			const { container } = render(<HamburgerIcon isOpen={false} />);
			const lines = container.querySelectorAll("line");
			const middleBar = lines[1]!;

			expect(middleBar).toHaveAttribute("opacity", "1");
		});

		it("bottom bar has correct closed coordinates", () => {
			const { container } = render(<HamburgerIcon isOpen={false} />);
			const lines = container.querySelectorAll("line");
			const bottomBar = lines[2]!;

			// Closed: x1=3 x2=17 y1=15 y2=15 (horizontal line)
			expect(bottomBar).toHaveAttribute("x1", "3");
			expect(bottomBar).toHaveAttribute("x2", "17");
			expect(bottomBar).toHaveAttribute("y1", "15");
			expect(bottomBar).toHaveAttribute("y2", "15");
		});
	});

	describe("open state (isOpen=true)", () => {
		it("top bar has correct open coordinates (diagonal top-left to bottom-right)", () => {
			const { container } = render(<HamburgerIcon isOpen={true} />);
			const [topBar] = container.querySelectorAll("line");

			// Open: x1=4 x2=16 y1=4 y2=16 (diagonal)
			expect(topBar).toHaveAttribute("x1", "4");
			expect(topBar).toHaveAttribute("x2", "16");
			expect(topBar).toHaveAttribute("y1", "4");
			expect(topBar).toHaveAttribute("y2", "16");
		});

		it("middle bar is hidden (opacity=0)", () => {
			const { container } = render(<HamburgerIcon isOpen={true} />);
			const lines = container.querySelectorAll("line");
			const middleBar = lines[1]!;

			expect(middleBar).toHaveAttribute("opacity", "0");
		});

		it("bottom bar has correct open coordinates (diagonal bottom-left to top-right)", () => {
			const { container } = render(<HamburgerIcon isOpen={true} />);
			const lines = container.querySelectorAll("line");
			const bottomBar = lines[2]!;

			// Open: x1=4 x2=16 y1=16 y2=4 (diagonal, reversed Y)
			expect(bottomBar).toHaveAttribute("x1", "4");
			expect(bottomBar).toHaveAttribute("x2", "16");
			expect(bottomBar).toHaveAttribute("y1", "16");
			expect(bottomBar).toHaveAttribute("y2", "4");
		});
	});

	describe("transitions between states", () => {
		it("updates middle bar opacity when isOpen changes from false to true", () => {
			const { container, rerender } = render(<HamburgerIcon isOpen={false} />);
			const lines = container.querySelectorAll("line");

			expect(lines[1]).toHaveAttribute("opacity", "1");

			rerender(<HamburgerIcon isOpen={true} />);
			const updatedLines = container.querySelectorAll("line");
			expect(updatedLines[1]).toHaveAttribute("opacity", "0");
		});

		it("updates top bar y2 attribute when toggling", () => {
			const { container, rerender } = render(<HamburgerIcon isOpen={false} />);

			expect(container.querySelectorAll("line")[0]).toHaveAttribute("y2", "5");

			rerender(<HamburgerIcon isOpen={true} />);
			expect(container.querySelectorAll("line")[0]).toHaveAttribute("y2", "16");
		});
	});
});
