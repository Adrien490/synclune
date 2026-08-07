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

	describe("le corps du mark de marque", () => {
		// Le mark est rendu trois fois par page storefront et ses chemins pèsent
		// 3,4 Ko : c'est pour lui que ce sprite existe encore. Les assertions de
		// SILHOUETTE vivent donc ici, pas dans `logo.test.tsx` — le composant `Logo`
		// n'émet plus qu'un `<use>`.

		it("PEINT son disque, au lieu de le laisser en fond CSS", () => {
			// Un `background-color` est supprimé à l'impression (`print-color-adjust`)
			// alors qu'un `fill` survit : la page de suivi de commande imprimée rendait
			// l'initiale rose SANS son socle.
			const { container } = render(<IconSprite />);

			expect(container.querySelector("#logo-mark-body circle")).toHaveAttribute(
				"fill",
				"var(--logo-disc)",
			);
		});

		it("laisse le call site maître des couleurs ET de l'épaisseur", () => {
			// Un `<use>` fait hériter les custom properties de son point d'usage : c'est
			// ce qui permet à `LogoMark` de continuer à gouverner le mark depuis le
			// storefront. Une couleur écrite en dur ici la lui reprendrait en silence.
			const { container } = render(<IconSprite />);
			const body = container.querySelector("#logo-mark-body");

			for (const path of body?.querySelectorAll("path") ?? []) {
				expect(path.getAttribute("stroke")).toBe("var(--logo-ink)");
				expect(path.getAttribute("style")).toContain("var(--logo-stroke)");
				// `non-scaling-stroke` : sans lui le contour retombe sous le pixel aux
				// tailles où la marque vit (0,33 px à 28 px) et le mark perd sa seule
				// séparation de formes — cœur/disque ne valent que 1,27:1.
				expect(path).toHaveAttribute("vector-effect", "non-scaling-stroke");
			}
		});

		it("garde l'initiale en DÉCOUPE, pour laisser passer le socle", () => {
			const { container } = render(<IconSprite />);

			expect(container.querySelector("#logo-mark-body path[fill-rule='evenodd']")).not.toBeNull();
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

		it("defines 7 symbols in total", () => {
			// 6 icônes + le corps du mark de marque (`#logo-mark-body`, ajouté au titre
			// de l'audit logo du 2026-08-06 — c'est le seul symbole qui a un `<use>`).
			const { container } = render(<IconSprite />);

			expect(container.querySelectorAll("symbol")).toHaveLength(7);
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
