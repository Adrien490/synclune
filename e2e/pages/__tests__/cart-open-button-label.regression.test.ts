/**
 * @regression cart-open-button-label-2026-08-04
 *
 * Le locator qui ouvre le panier doit matcher les libellés que le code produit
 * VRAIMENT — pas ceux qu'on croit qu'il produit.
 *
 * ## Le bug que ce test verrouille
 *
 * Sous `lg`, le déclencheur du panier n'est pas `CartSheetTrigger`
 * (`aria-label="Ouvrir mon panier"`, rendu `hidden lg:inline-flex`, donc absent
 * de l'arbre d'accessibilité) mais l'onglet de `ShopMobileBottomNav`, dont le nom
 * vient de `tabAriaLabel`.
 *
 * Un premier correctif avait dérivé son motif d'une AUTRE chaîne du même fichier
 * — la région d'annonce, qui écrit `Panier : 3 articles` avec un deux-points —
 * alors que `tabAriaLabel` écrit `Panier, 3 articles` avec une virgule, et
 * `Panier` tout court quand le panier est vide. Le motif
 * `/Ouvrir mon panier|^Panier(\s*:|\s+vide)/i` ne matchait donc **aucune** des
 * trois formes : les projets `mobile-chrome` et `mobile-webkit` restaient
 * incapables d'ouvrir le panier, dans les 14 fichiers de spec qui consomment
 * `CartPage`.
 *
 * ## Pourquoi un test unitaire et pas un E2E
 *
 * Un E2E aurait attrapé le défaut — mais seulement en faisant tourner un
 * navigateur et une base. Ce test-ci compose les libellés depuis la vraie
 * fonction et les confronte au vrai motif : il tourne en millisecondes, sans
 * infra, et ferme la classe de bug « j'ai deviné le libellé au lieu de le
 * dériver ».
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { tabAriaLabel } from "@/app/(shop)/(home)/_components/shop-mobile-bottom-nav";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const CART_PAGE_PATH = join(REPO_ROOT, "e2e", "pages", "cart.page.ts");

/**
 * Extrait le motif du `openButton` depuis la source de la page object, plutôt
 * que d'en recopier une deuxième version — une copie diverge, c'est précisément
 * le mécanisme du bug.
 */
function readOpenButtonPattern(): RegExp {
	const source = readFileSync(CART_PAGE_PATH, "utf8");
	const match = /this\.openButton = page\s*[\s\S]*?name:\s*(\/.*?\/[a-z]*)/.exec(source);
	if (!match?.[1]) {
		throw new Error(
			"Motif du `openButton` introuvable dans e2e/pages/cart.page.ts — " +
				"le test ne peut plus le vérifier, corrige l'extraction avant de le désactiver.",
		);
	}
	const [, literal] = match;
	const lastSlash = literal.lastIndexOf("/");
	return new RegExp(literal.slice(1, lastSlash), literal.slice(lastSlash + 1));
}

describe("@regression le locator d'ouverture du panier matche les libellés réels", () => {
	const pattern = readOpenButtonPattern();

	/** Les arguments exacts du call site (`shop-mobile-bottom-nav.tsx`, onglet Panier). */
	const cartTabLabel = (count: number) => tabAriaLabel("Panier", count, "article", "articles");

	it.each([
		[0, "Panier"],
		[1, "Panier, 1 article"],
		[3, "Panier, 3 articles"],
	])("onglet mobile à %i article(s) → %s", (count, expected) => {
		// D'abord : le libellé est bien celui qu'on croit.
		expect(cartTabLabel(count)).toBe(expected);
		// Ensuite seulement : le motif le matche.
		expect(pattern.test(cartTabLabel(count))).toBe(true);
	});

	it("matche aussi le déclencheur desktop de la navbar", () => {
		expect(pattern.test("Ouvrir mon panier")).toBe(true);
	});

	it("ne matche pas un libellé d'onglet voisin de la même barre", () => {
		// Garde-fou contre un motif trop large (`/panier/i` nu matcherait
		// « Ouvrir mon panier » ET n'importe quel texte contenant « panier »).
		expect(pattern.test(tabAriaLabel("Favoris", 2, "favori", "favoris"))).toBe(false);
		expect(pattern.test("Accueil")).toBe(false);
		expect(pattern.test("Rechercher")).toBe(false);
	});
});
