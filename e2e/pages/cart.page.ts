import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class CartPage {
	readonly openButton: Locator;
	readonly dialog: Locator;
	readonly emptyMessage: Locator;
	readonly shopLink: Locator;
	readonly collectionsLink: Locator;
	readonly closeButton: Locator;
	readonly title: Locator;
	readonly checkoutLink: Locator;

	constructor(private page: Page) {
		/**
		 * ⚠️ **Deux déclencheurs, selon la largeur — et c'est le point.**
		 *
		 * `CartSheetTrigger` (`aria-label="Ouvrir mon panier"`) vit dans la navbar
		 * en `hidden lg:inline-flex` : sous 64 rem il est en `display:none`, donc
		 * absent de l'arbre d'accessibilité. Sous ce seuil, le seul ouvreur est
		 * l'onglet de `ShopMobileBottomNav`, dont le libellé est
		 * `Panier : N articles` / `Panier vide`.
		 *
		 * Ne cibler que le premier rendait TOUTE cette suite inopérante sur les
		 * projets `mobile-chrome` (412 px) et `mobile-webkit` (390 px) — qui
		 * exécutent pourtant `cart.spec.ts`. C'est ce trou qui a laissé la branche
		 * `Drawer` sans couverture, et avec elle l'absence de bouton de fermeture
		 * sur mobile : le test nommé « se ferme via le bouton de fermeture »
		 * n'atteignait jamais l'assertion.
		 *
		 * ⚠️ **Le libellé mobile vient de `tabAriaLabel`, PAS de la région
		 * d'annonce.** Les deux vivent dans `shop-mobile-bottom-nav.tsx` et
		 * divergent : la région écrit `Panier : 3 articles` (deux-points), tandis
		 * que `tabAriaLabel` — celui du bouton — écrit `Panier, 3 articles`
		 * (virgule), et `Panier` tout court quand le panier est vide. Un premier
		 * correctif avait dérivé son motif de la mauvaise chaîne et ne matchait
		 * donc AUCUNE des trois formes. D'où `^Panier` sans suffixe, et le test
		 * de couture `cart-open-button-label.regression.test.ts` qui compose les
		 * libellés depuis la vraie fonction.
		 */
		// `.filter({ visible: true })` : le bouton navbar est `hidden lg:inline-flex`
		// — sur mobile c'est l'onglet « Panier » de la bottom-nav qui est visible,
		// et le `.first()` nu tombait sur le bouton desktop caché.
		this.openButton = page
			.getByRole("button", { name: /Ouvrir mon panier|^Panier/i })
			.filter({ visible: true })
			.first();
		this.dialog = page.getByRole("dialog");
		this.emptyMessage = this.dialog.getByText(/Ton panier est encore vide/i);
		this.shopLink = this.dialog.getByRole("link", { name: /Découvrir la boutique/i });
		this.collectionsLink = this.dialog.getByRole("link", { name: /Voir les collections/i });
		this.closeButton = this.dialog.getByRole("button", { name: /Fermer le panier/i });
		this.title = this.dialog.getByText(/Mon panier/i);
		this.checkoutLink = this.dialog.getByRole("link", {
			name: /Passer commande|Commander|Paiement/i,
		});
	}

	async open() {
		// Deux pièges mesurés sous la charge d'un run complet :
		// - le bouton est peint avant d'être hydraté — un clic trop tôt part
		//   dans le vide, d'où le re-clic jusqu'à réponse ;
		// - sur mobile, l'ajout au panier ouvre DÉJÀ le drawer : cliquer alors
		//   l'onglet Panier atterrit sur le backdrop modal et FERME l'overlay
		//   qu'on voulait ouvrir (boucle ouverte/fermée jusqu'au timeout). On ne
		//   clique donc que si aucun dialog n'est visible.
		await expect(async () => {
			if (!(await this.dialog.isVisible())) {
				// Timeout COURT + catch : pendant que le drawer d'ajout s'anime, la
				// bottom-bar mobile se dépublie — le bouton filtré visible ne
				// résout plus RIEN et un click() sans timeout pendait jusqu'au bout
				// du toPass alors que le panier était déjà ouvert à l'écran.
				await this.openButton.click({ timeout: 1000 }).catch(() => {});
			}
			await expect(this.dialog).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15_000 });
	}

	async close() {
		await this.closeButton.click();
		await expect(this.dialog).not.toBeVisible();
	}
}
