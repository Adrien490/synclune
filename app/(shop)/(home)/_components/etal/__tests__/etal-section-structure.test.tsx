import { cleanup, render, screen } from "@testing-library/react";
import { use } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Deux invariants de STRUCTURE de l'étal, tous deux invisibles à un test de
 * contenu :
 *
 * 1. Le `<h1>` est rendu HORS de la frontière `Suspense` de la grille. C'est
 *    lui qui porte le LCP, et c'est pour lui seul que Fraunces est préchargée
 *    (`shared/styles/fonts.ts`) : le déplacer dans la frontière ferait dépendre
 *    le texte LCP d'une lecture catalogue, sans qu'aucun rendu ne change.
 * 2. Le bloc titre et les cellules produit sont enfants de la MÊME grille.
 *    C'est tout le concept de la direction « L'étal » : le titre est la
 *    première cellule, pas une bande posée au-dessus. Emballer la grille dans
 *    un conteneur intermédiaire (ou faire de `EtalGrid` autre chose qu'un
 *    fragment) reconstituerait en silence le hero qu'on a retiré.
 */

const { neverResolves } = vi.hoisted(() => ({
	neverResolves: new Promise<never>(() => {}),
}));

vi.mock("../etal-grid", () => ({
	ETAL_PRODUCTS_COUNT: 5,
	// Suspend indéfiniment : simule la lecture catalogue la plus lente possible.
	EtalGrid: () => {
		use(neverResolves);
		return null;
	},
	EtalGridSkeleton: () => <div data-testid="etal-grid-skeleton" />,
}));

import { EtalSection } from "../etal-section";

afterEach(() => {
	cleanup();
});

describe("EtalSection — structure", () => {
	it("rend le h1 même quand la grille est encore suspendue", () => {
		render(<EtalSection productsPromise={neverResolves} />);

		const h1 = screen.getByRole("heading", { level: 1 });
		expect(h1).toHaveTextContent("Des bijoux colorés, faits un par un");
		expect(screen.getByTestId("etal-grid-skeleton")).toBeInTheDocument();
	});

	it("place le bloc titre et les cellules dans la même grille", () => {
		render(<EtalSection productsPromise={neverResolves} />);

		const headingCell = screen.getByRole("heading", { level: 1 }).closest("div.col-span-2");
		expect(headingCell).not.toBeNull();

		const gridCell = screen.getByTestId("etal-grid-skeleton");
		expect(gridCell.parentElement).toBe(headingCell!.parentElement);
		expect(headingCell!.parentElement!.className).toContain("grid");
	});

	it("relie la section à son titre et n'impose aucune hauteur dérivée de --navbar-height", () => {
		const { container } = render(<EtalSection productsPromise={neverResolves} />);

		const section = container.querySelector("section");
		expect(section).not.toBeNull();
		expect(section!.getAttribute("aria-labelledby")).toBe(
			screen.getByRole("heading", { level: 1 }).id,
		);
		// `--navbar-height` passe de 5rem à 4rem quand la navbar de la home se
		// compacte : une longueur qui en dérive fait remonter le contenu de 16 px
		// au premier pixel scrollé. L'offset de la barre fixe passe donc par
		// `--navbar-height-static`, que le mode compact ne touche pas.
		expect(section!.className).not.toMatch(/var\(--navbar-height\)/);
		expect(section!.className).toMatch(/var\(--navbar-height-static\)/);
	});
});
