import { test, expect } from "./fixtures"

test.describe("Admin - elements UI visibles apres redirection", { tag: ["@regression"] }, () => {
	test("le formulaire de connexion a tous les elements requis", async ({ page, authPage }) => {
		await page.goto("/admin")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/connexion/)

		await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
		await expect(authPage.emailInput).toBeVisible()
		await expect(authPage.passwordInput).toBeVisible()
		await expect(authPage.submitButton).toBeVisible()

		await expect(authPage.socialButtons.first()).toBeAttached()
	})
})
