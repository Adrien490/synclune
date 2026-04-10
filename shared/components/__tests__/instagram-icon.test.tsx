import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Import AFTER (no mocks needed — pure SVG component)
import { InstagramIcon } from "../icons/instagram-icon";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("InstagramIcon", () => {
	describe("rendering", () => {
		it("renders an SVG element", () => {
			const { container } = render(<InstagramIcon />);

			expect(container.querySelector("svg")).toBeInTheDocument();
		});

		it("renders with the default size of 24", () => {
			const { container } = render(<InstagramIcon />);
			const svg = container.querySelector("svg");

			expect(svg).toHaveAttribute("width", "24");
			expect(svg).toHaveAttribute("height", "24");
		});

		it("renders with a custom size", () => {
			const { container } = render(<InstagramIcon size={48} />);
			const svg = container.querySelector("svg");

			expect(svg).toHaveAttribute("width", "48");
			expect(svg).toHaveAttribute("height", "48");
		});

		it("has the correct viewBox", () => {
			const { container } = render(<InstagramIcon />);

			expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 24 24");
		});

		it("is not focusable (focusable='false')", () => {
			const { container } = render(<InstagramIcon />);

			expect(container.querySelector("svg")).toHaveAttribute("focusable", "false");
		});

		it("renders the outer rounded rect (Instagram frame)", () => {
			const { container } = render(<InstagramIcon />);
			const rect = container.querySelector("rect");

			expect(rect).toBeInTheDocument();
			expect(rect).toHaveAttribute("x", "2");
			expect(rect).toHaveAttribute("y", "2");
			expect(rect).toHaveAttribute("width", "20");
			expect(rect).toHaveAttribute("height", "20");
		});

		it("renders the camera lens circle", () => {
			const { container } = render(<InstagramIcon />);
			const circles = container.querySelectorAll("circle");

			// Two circles: lens (r=4.5) and mode indicator (r=1.5)
			expect(circles).toHaveLength(2);
		});

		it("renders the lens circle with radius 4.5", () => {
			const { container } = render(<InstagramIcon />);
			const lensCircle = container.querySelector("circle[cx='12'][cy='12']");

			expect(lensCircle).toBeInTheDocument();
			expect(lensCircle).toHaveAttribute("r", "4.5");
		});

		it("renders the mode indicator dot with radius 1.5", () => {
			const { container } = render(<InstagramIcon />);
			const dotCircle = container.querySelector("circle[cx='17.5'][cy='6.5']");

			expect(dotCircle).toBeInTheDocument();
			expect(dotCircle).toHaveAttribute("r", "1.5");
		});
	});

	describe("className forwarding", () => {
		it("applies custom className to the SVG", () => {
			const { container } = render(<InstagramIcon className="insta-icon" />);

			expect(container.querySelector("svg")).toHaveClass("insta-icon");
		});

		it("applies empty string by default (no extra class)", () => {
			const { container } = render(<InstagramIcon />);

			expect(container.querySelector("svg")?.getAttribute("class")).toBe("");
		});
	});

	describe("accessibility — non-decorative (default)", () => {
		it("has role='img' when not decorative", () => {
			render(<InstagramIcon />);

			expect(screen.getByRole("img")).toBeInTheDocument();
		});

		it("has default aria-label 'Suivre sur Instagram'", () => {
			render(<InstagramIcon />);

			expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Suivre sur Instagram");
		});

		it("accepts a custom ariaLabel", () => {
			render(<InstagramIcon ariaLabel="Notre Instagram" />);

			expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Notre Instagram");
		});

		it("renders a <title> with the accessible label", () => {
			const { container } = render(<InstagramIcon />);

			const title = container.querySelector("title");
			expect(title).toBeInTheDocument();
			expect(title?.textContent).toBe("Suivre sur Instagram");
		});

		it("renders <title> with a custom ariaLabel", () => {
			const { container } = render(<InstagramIcon ariaLabel="Custom label" />);

			expect(container.querySelector("title")?.textContent).toBe("Custom label");
		});

		it("does not set aria-hidden when not decorative", () => {
			render(<InstagramIcon />);

			expect(screen.getByRole("img")).not.toHaveAttribute("aria-hidden");
		});
	});

	describe("accessibility — decorative", () => {
		it("has role='presentation' attribute when decorative", () => {
			const { container } = render(<InstagramIcon decorative />);

			expect(container.querySelector("svg")).toHaveAttribute("role", "presentation");
		});

		it("sets aria-hidden='true' when decorative", () => {
			const { container } = render(<InstagramIcon decorative />);

			expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
		});

		it("does not render a <title> when decorative", () => {
			const { container } = render(<InstagramIcon decorative />);

			expect(container.querySelector("title")).not.toBeInTheDocument();
		});

		it("does not set aria-label when decorative", () => {
			const { container } = render(<InstagramIcon decorative />);

			expect(container.querySelector("svg")).not.toHaveAttribute("aria-label");
		});
	});
});
