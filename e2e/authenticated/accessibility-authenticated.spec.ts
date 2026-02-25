import AxeBuilder from "@axe-core/playwright"
import { test, expect } from "../fixtures"

test.describe("Accessibilité - Pages authentifiées", () => {
	const authenticatedPages = [
		{ path: "/compte", name: "Compte" },
		{ path: "/compte/commandes", name: "Commandes" },
		{ path: "/compte/adresses", name: "Adresses" },
		{ path: "/parametres", name: "Paramètres" },
	]

	for (const { path, name } of authenticatedPages) {
		test(`${name} (${path}) passe l'audit axe-core WCAG AA`, async ({ page }) => {
			await page.goto(path)
			await page.waitForLoadState("domcontentloaded")

			const results = await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
				.analyze()

			expect(results.violations).toEqual([])
		})
	}
})
