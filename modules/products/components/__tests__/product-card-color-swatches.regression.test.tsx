/**
 * @regression product-card-swatch-reveal
 *
 * Bascule desktop du 2026-08-08 : sur pointeur fin ≥ `sm`, les pastilles de
 * couleur cèdent la place au repos à « Disponible en N coloris » et ne
 * reviennent qu'au survol (ou au focus) de la carte. Sur tactile, où aucun
 * survol ne peut les faire venir, elles restent affichées en permanence.
 *
 * Trois pièges que ce garde-fou verrouille, tous invisibles à `tsc`, à eslint et
 * à jsdom (aucune feuille de style n'y est évaluée) :
 *
 * **1. Masquer sur le mauvais axe.** Un `sm:opacity-0` nu ferait tomber un iPad
 * (≥ 40rem, `hover: none`) dans le masquage sans qu'aucun survol puisse le
 * lever : jusqu'à 6 liens invisibles ET cliquables au-dessus du lien étiré de la
 * carte. C'est le MASQUAGE qui se gate `can-hover:`, jamais la révélation seule
 * — erreur déjà commise sur ProductCard le 2026-08-03 puis sur la recherche
 * rapide le 2026-08-05.
 *
 * **2. Perdre la parité clavier.** Les pastilles sont des liens dans l'ordre de
 * tabulation ; sans `sm:group-focus-within:`, on tabule sur des cibles
 * invisibles (WCAG 2.4.7). Symétriquement, cette règle de focus ne doit JAMAIS
 * passer derrière `can-hover:`, où elle ne s'appliquerait pas au clavier sur
 * tactile — c'est `hover-focus-parity.regression.test.ts` qui porte cette moitié.
 *
 * **3. Annoncer le compte deux fois.** Le `<ul>` porte déjà
 * `aria-label="N variantes disponibles pour …"` ; le texte de repli est un
 * doublon visuel, donc `aria-hidden`.
 *
 * ⚠️ Le scan de source STRIPPE les commentaires : ce fichier-ci comme le call
 * site CITENT les motifs interdits, et sans nettoyage le test rougirait sur sa
 * propre documentation (piège rencontré trois fois dans ce dépôt).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
	default: ({ href, children, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
		<a href={href} {...rest}>
			{children}
		</a>
	),
}));

import { MAX_COLOR_SWATCHES } from "@/modules/products/constants/product-texts.constants";
import type { ColorSwatch } from "@/modules/products/types/product-list.types";

import { ProductCardColorSwatches } from "../product-card-color-swatches";

const SOURCE = readFileSync(join(__dirname, "..", "product-card-color-swatches.tsx"), "utf8")
	.replace(/\/\*[\s\S]*?\*\//g, " ")
	.replace(/\/\/[^\n]*/g, " ");

function makeColors(count: number): ColorSwatch[] {
	return Array.from({ length: count }, (_, i) => ({
		slug: `color-${i}`,
		hex: "#FFC0CB",
		name: `Couleur ${i}`,
		inStock: true,
	}));
}

function renderSwatches(count: number) {
	return render(
		<ProductCardColorSwatches
			colors={makeColors(count)}
			productUrl="/creations/test-product"
			title="Test Product"
		/>,
	);
}

afterEach(() => {
	cleanup();
});

