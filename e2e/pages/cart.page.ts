import type { Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"

export class CartPage {
	readonly openButton: Locator
	readonly dialog: Locator
	readonly emptyMessage: Locator
	readonly shopLink: Locator
	readonly collectionsLink: Locator
	readonly closeButton: Locator
	readonly title: Locator
	readonly checkoutLink: Locator

	constructor(private page: Page) {
		this.openButton = page.getByRole("button", { name: /Ouvrir mon panier/i })
		this.dialog = page.getByRole("dialog")
		this.emptyMessage = this.dialog.getByText(/Votre panier est vide/i)
		this.shopLink = this.dialog.getByRole("link", { name: /Découvrir la boutique/i })
		this.collectionsLink = this.dialog.getByRole("link", { name: /Voir les collections/i })
		this.closeButton = this.dialog.getByRole("button", { name: /Fermer/i })
		this.title = this.dialog.getByText(/Mon panier/i)
		this.checkoutLink = this.dialog.getByRole("link", { name: /Passer commande|Commander|Paiement/i })
	}

	async open() {
		await this.openButton.click()
		await expect(this.dialog).toBeVisible()
	}

	async close() {
		await this.closeButton.click()
		await expect(this.dialog).not.toBeVisible()
	}
}
