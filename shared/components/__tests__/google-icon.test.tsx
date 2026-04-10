import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Import AFTER (no mocks needed — pure SVG component)
import { GoogleIcon } from "../icons/google-icon";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("GoogleIcon", () => {
	describe("rendering", () => {
		it("renders an SVG element", () => {
			const { container } = render(<GoogleIcon />);

			expect(container.querySelector("svg")).toBeInTheDocument();
		});

		it("renders with the default size of 24", () => {
			const { container } = render(<GoogleIcon />);
			const svg = container.querySelector("svg");

			expect(svg).toHaveAttribute("width", "24");
			expect(svg).toHaveAttribute("height", "24");
		});

		it("renders with a custom size", () => {
			const { container } = render(<GoogleIcon size={32} />);
			const svg = container.querySelector("svg");

			expect(svg).toHaveAttribute("width", "32");
			expect(svg).toHaveAttribute("height", "32");
		});

		it("has the correct viewBox", () => {
			const { container } = render(<GoogleIcon />);

			expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 24 24");
		});

		it("renders four colored path elements (Google logo colors)", () => {
			const { container } = render(<GoogleIcon />);
			const paths = container.querySelectorAll("path");

			expect(paths).toHaveLength(4);
		});

		it("contains the Google blue path (#4285F4)", () => {
			const { container } = render(<GoogleIcon />);
			const bluePath = Array.from(container.querySelectorAll("path")).find(
				(p) => p.getAttribute("fill") === "#4285F4",
			);

			expect(bluePath).toBeInTheDocument();
		});

		it("contains the Google green path (#34A853)", () => {
			const { container } = render(<GoogleIcon />);
			const greenPath = Array.from(container.querySelectorAll("path")).find(
				(p) => p.getAttribute("fill") === "#34A853",
			);

			expect(greenPath).toBeInTheDocument();
		});

		it("contains the Google yellow path (#FBBC05)", () => {
			const { container } = render(<GoogleIcon />);
			const yellowPath = Array.from(container.querySelectorAll("path")).find(
				(p) => p.getAttribute("fill") === "#FBBC05",
			);

			expect(yellowPath).toBeInTheDocument();
		});

		it("contains the Google red path (#EA4335)", () => {
			const { container } = render(<GoogleIcon />);
			const redPath = Array.from(container.querySelectorAll("path")).find(
				(p) => p.getAttribute("fill") === "#EA4335",
			);

			expect(redPath).toBeInTheDocument();
		});
	});

	describe("className forwarding", () => {
		it("applies custom className to the SVG", () => {
			const { container } = render(<GoogleIcon className="my-google-icon" />);

			expect(container.querySelector("svg")).toHaveClass("my-google-icon");
		});

		it("applies empty string by default (no extra class)", () => {
			const { container } = render(<GoogleIcon />);

			expect(container.querySelector("svg")?.getAttribute("class")).toBe("");
		});
	});

	describe("accessibility — non-decorative (default)", () => {
		it("has role='img' when not decorative", () => {
			render(<GoogleIcon />);

			expect(screen.getByRole("img")).toBeInTheDocument();
		});

		it("has default aria-label 'Se connecter avec Google'", () => {
			render(<GoogleIcon />);

			expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Se connecter avec Google");
		});

		it("accepts a custom ariaLabel", () => {
			render(<GoogleIcon ariaLabel="Google" />);

			expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Google");
		});

		it("renders a <title> element with the aria label", () => {
			const { container } = render(<GoogleIcon />);

			const title = container.querySelector("title");
			expect(title).toBeInTheDocument();
			expect(title?.textContent).toBe("Se connecter avec Google");
		});

		it("renders <title> with a custom ariaLabel", () => {
			const { container } = render(<GoogleIcon ariaLabel="Custom Google" />);

			expect(container.querySelector("title")?.textContent).toBe("Custom Google");
		});

		it("does not set aria-hidden when not decorative", () => {
			render(<GoogleIcon />);

			expect(screen.getByRole("img")).not.toHaveAttribute("aria-hidden");
		});
	});

	describe("accessibility — decorative", () => {
		it("has role='presentation' attribute when decorative", () => {
			const { container } = render(<GoogleIcon decorative />);

			expect(container.querySelector("svg")).toHaveAttribute("role", "presentation");
		});

		it("sets aria-hidden='true' when decorative", () => {
			const { container } = render(<GoogleIcon decorative />);

			expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
		});

		it("does not render a <title> when decorative", () => {
			const { container } = render(<GoogleIcon decorative />);

			expect(container.querySelector("title")).not.toBeInTheDocument();
		});

		it("does not set aria-label when decorative", () => {
			const { container } = render(<GoogleIcon decorative />);

			expect(container.querySelector("svg")).not.toHaveAttribute("aria-label");
		});
	});
});
