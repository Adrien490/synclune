import { test, expect } from "./fixtures"

test.describe("SEO et métadonnées - Homepage", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")
	})

	test("la homepage a le titre correct", async ({ page }) => {
		await expect(page).toHaveTitle(/Synclune/)
		await expect(page).toHaveTitle(/Bijoux artisanaux/)
	})

	test("la homepage a une meta description", async ({ page }) => {
		const metaDescription = page.locator('meta[name="description"]')
		await expect(metaDescription).toHaveAttribute("content", /bijoux/i)
	})

	test("la homepage a un lien canonical", async ({ page }) => {
		const canonical = page.locator('link[rel="canonical"]')
		await expect(canonical).toBeAttached()

		const href = await canonical.getAttribute("href")
		expect(href).toBeTruthy()
	})

	test("la page a l'attribut lang='fr' sur le html", async ({ page }) => {
		const htmlElement = page.locator("html")
		await expect(htmlElement).toHaveAttribute("lang", "fr")
	})

	test("la homepage contient des données structurées JSON-LD", async ({ page }) => {
		// Wait for JSON-LD scripts to be injected
		await page.locator('script[type="application/ld+json"]').first().waitFor()

		const jsonLdScripts = page.locator('script[type="application/ld+json"]')
		const count = await jsonLdScripts.count()
		expect(count).toBeGreaterThan(0)

		// Vérifier que le JSON-LD est valide
		const firstScript = jsonLdScripts.first()
		const content = await firstScript.textContent()
		expect(content).toBeTruthy()

		// Parser le JSON pour vérifier la validité
		let parsed: unknown
		expect(() => {
			parsed = JSON.parse(content!)
		}).not.toThrow()

		// La structure doit avoir un @type
		expect(parsed).toHaveProperty("@context")
	})

	test("la homepage a des balises Open Graph", async ({ page }) => {
		const ogTitle = page.locator('meta[property="og:title"]')
		await expect(ogTitle).toBeAttached()
		await expect(ogTitle).toHaveAttribute("content", /Synclune/i)

		const ogDescription = page.locator('meta[property="og:description"]')
		await expect(ogDescription).toBeAttached()

		const ogType = page.locator('meta[property="og:type"]')
		await expect(ogType).toBeAttached()
		await expect(ogType).toHaveAttribute("content", "website")
	})

	test("la homepage a des balises Twitter Card", async ({ page }) => {
		const twitterCard = page.locator('meta[name="twitter:card"]')
		await expect(twitterCard).toBeAttached()

		const twitterTitle = page.locator('meta[name="twitter:title"]')
		await expect(twitterTitle).toBeAttached()
	})
})

test.describe("SEO et métadonnées - Page produits", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")
	})

	test("la page /produits a un titre contenant Synclune", async ({ page }) => {
		await expect(page).toHaveTitle(/Synclune/)
	})

	test("la page /produits a une meta description", async ({ page }) => {
		const metaDescription = page.locator('meta[name="description"]')
		await expect(metaDescription).toBeAttached()
		const content = await metaDescription.getAttribute("content")
		expect(content).toBeTruthy()
		expect(content!.length).toBeGreaterThan(10)
	})

	test("la page /produits a un lien canonical", async ({ page }) => {
		const canonical = page.locator('link[rel="canonical"]')
		await expect(canonical).toBeAttached()

		const href = await canonical.getAttribute("href")
		expect(href).toBeTruthy()
	})

	test("la page /produits contient des données structurées JSON-LD", async ({ page }) => {
		await page.locator('script[type="application/ld+json"]').first().waitFor()

		const jsonLdScripts = page.locator('script[type="application/ld+json"]')
		const count = await jsonLdScripts.count()
		expect(count).toBeGreaterThan(0)

		// Valider que le JSON est bien formé
		const firstContent = await jsonLdScripts.first().textContent()
		expect(() => JSON.parse(firstContent!)).not.toThrow()
	})
})

