/**
 * @regression filter-host-contract
 *
 * Deux propriétés du corps de filtres dépendent de l'HÔTE, et aucune ne se voit
 * ni à `tsc` ni à l'œil dans un test qui monte un seul hôte :
 *
 * 1. **La gouttière du corps de filtres.** Tout y déborde en négatif pour que
 *    les fonds atteignent les bords de l'hôte (`-mx-6` par en-tête collant,
 *    `-mx-3` par ligne). C'était écrit en dur, calé sur le `px-6` de
 *    `FilterSheetWrapper` : dans le rail, la bande dépassait sa colonne de 16rem
 *    de 24 px et les lignes de 12 px. Comme le rail est `overflow-y-auto`, CSS
 *    promeut alors `overflow-x` de `visible` à `auto` — la colonne défilait
 *    horizontalement (mesuré : `scrollWidth` 268 pour 256 de large). Chaque hôte
 *    déclare donc sa gouttière, et DOIT ouvrir autant de padding.
 *
 * 2. **Le nom accessible des interrupteurs de disponibilité.** Un `aria-label`
 *    rédigé écrasait l'association `<label htmlFor>` et ne contenait pas le
 *    libellé visible : WCAG 2.5.3 Label in Name en échec, et « clique sur En
 *    stock uniquement » sans cible en commande vocale.
 *
 * @see filter-dual-mount-id-scope.regression.test.tsx — la portée des `id`.
 */

import { readFileSync } from "node:fs";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FilterFormData } from "@/modules/products/services/product-filter-params.service";

vi.mock("@/shared/hooks/use-haptic", () => ({ useHaptic: () => vi.fn() }));

vi.mock("@/modules/colors/utils/color-contrast.utils", () => ({
	isLightColor: () => false,
	getContrastTextColor: () => "#ffffff",
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	CheckIcon: () => <span />,
	CircleIcon: () => <span />,
	MagnifyingGlassIcon: () => <span />,
	CaretDownIcon: () => <span />,
	CaretUpIcon: () => <span />,
	XIcon: () => <span />,
}));

import { ProductFilterCompartments, HOST_GUTTER } from "../product-filter-compartments";

// ============================================================================
// FIXTURES
// ============================================================================

const values: FilterFormData = {
	colors: [],
	materials: [],
	productTypes: [],
	priceRange: [0, 500],
	inStockOnly: false,
	onSale: false,
	sortBy: "created-descending",
};

const noop = () => {};

function renderHost(host: "sheet" | "rail") {
	return render(
		<ProductFilterCompartments
			host={host}
			productTypes={[]}
			colors={[]}
			materials={[]}
			maxPriceInEuros={500}
			values={values}
			counts={{ types: 0, price: 0, colors: 0, materials: 0, availability: 0 }}
			onToggle={noop}
			onPriceChange={noop}
			onAvailabilityChange={noop}
			onSectionReset={noop}
			sortOptions={[{ value: "created-descending", label: "Plus récents" }]}
			onSortChange={noop}
		/>,
	);
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("@regression filter-host-contract", () => {
	describe("gouttière de l'en-tête collant", () => {
		it("la gouttière de chaque hôte vaut le padding de son conteneur de défilement", () => {
			// Valeurs ÉPINGLÉES en littéral : `px-6` pour le panneau, `px-3` pour le
			// rail. Un hôte qui ouvre moins de padding que sa gouttière fait déborder
			// le corps — c'était le défaut du rail (mesuré : scrollWidth 268 / 256).
			expect(HOST_GUTTER.sheet).toBe("1.5rem");
			expect(HOST_GUTTER.rail).toBe("0.75rem");
		});

		it("le conteneur du rail ouvre bien le padding annoncé par la table", () => {
			// Garde statique : jsdom ne fait pas de layout, donc le débordement réel
			// n'y est pas observable. C'est la COHÉRENCE des deux littéraux qui est
			// testable — et c'est leur divergence qui a créé le bug.
			// Chemin depuis la racine du dépôt : `import.meta.url` n'est pas une URL
			// `file:` sous la transformation vitest.
			const source = readFileSync("modules/products/components/product-filter-rail.tsx", "utf8");
			// Depuis « la salle rose » (audit /produits 2026-08-05), `sticky` vit sur
			// la plaque PARENTE : le conteneur de défilement se reconnaît à son seul
			// `overflow-y-auto` (cf. `product-filter-rail-sticky.regression.test.ts`).
			// `className` en garde-fou : la JSDoc du rail cite aussi la classe.
			const scroller = source
				.split("\n")
				.find((line) => line.includes("overflow-y-auto") && line.includes("className"));

			expect(scroller, "conteneur de défilement du rail introuvable").toBeDefined();
			expect(
				scroller,
				`le rail doit ouvrir px-3 pour absorber HOST_GUTTER.rail (${HOST_GUTTER.rail})`,
			).toMatch(/\bpx-3\b/);
		});

		it("la variable est posée sur le conteneur, une seule fois par hôte", () => {
			for (const host of ["sheet", "rail"] as const) {
				const { container, unmount } = renderHost(host);
				const scope = container.querySelector<HTMLElement>("[data-filter-host]");

				expect(scope, `hôte ${host} : pas de scope [data-filter-host]`).not.toBeNull();
				expect(scope!.style.getPropertyValue("--filter-gutter")).toBe(HOST_GUTTER[host]);
				unmount();
			}
		});

		it("aucun compartiment ne réintroduit une gouttière en dur", () => {
			// C'est le défaut d'origine : un `-mx-6` littéral dans l'en-tête, correct
			// pour le panneau et faux pour le rail.
			const { container } = renderHost("rail");
			const offenders = [...container.querySelectorAll("[class]")].filter((el) =>
				/(^|\s)-?mx-6(\s|$)|(^|\s)px-6(\s|$)/.test(el.className),
			);

			expect(
				offenders.map((el) => el.className),
				"gouttière codée en dur : elle ne peut pas être juste pour les deux hôtes",
			).toEqual([]);
		});
	});

	describe("WCAG 2.5.3 — interrupteurs de disponibilité", () => {
		it("le nom accessible EST le libellé visible", () => {
			// `getByRole(…, { name })` calcule le VRAI nom accessible
			// (dom-accessibility-api), seule façon de tester 2.5.3 : une recherche
			// maison de l'`aria-labelledby` passe à vide dès que l'attribut change de
			// forme — la première version de ce test ne détectait pas la régression
			// qu'elle prétendait garder, prouvé en réintroduisant l'`aria-label`.
			const { getByRole } = renderHost("sheet");

			for (const visible of ["En stock uniquement", "En promotion"]) {
				expect(
					getByRole("switch", { name: visible }),
					`aucun interrupteur nommé exactement « ${visible} »`,
				).toBeTruthy();
			}
		});

		it("aucun interrupteur ne porte d'aria-label rédigé", () => {
			const { container } = renderHost("sheet");
			const offenders = [...container.querySelectorAll("[role='switch'], button[aria-label]")]
				.map((el) => el.getAttribute("aria-label"))
				.filter((v): v is string => !!v);

			expect(offenders, "un aria-label sur l'interrupteur écrase le libellé visible").toEqual([]);
		});
	});
});