describe("@regression product-card-swatch-reveal", () => {
	describe("repli textuel", () => {
		it("rend « Disponible en N coloris » à côté des pastilles", () => {
			renderSwatches(3);

			expect(screen.getByText("Disponible en 3 coloris")).toBeInTheDocument();
		});

		it("le masque aux lecteurs d'écran — la liste annonce déjà le compte", () => {
			renderSwatches(3);

			const label = screen.getByText("Disponible en 3 coloris");
			expect(label).toHaveAttribute("aria-hidden", "true");

			// L'unique source accessible du compte reste l'aria-label de la liste.
			expect(
				screen.getByRole("list", { name: "3 variantes disponibles pour Test Product" }),
			).toBeInTheDocument();
		});

		/**
		 * Le repli vit dans la légende, que le lien étiré de la carte recouvre
		 * (`after:inset-0 after:z-10`). Même invariant que les badges de stock : un
		 * calque décoratif ne doit jamais découper de zone morte au clic sur
		 * l'élément le plus cliqué de la boutique.
		 */
		it("n'intercepte pas le clic du lien étiré", () => {
			renderSwatches(3);

			expect(screen.getByText("Disponible en 3 coloris")).toHaveClass("pointer-events-none");
		});

		it("partage la cellule de grille des pastilles (hauteur constante au survol)", () => {
			renderSwatches(3);

			const label = screen.getByText("Disponible en 3 coloris");
			const list = screen.getByRole("list");

			for (const node of [label, list]) {
				expect(node).toHaveClass("col-start-1");
				expect(node).toHaveClass("row-start-1");
			}
		});
	});

	describe("gating du masquage", () => {
		it("les pastilles sont visibles par défaut, masquées seulement là où le survol existe", () => {
			renderSwatches(3);

			const items = within(screen.getByRole("list")).getAllByRole("listitem");
			expect(items).toHaveLength(3);

			for (const item of items) {
				expect(item).toHaveClass("sm:can-hover:opacity-0");
				expect(item).toHaveClass("sm:can-hover:group-hover:opacity-100");
				// Parité clavier — surtout PAS derrière `can-hover:`
				expect(item).toHaveClass("sm:group-focus-within:opacity-100");
			}
		});

		it("la pastille de dépassement « +N » suit le même gating", () => {
			renderSwatches(MAX_COLOR_SWATCHES + 2);

			const overflow = screen.getByText(`+2`).closest("li");
			expect(overflow).not.toBeNull();
			expect(overflow).toHaveClass("sm:can-hover:opacity-0");
			expect(overflow).toHaveClass("sm:group-focus-within:opacity-100");
		});

		it("ne masque jamais derrière un BREAKPOINT de largeur nu", () => {
			expect(
				/\b(sm|md|lg|xl):opacity-0\b/.test(SOURCE),
				"Une largeur ne dit rien de la capacité de survol : un iPad (≥ sm, `hover: none`) " +
					"resterait masqué sans jamais pouvoir se révéler, tout en gardant des liens " +
					"cliquables au-dessus du lien étiré. Gater sur `can-hover:`.",
			).toBe(false);
		});
	});

	describe("cascade", () => {
		it("échelonne les pastilles de 40 ms via une variable CSS par index", () => {
			renderSwatches(3);

			const items = within(screen.getByRole("list")).getAllByRole("listitem");
			const delays = items.map((item) => item.style.getPropertyValue("--swatch-delay"));

			expect(delays).toEqual(["0ms", "40ms", "80ms"]);
		});

		/**
		 * Le délai appliqué par une transition CSS est celui de l'état vers lequel
		 * on va : le poser sur l'état de REPOS ferait sortir les pastilles en
		 * cascade inversée, avec jusqu'à 200 ms de traîne quand la souris a déjà
		 * quitté la carte. Il n'existe donc que dans les variantes hover/focus.
		 */
		it("n'applique le délai qu'à l'entrée (sortie immédiate)", () => {
			const delayClasses =
				SOURCE.match(/[\w:.-]*\[transition-delay:var\(--swatch-delay\)\]/g) ?? [];

			expect(delayClasses.length).toBeGreaterThan(0);
			for (const cls of delayClasses) {
				expect(
					/(group-hover|group-focus-within):\[transition-delay/.test(cls),
					`\`${cls}\` applique le délai au repos : la sortie traînerait en cascade inversée.`,
				).toBe(true);
			}
		});

		/**
		 * Tailwind v4 compile `scale-*` vers la propriété autonome `scale`, pas vers
		 * `transform` : avec `transform` dans la liste de transition, l'échelle
		 * saute à la frame 1 et seule l'opacité fond. Défaut déjà payé deux fois
		 * (`add-to-cart-card-button.tsx`, `card-surface.constants.ts`).
		 */
		it("transitionne `scale`, jamais `transform`", () => {
			expect(SOURCE).toContain("motion-safe:transition-[opacity,scale]");
			expect(SOURCE).not.toMatch(/transition-\[[^\]]*transform[^\]]*\]/);
		});
	});
});
