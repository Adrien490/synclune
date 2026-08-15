import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { CartPage } from "./cart.page";
import type { ProductCatalogPage } from "./product-catalog.page";

type SeedCartResult = { skipped: false } | { skipped: true; reason: string; seedData: boolean };

/**
 * Page `/paiement` — Stripe Checkout HÉBERGÉ (migration lean, lot 3).
 *
 * La page n'a plus AUCUN champ de carte ni d'adresse : c'est un récapitulatif
 * (liste des articles) + un select « Pays de livraison » + un bouton submit
 * « Payer avec Stripe » qui crée la session et redirige vers
 * checkout.stripe.com. On ne pilote JAMAIS la page hébergée Stripe.
 */
export class CheckoutPage {
	readonly countrySelect: Locator;
	readonly payButton: Locator;
	readonly emptyCartMessage: Locator;
	readonly heading: Locator;

	constructor(readonly page: Page) {
		this.countrySelect = page.getByLabel(/Pays de livraison/i);
		this.payButton = page.getByRole("button", { name: /Payer avec Stripe/i });
		this.emptyCartMessage = page.getByText(/Ton panier est vide/i);
		this.heading = page.getByRole("heading", { level: 1, name: /Ta commande/i });
	}

	/**
	 * Amène sur `/paiement` avec le VRAI récapitulatif rendu (panier semé).
	 *
	 * ⚠️ **`/paiement` ne redirige PAS sur panier vide** — la page rend un état
	 * « Ton panier est vide » en RESTANT sur l'URL. D'où les **assertions
	 * positives** ci-dessous (select pays + bouton Payer visibles) : sans
	 * elles, un test redeviendrait silencieusement vert sur l'état vide au
	 * premier changement du parcours d'ajout au panier — c'est arrivé aux
	 * audits axe de l'ancien tunnel (cf. historique de ce fichier).
	 */
	async gotoWithSeededCart(
		productCatalogPage: ProductCatalogPage,
		cartPage: CartPage,
	): Promise<SeedCartResult> {
		const seeded = await productCatalogPage.addFirstProductToCart(cartPage);
		if (seeded.skipped) return seeded;

		await this.page.goto("/paiement");
		await this.page.waitForLoadState("domcontentloaded");

		// Le récapitulatif existe vraiment — pas l'état « panier vide ».
		await expect(this.countrySelect).toBeVisible({ timeout: 15000 });
		await expect(this.emptyCartMessage).toHaveCount(0);
		await expect(this.payButton).toBeVisible({ timeout: 15000 });

		return { skipped: false };
	}
}
