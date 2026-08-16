import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Les chevrons sont des tracés SVG en ligne depuis « Le carnet » : plus de
// bibliothèque d'icônes ni de `Button` shadcn à mocker. Le composant est donc
// rendu ENTIER, ce qui rend ces assertions plus fortes qu'avant — l'ancien stub
// de `Button` ne relayait que `onClick`, `aria-label` et `className`.

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { GalleryNavigation } from "../navigation";

// ============================================================================
// TESTS
// ============================================================================

describe("GalleryNavigation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(cleanup);

	describe("rendering", () => {
		it("renders prev button with aria-label 'Vue précédente'", () => {
			render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} />);

			expect(screen.getByRole("button", { name: "Vue précédente" })).toBeInTheDocument();
		});

		it("renders next button with aria-label 'Vue suivante'", () => {
			render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} />);

			expect(screen.getByRole("button", { name: "Vue suivante" })).toBeInTheDocument();
		});

		it("chaque bouton porte un chevron décoratif", () => {
			const { container } = render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} />);

			const svgs = container.querySelectorAll("svg");
			expect(svgs).toHaveLength(2);
			for (const svg of svgs) {
				expect(svg).toHaveAttribute("aria-hidden", "true");
				expect(svg).toHaveAttribute("focusable", "false");
			}
		});

		// Les deux chevrons ne sont pas l'image miroir l'un de l'autre par
		// `scale-x-[-1]` : ce sont deux tracés distincts, pour que l'irrégularité
		// « à la main » ne se lise pas comme une symétrie parfaite.
		it("les deux chevrons ont des tracés distincts", () => {
			const { container } = render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} />);

			const paths = [...container.querySelectorAll("path")].map((p) => p.getAttribute("d"));
			expect(paths).toHaveLength(2);
			expect(paths[0]).not.toBe(paths[1]);
		});

		// Contrat central de « Le carnet » : les commandes sont permanentes. Le
		// détail des classes est verrouillé par
		// `gallery-chrome-off-photo.regression.test.ts`.
		it("les deux boutons sont rendus sans état masqué", () => {
			render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} />);

			for (const button of screen.getAllByRole("button")) {
				expect(button.className).not.toContain("opacity-0");
			}
		});
	});

	describe("interaction", () => {
		it("clicking prev button calls onPrev", () => {
			const onPrev = vi.fn();
			render(<GalleryNavigation onPrev={onPrev} onNext={vi.fn()} />);

			fireEvent.click(screen.getByRole("button", { name: "Vue précédente" }));

			expect(onPrev).toHaveBeenCalledTimes(1);
		});

		it("clicking next button calls onNext", () => {
			const onNext = vi.fn();
			render(<GalleryNavigation onPrev={vi.fn()} onNext={onNext} />);

			fireEvent.click(screen.getByRole("button", { name: "Vue suivante" }));

			expect(onNext).toHaveBeenCalledTimes(1);
		});

		it("clicking prev does not call onNext", () => {
			const onNext = vi.fn();
			render(<GalleryNavigation onPrev={vi.fn()} onNext={onNext} />);

			fireEvent.click(screen.getByRole("button", { name: "Vue précédente" }));

			expect(onNext).not.toHaveBeenCalled();
		});

		it("clicking next does not call onPrev", () => {
			const onPrev = vi.fn();
			render(<GalleryNavigation onPrev={onPrev} onNext={vi.fn()} />);

			fireEvent.click(screen.getByRole("button", { name: "Vue suivante" }));

			expect(onPrev).not.toHaveBeenCalled();
		});

		it("les deux boutons sont de type button (pas de submit implicite)", () => {
			render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} />);

			for (const button of screen.getAllByRole("button")) {
				expect(button).toHaveAttribute("type", "button");
			}
		});
	});

	// Sous `forced-colors: active` (Windows High Contrast), les `box-shadow` sont
	// SUPPRIMÉS. Or c'est un `box-shadow` qui porte ici l'anneau d'encre au repos ET
	// le sandwich de focus : les deux disparaissaient ensemble, laissant un aplat
	// `Canvas` sur `Canvas`. Repli en `outline`, comme `bottom-bar.styles.ts`.
	describe("contraste forcé", () => {
		it("les jetons gardent un bord et un anneau de focus", () => {
			render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} />);

			for (const button of screen.getAllByRole("button")) {
				expect(button.className).toContain("forced-colors:outline");
				expect(button.className).toContain("forced-colors:outline-[CanvasText]");
				expect(button.className).toContain("forced-colors:focus-visible:outline-[Highlight]");
			}
		});
	});

	describe("aria-controls", () => {
		it("référence le conteneur de slides quand on le lui donne", () => {
			render(<GalleryNavigation onPrev={vi.fn()} onNext={vi.fn()} controlsId="gallery-slides" />);

			for (const button of screen.getAllByRole("button")) {
				expect(button).toHaveAttribute("aria-controls", "gallery-slides");
			}
		});
	});
});
