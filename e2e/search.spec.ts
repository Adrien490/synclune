import { test, expect } from "./fixtures"

test.describe("Recherche produits", { tag: ["@critical"] }, () => {
	test("le champ de recherche est visible sur la page produits", async ({ searchPage }) => {
		await searchPage.open()

		await expect(searchPage.searchInput.first()).toBeVisible()
	})

	test("la recherche met a jour les resultats", async ({ searchPage }) => {
		await searchPage.open()

		const inputCount = await searchPage.searchInput.count()
		test.skip(inputCount === 0, "No search input on /produits page")

		await searchPage.search("bague")

		// Either products or empty state should be visible
		const results = await searchPage.getResults()
		const emptyState = searchPage.page.getByText(/aucun (résultat|produit)/i)

		await expect(results.first().or(emptyState)).toBeVisible({ timeout: 5000 })
	})

	test("la recherche sans resultats affiche un etat vide", async ({ searchPage }) => {
		await searchPage.open()

		const inputCount = await searchPage.searchInput.count()
		test.skip(inputCount === 0, "No search input on /produits page")

		await searchPage.search("xyznonexistent12345")

		const emptyState = searchPage.page.getByText(/aucun (résultat|produit)/i)
		await expect(emptyState).toBeVisible({ timeout: 5000 })
	})

	test("cliquer sur un resultat de recherche navigue vers le produit", async ({ searchPage }) => {
		await searchPage.open()

		const inputCount = await searchPage.searchInput.count()
		test.skip(inputCount === 0, "No search input on /produits page")

		await searchPage.search("bague")

		const results = await searchPage.getResults()
		const resultCount = await results.count()
		test.skip(resultCount === 0, "No search results for 'bague'")

		await results.first().click()
		await expect(searchPage.page).toHaveURL(/\/creations\//)
	})

	test("effacer la recherche reinitialise les resultats", async ({ searchPage }) => {
		await searchPage.open()

		const inputCount = await searchPage.searchInput.count()
		test.skip(inputCount === 0, "No search input on /produits page")

		await searchPage.search("bague")
		await searchPage.clearSearch()

		// URL should no longer contain search param
		await expect(searchPage.page).not.toHaveURL(/search=/, { timeout: 5000 })
	})
})
