import { test, expect } from "./fixtures"

test.describe("Visual regression - Pages cles", () => {
	test("homepage - snapshot", async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("networkidle")

		// Wait for above-the-fold content to stabilize
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		await expect(page).toHaveScreenshot("homepage.png", {
			fullPage: false,
			maxDiffPixelRatio: 0.05,
		})
	})

	test("page produits - snapshot", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("networkidle")

		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		await expect(page).toHaveScreenshot("products-page.png", {
			fullPage: false,
			maxDiffPixelRatio: 0.05,
		})
	})

	test("page detail produit - snapshot", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto()

		const productCount = await productCatalogPage.productLinks.count()
		test.skip(productCount === 0, "Seed data required")

		await productCatalogPage.gotoFirstProduct()
		await page.waitForLoadState("networkidle")

		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		await expect(page).toHaveScreenshot("product-detail.png", {
			fullPage: false,
			maxDiffPixelRatio: 0.05,
		})
	})

	test("page connexion - snapshot", async ({ page }) => {
		await page.goto("/connexion")
		await page.waitForLoadState("networkidle")

		const submitButton = page.getByRole("button", { name: /Se connecter/i })
		await expect(submitButton).toBeVisible()

		await expect(page).toHaveScreenshot("login-page.png", {
			fullPage: false,
			maxDiffPixelRatio: 0.05,
		})
	})

	test("page collections - snapshot", async ({ page }) => {
		await page.goto("/collections")
		await page.waitForLoadState("networkidle")

		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		await expect(page).toHaveScreenshot("collections-page.png", {
			fullPage: false,
			maxDiffPixelRatio: 0.05,
		})
	})
})
