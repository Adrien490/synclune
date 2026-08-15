/**
 * @regression product-main-skeleton-parity
 *
 * `ProductMainSkeleton` est un miroir MANUEL de trois fichiers à la fois :
 * `app/(shop)/creations/[slug]/page.tsx` (géométrie de la galerie épinglée),
 * `ProductDetails` (le rythme 12 / 24 / 48 px de la colonne d'achat) et
 * `VariantSelector` (la carte du nuancier). Le fichier porte un ⚠️ demandant de
 * le maintenir à la main, et **rien ne le vérifiait** — contrairement au bloc
 * titre, qui a `storefront-heading-skeleton-parity`.
 *
 * ## Le bug verrouillé
 *
 * Audit PDP du 2026-08-05 : le squelette dessinait TOUJOURS une carte de variante
 * (3 plaquettes + un séparateur + un axe secondaire à 2 cases, ~250 px), alors que
 * `VariantSelector` retourne `null` dès que le produit n'a qu'un VARIANT, et n'affiche
 * son axe secondaire que si plusieurs matériaux existent ou qu'une taille est
 * requise. Sur une fiche mono-variante, tout le bas de la colonne d'achat
 * remontait au swap ; sur une fiche à un seul axe, d'un bloc.
 *
 * ## Ce que ce test impose
 *
 * - les réserves du squelette sont PARAMÉTRÉES, et `0` retire toute la carte ;
 * - la géométrie partagée avec `page.tsx` est épinglée en **littéral** des deux
 *   côtés (une régression symétrique passerait une simple égalité) ;
 * - le rythme 12 / 24 / 48 px de `ProductDetails` est épinglé de la même façon ;
 * - `loading.tsx`, qui n'a aucune donnée, garde des défauts explicites.
 *
 * Toute modification exige une review explicite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PRODUCT_MAIN_SKELETON_DEFAULTS, ProductMainSkeleton } from "../product-main-skeleton";

afterEach(cleanup);

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

function read(file: string) {
	return readFileSync(join(REPO_ROOT, file), "utf8");
}

/** La carte de variante est la seule bordure double rose du squelette. */
function variantCard(container: HTMLElement) {
	return container.querySelector(".border-primary\\/20");
}

describe("parité du squelette de la colonne d'achat", () => {
	describe("carte de variante", () => {
		it("est ABSENTE quand aucun axe n'est rendu (fiche mono-VARIANT)", () => {
			const { container } = render(<ProductMainSkeleton variantAxisCount={0} />);
			expect(variantCard(container)).toBeNull();
		});

		it("est présente sans axe secondaire quand un seul axe est rendu", () => {
			const { container } = render(<ProductMainSkeleton variantAxisCount={1} />);
			const card = variantCard(container);
			expect(card).not.toBeNull();
			// L'axe secondaire est précédé d'un filet : ni l'un ni l'autre ici.
			expect(card?.querySelectorAll(".bg-border.h-px")).toHaveLength(0);
		});

		it("réserve le filet et l'axe secondaire quand deux axes sont rendus", () => {
			const { container } = render(<ProductMainSkeleton variantAxisCount={2} />);
			const card = variantCard(container);
			expect(card?.querySelectorAll(".bg-border.h-px")).toHaveLength(1);
		});

		it("réserve exactement le nombre de plaquettes demandé", () => {
			const { container } = render(<ProductMainSkeleton variantAxisCount={1} swatchCount={5} />);
			expect(container.querySelectorAll(".h-21.w-22")).toHaveLength(5);
		});
	});

	describe("géométrie partagée avec page.tsx", () => {
		const STICKY_OFFSET = "lg:top-[calc(var(--navbar-height)+var(--pdp-cta-bar-height,0px))]";
		const STICKY_MAX_H = "lg:max-h-[calc(100dvh-6rem-var(--pdp-cta-bar-height,0px))]";
		const GRID = "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]";

		it("l'offset et le plafond de la galerie épinglée sont identiques au littéral de la page", () => {
			const page = read("app/(shop)/creations/[slug]/page.tsx");
			const skeleton = read("modules/products/components/product-main-skeleton.tsx");

			for (const literal of [STICKY_OFFSET, STICKY_MAX_H, GRID]) {
				expect(page, `page.tsx doit contenir ${literal}`).toContain(literal);
				expect(skeleton, `le squelette doit contenir ${literal}`).toContain(literal);
			}
		});

		it("le rythme 12 / 24 / 48 px de ProductDetails est répercuté", () => {
			const details = read("modules/products/components/product-details.tsx");
			const skeleton = read("modules/products/components/product-main-skeleton.tsx");

			// Bloc de décision serré (12 px), colonne à 24 px, mot de la fin à 48 px.
			for (const literal of ["flex flex-col gap-3", "flex flex-col gap-6", "pt-6"]) {
				expect(details, `product-details.tsx doit contenir ${literal}`).toContain(literal);
				expect(skeleton, `le squelette doit contenir ${literal}`).toContain(literal);
			}
		});
	});

	describe("repli de route", () => {
		it("`loading.tsx` monte le squelette SANS données, donc sur ses défauts", () => {
			const loading = read("app/(shop)/creations/[slug]/loading.tsx");
			expect(loading).toContain("<ProductMainSkeleton />");
			// Les défauts existent et sont explicites, pas des nombres magiques.
			expect(PRODUCT_MAIN_SKELETON_DEFAULTS.variantAxisCount).toBeGreaterThan(0);
			expect(PRODUCT_MAIN_SKELETON_DEFAULTS.swatchCount).toBeGreaterThan(0);
		});

		it("`page.tsx` passe les réserves EXACTES, jamais les défauts", () => {
			const page = read("app/(shop)/creations/[slug]/page.tsx");
			expect(page).toMatch(/variantAxisCount=\{skeletonVariantAxisCount\}/);
			expect(page).toMatch(/swatchCount=\{/);
		});
	});

	describe("annonce de chargement", () => {
		it("reste un role=status nommé, quelle que soit la réserve", () => {
			const { getByRole } = render(<ProductMainSkeleton variantAxisCount={0} />);
			const status = getByRole("status");
			expect(status).toHaveAttribute("aria-busy", "true");
			expect(status).toHaveAttribute("aria-label", "Chargement de la création");
		});
	});
});
