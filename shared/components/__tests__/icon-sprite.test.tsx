import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Import AFTER (no mocks needed — pure SVG components)
import { IconSprite } from "../icons/icon-sprite";

// SpriteIcon is not exported from icon-sprite.tsx (internal component),
// so we test it indirectly by inspecting the rendered SVG from IconSprite.

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS — IconSprite
// ============================================================================

describe("IconSprite", () => {
	describe("rendering", () => {
		it("renders an SVG container", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("svg")).toBeInTheDocument();
		});

		it("is hidden from the layout (display: none)", () => {
			const { container } = render(<IconSprite />);
			const svg = container.querySelector("svg");

			expect(svg).toHaveStyle({ display: "none" });
		});

		it("is aria-hidden (purely a sprite container)", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
		});
	});

	describe("symbol definitions", () => {
		it("defines the icon-heart-outline symbol", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("#icon-heart-outline")).toBeInTheDocument();
		});

		it("defines the icon-heart-filled symbol", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("#icon-heart-filled")).toBeInTheDocument();
		});

		it("defines the icon-cart-outline symbol", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("#icon-cart-outline")).toBeInTheDocument();
		});

		it("defines the icon-cart-filled symbol", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("#icon-cart-filled")).toBeInTheDocument();
		});

		it("defines the icon-account symbol", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("#icon-account")).toBeInTheDocument();
		});

		it("defines the icon-menu symbol", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("#icon-menu")).toBeInTheDocument();
		});

		it("defines 6 symbols in total", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelectorAll("symbol")).toHaveLength(6);
		});
	});

	describe("gradient definitions", () => {
		it("defines the gradient-rose-gold linearGradient", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("#gradient-rose-gold")).toBeInTheDocument();
		});

		it("gradient has two color stops", () => {
			const { container } = render(<IconSprite />);
			const gradient = container.querySelector("#gradient-rose-gold");

			expect(gradient?.querySelectorAll("stop")).toHaveLength(2);
		});
	});

	describe("symbol viewBox attributes", () => {
		it("heart symbols have viewBox='0 0 24 24'", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("#icon-heart-outline")).toHaveAttribute(
				"viewBox",
				"0 0 24 24",
			);
			expect(container.querySelector("#icon-heart-filled")).toHaveAttribute("viewBox", "0 0 24 24");
		});

		it("cart symbols have viewBox='0 0 24 24'", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("#icon-cart-outline")).toHaveAttribute("viewBox", "0 0 24 24");
			expect(container.querySelector("#icon-cart-filled")).toHaveAttribute("viewBox", "0 0 24 24");
		});

		it("account symbol has viewBox='0 0 24 24'", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("#icon-account")).toHaveAttribute("viewBox", "0 0 24 24");
		});

		it("menu symbol has viewBox='0 0 24 24'", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("#icon-menu")).toHaveAttribute("viewBox", "0 0 24 24");
		});
	});

	describe("heart outline symbol contents", () => {
		it("contains a path with fill='none'", () => {
			const { container } = render(<IconSprite />);
			const symbol = container.querySelector("#icon-heart-outline");
			const path = symbol?.querySelector("path");

			expect(path).toHaveAttribute("fill", "none");
		});
	});

	describe("heart filled symbol contents", () => {
		it("contains a path with fill='var(--primary)'", () => {
			const { container } = render(<IconSprite />);
			const symbol = container.querySelector("#icon-heart-filled");
			const path = symbol?.querySelector("path");

			expect(path).toHaveAttribute("fill", "var(--primary)");
		});
	});

	describe("cart symbols contents", () => {
		it("cart-outline symbol contains wheel circles", () => {
			const { container } = render(<IconSprite />);
			const symbol = container.querySelector("#icon-cart-outline");

			expect(symbol?.querySelectorAll("circle")).toHaveLength(2);
		});

		it("cart-filled symbol contains wheel circles", () => {
			const { container } = render(<IconSprite />);
			const symbol = container.querySelector("#icon-cart-filled");

			expect(symbol?.querySelectorAll("circle")).toHaveLength(2);
		});
	});
});
