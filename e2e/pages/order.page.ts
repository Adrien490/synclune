import type { Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"

export class OrderPage {
	readonly heading: Locator
	readonly ordersTable: Locator
	readonly emptyState: Locator
	readonly sortSelect: Locator

	constructor(private page: Page) {
		this.heading = page.getByRole("heading", { name: /Mes commandes/i })
		this.ordersTable = page.getByRole("table", { name: /Liste de vos commandes/i })
		this.emptyState = page.getByRole("heading", { name: /Aucune commande/i })
		this.sortSelect = page.getByLabel(/Trier par/i)
	}

	async goto() {
		await this.page.goto("/commandes")
		await this.page.waitForLoadState("domcontentloaded")
	}

	async gotoOrder(orderNumber: string) {
		await this.page.goto(`/commandes/${orderNumber}`)
		await this.page.waitForLoadState("domcontentloaded")
	}

	async getOrderRows() {
		return this.ordersTable.locator("tbody tr")
	}

	async getOrderCount() {
		const rows = await this.getOrderRows()
		return rows.count()
	}

	async clickViewOrder(orderNumber: string) {
		const viewButton = this.page.getByLabel(`Voir la commande #${orderNumber}`)
		await viewButton.click()
		await this.page.waitForLoadState("domcontentloaded")
	}

	async hasOrders() {
		return !(await this.emptyState.isVisible())
	}
}
