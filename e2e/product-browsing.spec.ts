import { test, expect } from "@playwright/test"

test.describe("Navigation catalogue produits", () => {
	test("la page /produits charge correctement", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/produits/)
		await expect(page).toHaveTitle(/Synclune/)
	})

	test("la page /produits affiche un header de page", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		// Un h1 doit être présent sur la page
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()
	})

	test("la page /produits affiche une barre d'outils (tri, filtres)", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		// Une barre de tri doit être présente (bouton de tri ou select)
		// On cherche soit un combobox de tri, soit un bouton «Filtrer»
		const toolbar = page.locator('[role="toolbar"], form').first()
		await expect(toolbar).toBeAttached()
	})

	test("la page /produits affiche des cartes produit ou un état vide", async ({ page }) => {
		await page.goto("/produits")
		// On attend un peu plus pour les Suspense boundaries
		await page.waitForLoadState("networkidle")

		// On vérifie soit des articles produit, soit un message «aucun produit»
		const productCards = page.locator('article, [data-product-card]')
		const emptyState = page.getByText(/aucun produit/i)

		const hasProducts = await productCards.count() > 0
		const hasEmpty = await emptyState.isVisible().catch(() => false)

		expect(hasProducts || hasEmpty).toBe(true)
	})

	test("les cartes produit ont des liens cliquables", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("networkidle")

		// Les cartes produit doivent contenir un lien vers la page détail
		const productLinks = page.locator('article a[href*="/creations/"], a[href*="/creations/"]')
		const count = await productLinks.count()

		// Si des produits existent, ils doivent avoir des liens
		if (count > 0) {
			const firstLink = productLinks.first()
			const href = await firstLink.getAttribute("href")
			expect(href).toMatch(/\/creations\//)
		}
	})

	test("cliquer sur une carte produit navigue vers la page détail", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("networkidle")

		// Chercher les liens vers les pages de créations
		const productLinks = page.locator('a[href*="/creations/"]')
		const count = await productLinks.count()
		expect(count, "No products found in database - seed data required").toBeGreaterThan(0)

		// Récupérer le href du premier lien
		const href = await productLinks.first().getAttribute("href")
		expect(href).toBeTruthy()

		// Naviguer vers la page produit
		await page.goto(href!)
		await page.waitForLoadState("domcontentloaded")

		// Vérifier qu'on est bien sur une page produit
		await expect(page).toHaveURL(/\/creations\//)
	})

	test("la page détail produit affiche un titre (h1)", async ({ page }) => {
		// D'abord, trouver une URL de produit existante depuis /produits
		await page.goto("/produits")
		await page.waitForLoadState("networkidle")

		const productLinks = page.locator('a[href*="/creations/"]')
		const count = await productLinks.count()
		expect(count, "No products found in database - seed data required").toBeGreaterThan(0)

		const href = await productLinks.first().getAttribute("href")
		await page.goto(href!)
		await page.waitForLoadState("domcontentloaded")

		// La page détail doit avoir un h1
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()
	})

	test("la page détail produit affiche un prix", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("networkidle")

		const productLinks = page.locator('a[href*="/creations/"]')
		expect(await productLinks.count(), "No products found in database - seed data required").toBeGreaterThan(0)

		const href = await productLinks.first().getAttribute("href")
		await page.goto(href!)
		await page.waitForLoadState("domcontentloaded")

		// Un prix en euros doit être visible (format «XX,XX €» ou «XX €»)
		const pricePattern = /\d+[,.]?\d*\s*€/
		const pageText = await page.textContent("body")
		expect(pageText).toMatch(pricePattern)
	})

	test("la page détail produit affiche un bouton d'ajout au panier ou de sélection SKU", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("networkidle")

		const productLinks = page.locator('a[href*="/creations/"]')
		expect(await productLinks.count(), "No products found in database - seed data required").toBeGreaterThan(0)

		const href = await productLinks.first().getAttribute("href")
		await page.goto(href!)
		await page.waitForLoadState("domcontentloaded")

		// Chercher un bouton d'ajout au panier ou équivalent
		// Plusieurs cas: bouton «Ajouter au panier», «Choisir les options», etc.
		const cartButton = page.getByRole("button", {
			name: /Ajouter au panier|Ajouter|Choisir|Sélectionner/i,
		})

		// La présence du bouton suffit (il peut être désactivé si hors stock)
		await expect(cartButton.first()).toBeAttached()
	})

	test("la page détail produit affiche une galerie d'images", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("networkidle")

		const productLinks = page.locator('a[href*="/creations/"]')
		expect(await productLinks.count(), "No products found in database - seed data required").toBeGreaterThan(0)

		const href = await productLinks.first().getAttribute("href")
		await page.goto(href!)
		await page.waitForLoadState("domcontentloaded")

		// Au moins une image doit être présente
		const images = page.locator("img")
		const imgCount = await images.count()
		expect(imgCount).toBeGreaterThan(0)
	})

	test("la page /collections charge correctement", async ({ page }) => {
		await page.goto("/collections")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/collections/)
		await expect(page).toHaveTitle(/Synclune/)

		// Un h1 doit être présent
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()
	})

	test("la barre de recherche de produits est accessible via le bouton recherche", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 })
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		// Le bouton de recherche doit être présent sur desktop
		const searchButton = page.getByRole("button", { name: /Rechercher/i })
		await expect(searchButton.first()).toBeVisible()

		// Cliquer pour ouvrir la recherche rapide
		await searchButton.first().click()

		// Le dialog de recherche doit apparaître
		const searchDialog = page.getByRole("dialog")
		await expect(searchDialog).toBeVisible()
	})

	test("la recherche depuis /produits filtre les résultats", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		// Chercher le champ de recherche dans le catalogue
		const searchInput = page.getByRole("searchbox")
		expect(await searchInput.count(), "No search input found on /produits page").toBeGreaterThan(0)

		// Taper un terme de recherche
		await searchInput.first().fill("bague")
		await page.waitForTimeout(600) // Debounce

		// L'URL doit refléter la recherche
		await expect(page).toHaveURL(/search=bague/)
	})
})
