import type { Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"

export class CheckoutPage {
	readonly fullNameInput: Locator
	readonly addressInput: Locator
	readonly postalCodeInput: Locator
	readonly cityInput: Locator
	readonly phoneInput: Locator
	readonly termsCheckbox: Locator
	readonly continueButton: Locator
	readonly discountTrigger: Locator
	readonly discountInput: Locator
	readonly discountApplyButton: Locator
	readonly discountError: Locator
	readonly discountRemoveButton: Locator

	constructor(readonly page: Page) {
		this.fullNameInput = page.getByLabel(/Nom complet|Prénom et nom/i)
		this.addressInput = page.getByLabel(/^Adresse$|Adresse ligne 1/i)
		this.postalCodeInput = page.getByLabel(/Code postal/i)
		this.cityInput = page.getByLabel(/Ville/i)
		this.phoneInput = page.getByLabel(/Téléphone/i)
		this.termsCheckbox = page.getByLabel(/conditions générales|J'accepte/i)
		this.continueButton = page.getByRole("button", { name: /Continuer|Valider|Payer/i })
		this.discountTrigger = page.getByText(/J'ai un code promo/i)
		this.discountInput = page.getByLabel(/Code promo/i)
		this.discountApplyButton = page.getByRole("button", { name: /Appliquer/i })
		this.discountError = page.locator("#discount-error")
		this.discountRemoveButton = page.getByLabel(/Supprimer le code promo/i)
	}

	async fillAddress(data?: {
		fullName?: string
		address?: string
		postalCode?: string
		city?: string
		phone?: string
	}) {
		const defaults = {
			fullName: "Marie Dupont",
			address: "12 rue de la Paix",
			postalCode: "75002",
			city: "Paris",
			phone: "0612345678",
		}
		const d = { ...defaults, ...data }

		await this.fullNameInput.fill(d.fullName)
		await this.addressInput.fill(d.address)
		await this.postalCodeInput.fill(d.postalCode)
		await this.cityInput.fill(d.city)
		await this.phoneInput.fill(d.phone)

		if (await this.termsCheckbox.isVisible()) {
			await this.termsCheckbox.check()
		}
	}

	async submitAddress() {
		await expect(this.continueButton).toBeEnabled()
		await this.continueButton.click()
	}

	async waitForStripeFrame() {
		await expect(async () => {
			const frameCount = await this.page.locator('iframe[src*="stripe"]').count()
			expect(frameCount).toBeGreaterThan(0)
		}).toPass({ timeout: 15000 })

		return this.page.frameLocator('iframe[src*="stripe"]').first()
	}

	async fillStripeCard(
		stripeFrame: ReturnType<Page["frameLocator"]>,
		card = "4242424242424242",
	) {
		const cardInput = stripeFrame
			.getByPlaceholder(/numéro de carte|card number/i)
			.or(stripeFrame.locator('[name="cardNumber"]'))
			.or(stripeFrame.locator("#cardNumber"))
		await cardInput.fill(card)

		const expiryInput = stripeFrame
			.getByPlaceholder(/MM \/ AA|expiry/i)
			.or(stripeFrame.locator('[name="cardExpiry"]'))
			.or(stripeFrame.locator("#cardExpiry"))
		await expiryInput.fill("12/30")

		const cvcInput = stripeFrame
			.getByPlaceholder(/CVC|CVV/i)
			.or(stripeFrame.locator('[name="cardCvc"]'))
			.or(stripeFrame.locator("#cardCvc"))
		await cvcInput.fill("123")
	}

	async submitPayment(stripeFrame: ReturnType<Page["frameLocator"]>) {
		const payButton = stripeFrame.getByRole("button", { name: /Payer|Pay/i })
		await payButton.click()
	}

	async openDiscountSection() {
		await this.discountTrigger.click()
		await expect(this.discountInput).toBeVisible()
	}

	async applyDiscountCode(code: string) {
		await this.discountInput.fill(code)
		await this.discountApplyButton.click()
	}

	async removeDiscountCode() {
		await this.discountRemoveButton.click()
	}
}
