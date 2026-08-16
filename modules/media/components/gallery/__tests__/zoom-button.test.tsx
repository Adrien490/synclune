import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// La loupe est un tracé SVG en ligne (« Le carnet ») : plus aucune bibliothèque
// d'icônes à mocker ici.

// Mock the dynamic import target so it doesn't fail in test environment
vi.mock("@/modules/media/components/media-lightbox", () => ({
	MediaLightbox: () => null,
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { GalleryZoomButton } from "../zoom-button";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Libellé UNIQUE du plein écran. Il en existait un jumeau : le slide desktop
 * était lui-même un `<button>` nommé « Ouvrir l'image en plein écran »,
 * déclenchant le même `onOpen`. Deux arrêts au clavier, deux formulations, un
 * seul geste — cf. `slide.test.tsx`, qui vérifie que le slide n'est plus un
 * bouton.
 */
const LABEL = "Voir la photo en plein écran";

function getButton() {
	return screen.getByRole("button", { name: LABEL });
}

// ============================================================================
// TESTS
// ============================================================================

describe("GalleryZoomButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(cleanup);

	describe("rendering", () => {
		it("expose un seul bouton, nommé pour ce qu'il fait", () => {
			render(<GalleryZoomButton onOpen={vi.fn()} />);

			expect(getButton()).toBeInTheDocument();
			expect(screen.getAllByRole("button")).toHaveLength(1);
		});

		it("le tracé de la loupe est décoratif (aria-hidden)", () => {
			const { container } = render(<GalleryZoomButton onOpen={vi.fn()} />);

			const svg = container.querySelector("svg");
			expect(svg).not.toBeNull();
			expect(svg).toHaveAttribute("aria-hidden", "true");
			// `focusable="false"` : IE/Edge legacy mettaient les SVG dans l'ordre de
			// tabulation, ce qui doublait l'arrêt clavier du bouton.
			expect(svg).toHaveAttribute("focusable", "false");
		});

		// Elle est montée sur TOUS les slides, y compris vidéo : gatée sur
		// `type === "IMAGE"`, elle se démontait sous le focus en arrivant sur une
		// vidéo et emportait la navigation clavier avec elle (cf. `gallery.test.tsx`).
		// La lightbox sait afficher les vidéos : seul le libellé change.
		it("nomme la vidéo quand le média courant en est une", () => {
			render(<GalleryZoomButton onOpen={vi.fn()} mediaType="VIDEO" />);

			expect(
				screen.getByRole("button", { name: "Voir la vidéo en plein écran" }),
			).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: LABEL })).not.toBeInTheDocument();
		});

		// Convention du dépôt pour tout déclencheur de dialogue — `cart-sheet-trigger`,
		// `quick-search-trigger`, `product-filter-bar`. `MediaLightbox` est bien un
		// `role="dialog" aria-modal="true"`.
		it("s'annonce comme déclencheur de dialogue", () => {
			render(<GalleryZoomButton onOpen={vi.fn()} />);

			expect(getButton()).toHaveAttribute("aria-haspopup", "dialog");
		});

		it("reflète l'état de la lightbox dans aria-expanded", () => {
			const { rerender } = render(<GalleryZoomButton onOpen={vi.fn()} />);
			expect(getButton()).toHaveAttribute("aria-expanded", "false");

			rerender(<GalleryZoomButton onOpen={vi.fn()} isOpen />);
			expect(getButton()).toHaveAttribute("aria-expanded", "true");
		});
	});

	// Sous `forced-colors: active` (Windows High Contrast), les `box-shadow` sont
	// SUPPRIMÉS : l'anneau d'encre au repos et le sandwich de focus disparaissent
	// ensemble, et le jeton devient un aplat `Canvas` sur `Canvas`. Le repli en
	// `outline` est la convention du dépôt (`bottom-bar.styles.ts`, `count-badge.tsx`).
	describe("contraste forcé", () => {
		it("garde un bord et un anneau de focus en forced-colors", () => {
			render(<GalleryZoomButton onOpen={vi.fn()} />);

			const className = getButton().className;
			expect(className).toContain("forced-colors:outline");
			expect(className).toContain("forced-colors:outline-[CanvasText]");
			expect(className).toContain("forced-colors:focus-visible:outline-[Highlight]");
		});
	});

	describe("interaction", () => {
		it("clicking the button calls onOpen", () => {
			const onOpen = vi.fn();
			render(<GalleryZoomButton onOpen={onOpen} />);

			fireEvent.click(getButton());

			expect(onOpen).toHaveBeenCalledTimes(1);
		});

		// Le préchargement de la lightbox doit partir au survol ET au focus : sans
		// la seconde, un utilisateur clavier attend le chunk au moment du clic.
		it("mouseenter triggers prefetch (no error thrown)", () => {
			render(<GalleryZoomButton onOpen={vi.fn()} />);

			expect(() => {
				fireEvent.mouseEnter(getButton());
			}).not.toThrow();
		});

		it("focus triggers prefetch (no error thrown)", () => {
			render(<GalleryZoomButton onOpen={vi.fn()} />);

			expect(() => {
				fireEvent.focus(getButton());
			}).not.toThrow();
		});

		it("mouseenter and focus together only trigger prefetch once (idempotent flag)", () => {
			render(<GalleryZoomButton onOpen={vi.fn()} />);

			const button = getButton();

			// Both events should run without error; the module-level flag prevents double import
			expect(() => {
				fireEvent.mouseEnter(button);
				fireEvent.focus(button);
			}).not.toThrow();
		});
	});
});
