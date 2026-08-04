import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		sizes,
		fill: _fill,
		preload: _preload,
		blurDataURL: _blurDataURL,
		placeholder: _placeholder,
		fetchPriority,
		loading,
		quality: _quality,
		className,
		style,
	}: Record<string, unknown>) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			data-testid="collection-image"
			src={src as string}
			alt={alt as string}
			sizes={sizes as string}
			fetchPriority={fetchPriority as "high" | "low" | "auto"}
			loading={loading as "eager" | "lazy"}
			className={className as string}
			style={style as React.CSSProperties}
		/>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CollectionImagesGrid } from "../collection-images-grid";
import { COLLECTION_IMAGE_SIZES_CARD } from "../../constants/image-sizes.constants";
import type { CollectionImage } from "../../types/collection.types";

// ============================================================================
// TEST HELPERS
// ============================================================================

afterEach(cleanup);

function makeImages(count: number): CollectionImage[] {
	return Array.from({ length: count }, (_, i) => ({
		url: `https://cdn.example/img-${i}.jpg`,
		alt: `Bracelet arc-en-ciel ${i}`,
		blurDataUrl: null,
	}));
}

/** Le conteneur de layout est le premier enfant rendu. */
function layoutRoot(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

/** Les cellules d'un layout multi-images (le conteneur mis à part). */
function cells(container: HTMLElement): HTMLElement[] {
	return Array.from(layoutRoot(container).children) as HTMLElement[];
}

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionImagesGrid", () => {
	describe.each([
		["1 image", 1],
		["2 images", 2],
		["3 images", 3],
		["4 images (bento)", 4],
	])("ratio du bloc média — %s", (_label, count) => {
		/**
		 * @regression collection-grid-media-is-square
		 *
		 * Audit 2026-08-04 : le ratio était DÉRIVÉ des cellules, pas déclaré. Deux
		 * `aspect-square` côte à côte (layout 2 images) donnaient un bandeau `W × W/2`,
		 * deux fois plus plat que les trois autres layouts : dans une rangée de grille,
		 * une collection à deux créations était plus courte que ses voisines, et le
		 * squelette — qui réserve un carré — décalait la page à l'arrivée des données.
		 */
		it("porte aspect-square sur le CONTENEUR, jamais sur les cellules", () => {
			const { container } = render(<CollectionImagesGrid images={makeImages(count)} framed />);

			expect(layoutRoot(container).className).toContain("aspect-square");

			if (count > 1) {
				for (const cell of cells(container)) {
					expect(
						cell.className,
						"une cellule qui impose son propre ratio reprend la main sur le conteneur",
					).not.toContain("aspect-square");
				}
			}
		});
	});

	describe("le bento est décoratif (audit a11y 2026-08-04)", () => {
		/**
		 * @regression collection-grid-preview-is-decorative
		 *
		 * Un lecteur d'écran entendait le libellé du groupe puis les 4 `alt` de bijoux
		 * AVANT le titre de la carte — une dizaine d'éléments par carte, vingt cartes
		 * sur /collections, pour des bijoux non atteignables depuis la carte.
		 */
		it("rend toutes les images d'aperçu avec alt vide", () => {
			render(<CollectionImagesGrid images={makeImages(4)} framed />);

			const images = screen.getAllByTestId("collection-image");
			expect(images).toHaveLength(4);
			for (const img of images) {
				expect(img.getAttribute("alt")).toBe("");
			}
		});

		it("n'expose aucun role=group", () => {
			const { container } = render(<CollectionImagesGrid images={makeImages(4)} framed />);
			expect(container.querySelector('[role="group"]')).toBeNull();
		});
	});

	describe("sizes bornés par le conteneur (audit perf 2026-08-04)", () => {
		/**
		 * @regression collection-grid-sizes-are-capped
		 *
		 * Les `sizes` par défaut finissaient tous en `vw` alors que la grille vit dans
		 * un `max-w-6xl` : à 1920px ils déclaraient jusqu'à 4× la largeur réelle, soit
		 * autant de transformations `/_next/image` payées pour des pixels jetés.
		 */
		it("la variante carte consomme la SSOT, pas des littéraux", () => {
			render(<CollectionImagesGrid images={makeImages(4)} framed />);

			const images = screen.getAllByTestId("collection-image");
			expect(images[0]!.getAttribute("sizes")).toBe(COLLECTION_IMAGE_SIZES_CARD.BENTO_MAIN);
			expect(images[1]!.getAttribute("sizes")).toBe(COLLECTION_IMAGE_SIZES_CARD.BENTO_SECONDARY);
			expect(images[3]!.getAttribute("sizes")).toBe(
				COLLECTION_IMAGE_SIZES_CARD.BENTO_SECONDARY_HIDDEN_MOBILE,
			);
		});

		it("la variante compact (mega-menu) garde ses tailles fixes", () => {
			render(<CollectionImagesGrid images={makeImages(4)} variant="compact" />);

			const sizes = screen
				.getAllByTestId("collection-image")
				.map((img) => img.getAttribute("sizes"));
			for (const value of sizes) {
				expect(
					value,
					"le mega-menu a des largeurs connues, il ne doit rien exprimer en vw",
				).not.toMatch(/vw/);
			}
		});
	});

	describe("chrome et priorités", () => {
		it("framed pose des coins sur les 4 angles, le défaut seulement en haut", () => {
			const { container: framed } = render(<CollectionImagesGrid images={makeImages(4)} framed />);
			expect(layoutRoot(framed).className).toContain("rounded-sm");

			cleanup();

			const { container: soude } = render(<CollectionImagesGrid images={makeImages(4)} />);
			expect(layoutRoot(soude).className).toContain("rounded-t-lg");
		});

		it("réserve fetchPriority=high à l'image principale de la carte LCP", () => {
			render(<CollectionImagesGrid images={makeImages(4)} isAboveFold isLcpCandidate framed />);

			const images = screen.getAllByTestId("collection-image");
			expect(images[0]!.getAttribute("fetchpriority")).toBe("high");
			for (const img of images.slice(1)) {
				expect(img.getAttribute("fetchpriority")).toBe("auto");
			}
		});

		it("n'applique le view-transition-name qu'à la première image", () => {
			render(<CollectionImagesGrid images={makeImages(4)} collectionSlug="van-gogh" framed />);

			const images = screen.getAllByTestId("collection-image");
			expect(images[0]!.style.viewTransitionName).toBe("collection-van-gogh");
			for (const img of images.slice(1)) {
				expect(img.style.viewTransitionName).toBe("");
			}
		});

		it("masque la 4e vignette sous sm", () => {
			const { container } = render(<CollectionImagesGrid images={makeImages(4)} framed />);
			const fourth = cells(container)[3]!;
			expect(fourth.className).toContain("hidden");
			expect(fourth.className).toContain("sm:block");
		});

		it("ignore les images au-delà de la 4e", () => {
			render(<CollectionImagesGrid images={makeImages(7)} framed />);
			expect(screen.getAllByTestId("collection-image")).toHaveLength(4);
		});
	});
});
