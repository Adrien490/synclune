import type { Locator, Page } from "@playwright/test"

export class AdminPage {
	readonly heading: Locator
	readonly ordersLink: Locator
	readonly productsLink: Locator
	readonly searchInput: Locator
	readonly viewSiteLink: Locator

	constructor(private page: Page) {
		this.heading = page.getByRole("heading", { name: /Tableau de bord/i })
		this.ordersLink = page.getByRole("link", { name: /Commandes/i }).first()
		this.productsLink = page.getByRole("link", { name: /Produits/i }).first()
		this.searchInput = page.getByPlaceholder(/Rechercher/i)
		this.viewSiteLink = page.getByRole("link", { name: /Voir le site/i })
	}

	async goto() {
		await this.page.goto("/admin")
		await this.page.waitForLoadState("domcontentloaded")
	}

	async gotoOrders() {
		await this.page.goto("/admin/ventes/commandes")
		await this.page.waitForLoadState("domcontentloaded")
	}

	async gotoProducts() {
		await this.page.goto("/admin/catalogue/produits")
		await this.page.waitForLoadState("domcontentloaded")
	}
}
