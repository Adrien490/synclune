import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Import AFTER (no mocks needed — pure SVG component)
import { TikTokIcon } from "../icons/tiktok-icon";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("TikTokIcon", () => {
	describe("rendering", () => {
		it("renders an SVG element", () => {
			const { container } = render(<TikTokIcon />);

			expect(container.querySelector("svg")).toBeInTheDocument();
		});

		it("renders with the default size of 24", () => {
			const { container } = render(<TikTokIcon />);
			const svg = container.querySelector("svg");

			expect(svg).toHaveAttribute("width", "24");
			expect(svg).toHaveAttribute("height", "24");
		});

		it("renders with a custom size", () => {
			const { container } = render(<TikTokIcon size={36} />);
			const svg = container.querySelector("svg");

			expect(svg).toHaveAttribute("width", "36");
			expect(svg).toHaveAttribute("height", "36");
		});

		it("has the correct viewBox (0 0 24 24)", () => {
			const { container } = render(<TikTokIcon />);

			expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 24 24");
		});

		it("has fill='currentColor' on the SVG root", () => {
			const { container } = render(<TikTokIcon />);

			expect(container.querySelector("svg")).toHaveAttribute("fill", "currentColor");
		});

		it("is not focusable (focusable='false')", () => {
			const { container } = render(<TikTokIcon />);

			expect(container.querySelector("svg")).toHaveAttribute("focusable", "false");
		});

		it("renders a <path> element for the TikTok logo", () => {
			const { container } = render(<TikTokIcon />);

			expect(container.querySelector("path")).toBeInTheDocument();
		});
	});

	describe("className forwarding", () => {
		it("applies custom className to the SVG", () => {
			const { container } = render(<TikTokIcon className="tiktok-class" />);

			expect(container.querySelector("svg")).toHaveClass("tiktok-class");
		});

		it("applies empty string by default (no extra class)", () => {
			const { container } = render(<TikTokIcon />);

			expect(container.querySelector("svg")?.getAttribute("class")).toBe("");
		});
	});

	describe("accessibility — non-decorative (default)", () => {
		it("has role='img' when not decorative", () => {
			render(<TikTokIcon />);

			expect(screen.getByRole("img")).toBeInTheDocument();
		});

		it("has default aria-label 'Suivre sur TikTok'", () => {
			render(<TikTokIcon />);

			expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Suivre sur TikTok");
		});

		it("accepts a custom ariaLabel", () => {
			render(<TikTokIcon ariaLabel="Notre TikTok" />);

			expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Notre TikTok");
		});

		it("renders a <title> with the accessible label", () => {
			const { container } = render(<TikTokIcon />);

			const title = container.querySelector("title");
			expect(title).toBeInTheDocument();
			expect(title?.textContent).toBe("Suivre sur TikTok");
		});

		it("renders <title> with a custom ariaLabel", () => {
			const { container } = render(<TikTokIcon ariaLabel="TikTok Synclune" />);

			expect(container.querySelector("title")?.textContent).toBe("TikTok Synclune");
		});

		it("does not set aria-hidden when not decorative", () => {
			render(<TikTokIcon />);

			expect(screen.getByRole("img")).not.toHaveAttribute("aria-hidden");
		});
	});

	describe("accessibility — decorative", () => {
		it("has role='presentation' attribute when decorative", () => {
			const { container } = render(<TikTokIcon decorative />);

			expect(container.querySelector("svg")).toHaveAttribute("role", "presentation");
		});

		it("sets aria-hidden='true' when decorative", () => {
			const { container } = render(<TikTokIcon decorative />);

			expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
		});

		it("does not render a <title> when decorative", () => {
			const { container } = render(<TikTokIcon decorative />);

			expect(container.querySelector("title")).not.toBeInTheDocument();
		});

		it("does not set aria-label when decorative", () => {
			const { container } = render(<TikTokIcon decorative />);

			expect(container.querySelector("svg")).not.toHaveAttribute("aria-label");
		});
	});
});
