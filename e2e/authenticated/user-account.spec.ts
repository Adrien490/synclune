import { test, expect } from "../fixtures"

test.describe("Compte utilisateur - Tableau de bord", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/compte")
		await page.waitForLoadState("domcontentloaded")
	})

	test("accède au tableau de bord sans redirection vers connexion", async ({ page }) => {
		await expect(page).toHaveURL(/\/compte/)
		await expect(page).not.toHaveURL(/\/connexion/)
	})

	test("affiche le message de bienvenue", async ({ page }) => {
		const heading = page.getByRole("heading", { name: /Tableau de bord/i })
		await expect(heading).toBeVisible()

		// Should show greeting with user's first name
		const greeting = page.getByText(/Bonjour/i)
		await expect(greeting).toBeVisible()
	})

	test("affiche les liens rapides", async ({ page }) => {
		await expect(page.getByRole("link", { name: /Mes commandes/i })).toBeVisible()
		await expect(page.getByRole("link", { name: /Mes favoris/i })).toBeVisible()
		await expect(page.getByRole("link", { name: /Paramètres/i })).toBeVisible()
	})

	test("le lien 'Mes commandes' navigue correctement", async ({ page }) => {
		await page.getByRole("link", { name: /Mes commandes/i }).click()
		await expect(page).toHaveURL(/\/compte\/commandes|\/commandes/)
	})
})

test.describe("Compte utilisateur - Navigation", () => {
	test("la navigation du compte contient tous les liens", async ({ page }) => {
		await page.goto("/compte")
		await page.waitForLoadState("domcontentloaded")

		// Desktop navigation items
		const navLinks = [
			{ name: /Tableau de bord|Accueil/i, href: "/compte" },
			{ name: /Commandes/i, href: "/commandes" },
			{ name: /Mes avis/i, href: "/mes-avis" },
			{ name: /Paramètres/i, href: "/parametres" },
		]

		for (const link of navLinks) {
			const navItem = page.getByRole("link", { name: link.name })
			await expect(navItem.first()).toBeAttached()
		}
	})

	test("naviguer entre les sections du compte", async ({ page }) => {
		const sections = [
			{ url: "/compte", waitFor: /Tableau de bord/i },
			{ url: "/compte/commandes", waitFor: /Mes commandes|Commandes/i },
			{ url: "/compte/parametres", waitFor: /Paramètres/i },
			{ url: "/compte/adresses", waitFor: /Mes adresses|Adresses/i },
		]

		for (const section of sections) {
			await page.goto(section.url)
			await page.waitForLoadState("domcontentloaded")

			await expect(page).not.toHaveURL(/\/connexion/)
			const heading = page.getByRole("heading", { name: section.waitFor })
			await expect(heading.first()).toBeVisible({ timeout: 10000 })
		}
	})
})

test.describe("Compte utilisateur - Commandes", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/compte/commandes")
		await page.waitForLoadState("domcontentloaded")
	})

	test("affiche la page des commandes", async ({ page }) => {
		const heading = page.getByRole("heading", { name: /Mes commandes|Commandes/i })
		await expect(heading).toBeVisible()
	})

	test("affiche le tableau des commandes ou un état vide", async ({ page }) => {
		const orders = page.locator("table, [data-testid='orders-list']")
		const emptyState = page.getByText(/Aucune commande|Vous n'avez pas encore/i)
		await expect(orders.or(emptyState)).toBeVisible({ timeout: 10000 })
	})
})

test.describe("Compte utilisateur - Adresses", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/compte/adresses")
		await page.waitForLoadState("domcontentloaded")
	})

	test("affiche la page des adresses", async ({ page }) => {
		const heading = page.getByRole("heading", { name: /Mes adresses|Adresses/i })
		await expect(heading).toBeVisible()
	})

	test("affiche un bouton pour ajouter une adresse", async ({ page }) => {
		const addButton = page.getByRole("button", { name: /Ajouter/i })
		const addLink = page.getByRole("link", { name: /Ajouter/i })
		await expect(addButton.or(addLink)).toBeVisible({ timeout: 10000 })
	})
})

test.describe("Compte utilisateur - Paramètres", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/compte/parametres")
		await page.waitForLoadState("domcontentloaded")
	})

	test("affiche la page des paramètres", async ({ page }) => {
		const heading = page.getByRole("heading", { name: /Paramètres/i })
		await expect(heading).toBeVisible()
	})

	test("affiche la section profil", async ({ page }) => {
		const profileSection = page.getByText(/Profil/i)
		await expect(profileSection.first()).toBeVisible()
	})

	test("affiche la section sécurité", async ({ page }) => {
		const securitySection = page.getByText(/Sécurité|Mot de passe/i)
		await expect(securitySection.first()).toBeVisible({ timeout: 10000 })
	})
})
