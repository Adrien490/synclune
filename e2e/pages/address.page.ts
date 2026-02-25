import type { Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"

export class AddressPage {
	readonly heading: Locator
	readonly addButton: Locator

	constructor(private page: Page) {
		this.heading = page.getByRole("heading", { name: /Mes adresses/i })
		this.addButton = page.getByRole("button", { name: /Ajouter/i })
	}

	async goto() {
		await this.page.goto("/adresses")
		await this.page.waitForLoadState("domcontentloaded")
	}

	async openCreateDialog() {
		await this.addButton.click()
		await expect(
			this.page.getByRole("heading", { name: /Ajouter une adresse/i }),
		).toBeVisible()
	}

	async fillAddressForm(data: {
		firstName: string
		lastName: string
		address1: string
		postalCode: string
		city: string
		phone?: string
	}) {
		await this.page.getByLabel(/Prénom/i).fill(data.firstName)
		await this.page.getByLabel(/Nom/i).fill(data.lastName)
		await this.page.getByPlaceholder(/Rechercher une adresse/i).fill(data.address1)
		await this.page.getByLabel(/Code postal/i).fill(data.postalCode)
		await this.page.getByLabel(/Ville/i).fill(data.city)
		if (data.phone) {
			await this.page.getByPlaceholder(/06 12 34 56 78/i).fill(data.phone)
		}
	}

	async submitForm() {
		const submitButton = this.page.getByRole("button", { name: /Ajouter|Enregistrer/i })
		await submitButton.click()
	}

	async createAddress(data: {
		firstName: string
		lastName: string
		address1: string
		postalCode: string
		city: string
		phone?: string
	}) {
		await this.openCreateDialog()
		await this.fillAddressForm(data)
		await this.submitForm()
		// Wait for success feedback
		await expect(this.page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 })
	}

	async getAddressCards() {
		return this.page.locator("[data-address-card], article").filter({ hasText: /adresse/i })
	}
}