test.describe("SEO et métadonnées - Page produit détail", () => {
	test("la page détail produit a un JSON-LD de type Product", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto()

		expect(await productCatalogPage.productLinks.count(), "No products found in database - seed data required").toBeGreaterThan(0)

		await productCatalogPage.gotoFirstProduct()
		await page.locator('script[type="application/ld+json"]').first().waitFor()

		// Chercher un JSON-LD de type Product
		const jsonLdScripts = page.locator('script[type="application/ld+json"]')
		const count = await jsonLdScripts.count()
		expect(count).toBeGreaterThan(0)

		// Au moins un script doit contenir "@type":"Product"
		let hasProductSchema = false
		for (let i = 0; i < count; i++) {
			const content = await jsonLdScripts.nth(i).textContent()
			if (content && content.includes("Product")) {
				hasProductSchema = true
				break
			}
		}
		expect(hasProductSchema).toBe(true)
	})

	test("la page détail produit a un titre SEO pertinent", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto()

		expect(await productCatalogPage.productLinks.count(), "No products found in database - seed data required").toBeGreaterThan(0)

		await productCatalogPage.gotoFirstProduct()

		await expect(page).toHaveTitle(/Synclune/)
	})

	test("la page détail produit a des balises Open Graph", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto()

		expect(await productCatalogPage.productLinks.count(), "No products found in database - seed data required").toBeGreaterThan(0)

		await productCatalogPage.gotoFirstProduct()

		const ogTitle = page.locator('meta[property="og:title"]')
		await expect(ogTitle).toBeAttached()
	})
})

test.describe("SEO - Pages légales", () => {
	test("la page CGV charge correctement", async ({ page }) => {
		await page.goto("/cgv")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/cgv/)
		await expect(page).toHaveTitle(/Synclune/)
	})

	test("la page mentions légales charge correctement", async ({ page }) => {
		await page.goto("/mentions-legales")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/mentions-legales/)
	})

	test("la page confidentialité charge correctement", async ({ page }) => {
		await page.goto("/confidentialite")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/confidentialite/)
	})

	test("la page 404 s'affiche pour une route inexistante", async ({ page }) => {
		const response = await page.goto("/route-qui-nexiste-vraiment-pas-du-tout")
		expect(response?.status()).toBe(404)
	})
})

test.describe("SEO - Attributs HTML globaux", () => {
	const pagesToCheck = ["/", "/produits", "/collections", "/connexion", "/inscription"]

	for (const path of pagesToCheck) {
		test(`la page ${path} a lang="fr" sur l'élément html`, async ({ page }) => {
			await page.goto(path)
			await page.waitForLoadState("domcontentloaded")

			const htmlLang = await page.locator("html").getAttribute("lang")
			expect(htmlLang).toBe("fr")
		})
	}
})

test.describe("SEO - robots.txt et sitemap.xml", () => {
	test("robots.txt est accessible et retourne 200", async ({ page }) => {
		const response = await page.goto("/robots.txt")

		expect(response?.status()).toBe(200)

		const body = await response?.text()
		expect(body).toBeTruthy()
		expect(body).toContain("User-agent")
	})

	test("sitemap.xml est accessible et contient du XML valide", async ({ page }) => {
		const response = await page.goto("/sitemap.xml")

		expect(response?.status()).toBe(200)

		const body = await response?.text()
		expect(body).toBeTruthy()
		expect(body).toContain("<?xml")
		expect(body).toContain("<urlset")
	})

	test("sitemap.xml contient les pages principales", async ({ page }) => {
		const response = await page.goto("/sitemap.xml")
		const body = await response?.text()

		expect(body).toContain("/produits")
		expect(body).toContain("/collections")
	})
})

test.describe("SEO - noindex sur pages privees", () => {
	test("la page /~offline a noindex", async ({ page }) => {
		await page.goto("/~offline")
		await page.waitForLoadState("domcontentloaded")

		const robotsMeta = page.locator('meta[name="robots"]')
		await expect(robotsMeta).toBeAttached()

		const content = await robotsMeta.getAttribute("content")
		expect(content).toMatch(/noindex/)
	})

	test("la page /verifier-email a noindex", async ({ page }) => {
		await page.goto("/verifier-email")
		await page.waitForLoadState("domcontentloaded")

		const robotsMeta = page.locator('meta[name="robots"]')
		await expect(robotsMeta).toBeAttached()

		const content = await robotsMeta.getAttribute("content")
		expect(content).toMatch(/noindex/)
	})

	test("la page /renvoyer-verification a noindex", async ({ page }) => {
		await page.goto("/renvoyer-verification")
		await page.waitForLoadState("domcontentloaded")

		const robotsMeta = page.locator('meta[name="robots"]')
		await expect(robotsMeta).toBeAttached()

		const content = await robotsMeta.getAttribute("content")
		expect(content).toMatch(/noindex/)
	})
})
