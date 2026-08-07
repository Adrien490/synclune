/**
 * @regression add-to-cart-locator-2026-08-07
 *
 * Le locator « ajouter au panier » des page objects e2e doit matcher les noms
 * accessibles que le code produit VRAIMENT — et surtout **pas** ceux du bouton
 * favoris.
 *
 * ## Le bug que ce test verrouille
 *
 * `ProductCatalogPage.addToCartButton` valait :
 *
 * ```ts
 * page.getByRole("button", { name: /Ajouter au panier|Ajouter/i })
 * ```
 *
 * L'alternative `|Ajouter` matche « Ajouter *&lt;produit&gt;* **aux favoris** »
 * (`wishlist-button.tsx`), qui précède le CTA panier dans l'ordre DOM de la fiche
 * produit. `addToCartButton.first()` désignait donc le bouton **favoris** :
 * `addFirstProductToCart()` ajoutait aux souhaits, puis attendait un Sheet panier
 * qui ne s'ouvrait jamais.
 *
 * Le défaut est resté invisible parce que `checkout.spec.ts` retombait sur
 * `getByText(/ajouté|panier/i)` — or le toast « Ajouté aux favoris » contient
 * « ajouté ». La spec passait donc **pour la mauvaise raison**, et la seule
 * conséquence visible était un panier vide au moment d'auditer `/paiement`.
 *
 * ## Méthode
 *
 * Les trois libellés sont **dérivés du code source**, pas recopiés : un test qui
 * répète une constante ne peut pas voir qu'elle est fausse.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");

const read = (p: string) => readFileSync(join(ROOT, p), "utf-8");

/** Le motif effectivement utilisé par le page object. */
function extractAddToCartPattern(): RegExp {
	const source = read("e2e/pages/product-catalog.page.ts");
	const match = source.match(
		/this\.addToCartButton = page\.getByRole\("button", \{ name: (\/.+?\/i) \}\)/,
	);
	const literal = match?.[1];
	if (!literal) throw new Error("addToCartButton introuvable dans product-catalog.page.ts");
	const body = literal.slice(1, literal.lastIndexOf("/"));
	return new RegExp(body, "i");
}

const PRODUCT_TITLE = "Papilloux Duo Symétrie";

describe("Locator « ajouter au panier » des page objects", () => {
	const pattern = extractAddToCartPattern();

	it("matche le CTA de la fiche produit (texte nu)", () => {
		// `add-to-cart-form.tsx` rend « Ajouter au panier » sans aria-label.
		expect(read("modules/cart/components/add-to-cart-form.tsx")).toContain(
			"<span>Ajouter au panier</span>",
		);
		expect(pattern.test("Ajouter au panier")).toBe(true);
	});

	it("matche le CTA des cartes catalogue (aria-label par produit)", () => {
		// `add-to-cart-card-button.tsx` : `Ajouter ${productTitle} au panier`.
		expect(read("modules/cart/components/add-to-cart-card-button.tsx")).toContain(
			'aria-label={`Ajouter ${productTitle ?? "ce produit"} au panier`}',
		);
		expect(pattern.test(`Ajouter ${PRODUCT_TITLE} au panier`)).toBe(true);
		expect(pattern.test("Ajouter ce produit au panier")).toBe(true);
	});

	it("ne matche JAMAIS le bouton favoris — c'est le bug d'origine", () => {
		// `wishlist-button.tsx` : `Ajouter ${productTitle} aux favoris`.
		expect(read("modules/wishlist/components/wishlist-button.tsx")).toContain(
			"`Ajouter ${productTitle} aux favoris`",
		);

		for (const wishlistLabel of [
			`Ajouter ${PRODUCT_TITLE} aux favoris`,
			"Ajouter aux favoris",
			`Retirer ${PRODUCT_TITLE} des favoris`,
			"Retirer des favoris",
		]) {
			expect(
				pattern.test(wishlistLabel),
				`Le locator panier matche « ${wishlistLabel} » : .first() cliquerait le bouton favoris.`,
			).toBe(false);
		}
	});
});
