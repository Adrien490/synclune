import { test, expect } from "./fixtures"

test.describe("Navigation catalogue produits", { tag: ["@critical"] }, () => {
	test("la page /produits charge correctement", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/produits/)
		await expect(page).toHaveTitle(/Synclune/)
	})

	test("la page /produits affiche un header de page", async ({ productCatalogPage }) => {
		await productCatalogPage.goto()
		await expect(productCatalogPage.heading).toBeVisible()
	})

	test("la page /produits affiche une barre d'outils (tri, filtres)", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		const toolbar = page.locator('[role="toolbar"], form').first()
		await expect(toolbar).toBeAttached()
	})

	test("la page /produits affiche des cartes produit ou un état vide", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto()

		const productCards = page.locator('article, [data-product-card]')
		const emptyState = page.getByText(/aucun produit/i)

		await expect(productCards.first().or(emptyState)).toBeVisible({ timeout: 5000 })
	})

	test("les cartes produit ont des liens cliquables", async ({ productCatalogPage }) => {
		await productCatalogPage.goto()

		const count = await productCatalogPage.productLinks.count()

		if (count > 0) {
			const firstLink = productCatalogPage.productLinks.first()
			const href = await firstLink.getAttribute("href")
			expect(href).toMatch(/\/creations\//)
		}
	})

	test("cliquer sur une carte produit navigue vers la page détail", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto()

		const count = await productCatalogPage.productLinks.count()
		expect(count, "No products found in database - seed data required").toBeGreaterThan(0)

		const href = await productCatalogPage.productLinks.first().getAttribute("href")
		expect(href).toBeTruthy()

		await page.goto(href!)
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/creations\//)
	})

	test("la page détail produit affiche un titre (h1)", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto()

		const count = await productCatalogPage.productLinks.count()
		expect(count, "No products found in database - seed data required").toBeGreaterThan(0)

		await productCatalogPage.gotoFirstProduct()

		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()
	})

	test("la page détail produit affiche un prix", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto()
		expect(await productCatalogPage.productLinks.count(), "No products found in database - seed data required").toBeGreaterThan(0)

		await productCatalogPage.gotoFirstProduct()

		const pricePattern = /\d+[,.]?\d*\s*€/
		const pageText = await page.textContent("body")
		expect(pageText).toMatch(pricePattern)
	})

	test("la page détail produit affiche un bouton d'ajout au panier ou de sélection SKU", async ({ productCatalogPage }) => {
		await productCatalogPage.goto()
		expect(await productCatalogPage.productLinks.count(), "No products found in database - seed data required").toBeGreaterThan(0)

		await productCatalogPage.gotoFirstProduct()

		await expect(productCatalogPage.addToCartButton.first()).toBeAttached()
	})

	test("la page détail produit affiche une galerie d'images", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto()
		expect(await productCatalogPage.productLinks.count(), "No products found in database - seed data required").toBeGreaterThan(0)

		await productCatalogPage.gotoFirstProduct()

		const images = page.locator("img")
		const imgCount = await images.count()
		expect(imgCount).toBeGreaterThan(0)
	})

	test("la page /collections charge correctement", async ({ page }) => {
		await page.goto("/collections")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/collections/)
		await expect(page).toHaveTitle(/Synclune/)

		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()
	})

	test("la barre de recherche de produits est accessible via le bouton recherche", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 })
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		const searchButton = page.getByRole("button", { name: /Rechercher/i })
		await expect(searchButton.first()).toBeVisible()

		await searchButton.first().click()

		const searchDialog = page.getByRole("dialog")
		await expect(searchDialog).toBeVisible()
	})

	test("la recherche depuis /produits filtre les résultats", async ({ page, productCatalogPage }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		expect(await productCatalogPage.searchInput.count(), "No search input found on /produits page").toBeGreaterThan(0)

		await productCatalogPage.searchInput.first().fill("bague")
		await expect(page).toHaveURL(/search=bague/, { timeout: 5000 })
	})
})
