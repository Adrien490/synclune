import { test, expect } from "@playwright/test"

test.describe("Panier", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")
	})

	test("le bouton panier est présent dans la navbar", async ({ page }) => {
		const cartButton = page.getByRole("button", { name: /Ouvrir mon panier/i })
		await expect(cartButton).toBeVisible()
	})

	test("cliquer sur le bouton panier ouvre le cart sheet", async ({ page }) => {
		const cartButton = page.getByRole("button", { name: /Ouvrir mon panier/i })
		await cartButton.click()

		// Le sheet du panier doit s'ouvrir (role=dialog)
		const cartDialog = page.getByRole("dialog")
		await expect(cartDialog).toBeVisible()

		// Le titre «Mon panier» doit être présent
		await expect(cartDialog.getByText(/Mon panier/i)).toBeVisible()
	})

	test("le panier vide affiche un message d'état vide", async ({ page }) => {
		const cartButton = page.getByRole("button", { name: /Ouvrir mon panier/i })
		await cartButton.click()

		const cartDialog = page.getByRole("dialog")
		await expect(cartDialog).toBeVisible()

		// Le panier est vide: message «Votre panier est vide»
		await expect(
			cartDialog.getByText(/Votre panier est vide/i)
		).toBeVisible()
	})

	test("le panier vide propose un lien vers la boutique", async ({ page }) => {
		const cartButton = page.getByRole("button", { name: /Ouvrir mon panier/i })
		await cartButton.click()

		const cartDialog = page.getByRole("dialog")
		await expect(cartDialog).toBeVisible()

		// Bouton «Découvrir la boutique»
		const shopLink = cartDialog.getByRole("link", { name: /Découvrir la boutique/i })
		await expect(shopLink).toBeVisible()
		await expect(shopLink).toHaveAttribute("href", "/produits")
	})

	test("le panier vide propose un lien vers les collections", async ({ page }) => {
		const cartButton = page.getByRole("button", { name: /Ouvrir mon panier/i })
		await cartButton.click()

		const cartDialog = page.getByRole("dialog")
		await expect(cartDialog).toBeVisible()

		// Lien «Voir les collections»
		const collectionsLink = cartDialog.getByRole("link", { name: /Voir les collections/i })
		await expect(collectionsLink).toBeVisible()
		await expect(collectionsLink).toHaveAttribute("href", "/collections")
	})

	test("le cart sheet se ferme via le bouton de fermeture", async ({ page }) => {
		const cartButton = page.getByRole("button", { name: /Ouvrir mon panier/i })
		await cartButton.click()

		const cartDialog = page.getByRole("dialog")
		await expect(cartDialog).toBeVisible()

		// Fermer le sheet via le bouton X
		const closeButton = cartDialog.getByRole("button", { name: /Fermer/i })
		await closeButton.click()

		// Le sheet doit être fermé
		await expect(cartDialog).not.toBeVisible()
	})

	test("le cart sheet se ferme avec la touche Escape", async ({ page }) => {
		const cartButton = page.getByRole("button", { name: /Ouvrir mon panier/i })
		await cartButton.click()

		const cartDialog = page.getByRole("dialog")
		await expect(cartDialog).toBeVisible()

		// Appuyer sur Escape
		await page.keyboard.press("Escape")

		// Le sheet doit être fermé
		await expect(cartDialog).not.toBeVisible()
	})

	test("l'attribut aria-expanded du bouton panier reflète l'état du sheet", async ({ page }) => {
		const cartButton = page.getByRole("button", { name: /Ouvrir mon panier/i })

		// Initialement fermé
		await expect(cartButton).toHaveAttribute("aria-expanded", "false")

		// Ouvrir le sheet
		await cartButton.click()
		await expect(cartButton).toHaveAttribute("aria-expanded", "true")
	})

	test("le badge panier affiche 0 ou aucun badge quand le panier est vide", async ({ page }) => {
		// Le badge du panier ne doit pas afficher de nombre quand il est vide
		// (ou doit être absent / afficher 0)
		const cartButton = page.getByRole("button", { name: /Ouvrir mon panier/i })
		await expect(cartButton).toBeVisible()

		// Le bouton ne doit pas afficher de badge avec un nombre > 0 si le panier est vide
		// (implémentation: le badge a un texte numérique uniquement si > 0)
		// The button should not display a count > 0 when cart is empty
		const badgeText = await cartButton.textContent()
		const numbers = badgeText?.match(/\d+/)
		const count = numbers ? parseInt(numbers[0], 10) : 0
		expect(count).toBe(0)
	})
})
