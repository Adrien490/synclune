import { test, expect } from "@playwright/test"

test.describe("Navigation principale", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")
	})

	test("la homepage charge et affiche les sections clés", async ({ page }) => {
		// Le titre de la page doit contenir Synclune
		await expect(page).toHaveTitle(/Synclune/)

		// La section hero doit être présente
		const heroSection = page.locator("#hero-section")
		await expect(heroSection).toBeVisible()

		// La navbar doit être présente avec le label aria correct
		const navbar = page.getByRole("navigation", { name: "Navigation principale" })
		await expect(navbar).toBeVisible()
	})

	test("le logo de la navbar est un lien vers l'accueil", async ({ page }) => {
		// Sur desktop, le logo avec texte est visible
		const logoLink = page.locator('nav a[href="/"]').first()
		await expect(logoLink).toBeVisible()
	})

	test("la navbar contient les liens de navigation desktop", async ({ page }) => {
		// Les créations
		const creationsLink = page.getByRole("link", { name: /Les créations/i }).first()
		await expect(creationsLink).toBeVisible()

		// Les collections
		const collectionsLink = page.getByRole("link", { name: /Les collections/i }).first()
		await expect(collectionsLink).toBeVisible()

		// Personnalisation
		const personnalisationLink = page.getByRole("link", { name: /Personnalisation/i }).first()
		await expect(personnalisationLink).toBeVisible()
	})

	test("la navbar contient les icônes d'action (favoris, panier)", async ({ page }) => {
		// Icône favoris (accessible via aria-label)
		const favoritesLink = page.getByRole("link", { name: /Accéder à mes favoris/i })
		await expect(favoritesLink).toBeVisible()

		// Bouton panier
		const cartButton = page.getByRole("button", { name: /Ouvrir mon panier/i })
		await expect(cartButton).toBeVisible()
	})

	test("navigation vers /produits", async ({ page }) => {
		await page.goto("/produits")
		await page.waitForLoadState("domcontentloaded")

		// Vérifier que la page est chargée en cherchant un header de page
		await expect(page).toHaveURL(/\/produits/)

		// La page doit contenir du contenu
		const main = page.locator("main, [role='main']").first()
		await expect(main).toBeVisible()
	})

	test("navigation vers /collections", async ({ page }) => {
		await page.goto("/collections")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/collections/)
	})

	test("navigation depuis la navbar vers /produits", async ({ page }) => {
		// Cliquer sur le lien «Les créations» dans la navbar desktop
		// On attend un écran desktop pour le test
		await page.setViewportSize({ width: 1280, height: 800 })
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		// Chercher le lien «Les créations» dans la nav desktop
		const creationsNavLink = page.locator('nav a[href="/produits"]').first()
		await creationsNavLink.click()

		await page.waitForLoadState("domcontentloaded")
		await expect(page).toHaveURL(/\/produits/)
	})

	test("le menu mobile s'ouvre et se ferme", async ({ page }) => {
		// Réduire la fenêtre pour activer le mobile
		await page.setViewportSize({ width: 390, height: 844 })
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		// Le bouton burger doit être visible sur mobile
		const menuButton = page.getByRole("button", { name: /Ouvrir le menu de navigation/i })
		await expect(menuButton).toBeVisible()

		// Ouvrir le menu
		await menuButton.click()

		// Le dialog du menu doit s'ouvrir (SheetContent = role dialog)
		const menuDialog = page.getByRole("dialog")
		await expect(menuDialog).toBeVisible()

		// Le menu doit contenir les items de navigation
		await expect(menuDialog.getByRole("link", { name: /Accueil/i })).toBeVisible()

		// Fermer le menu via le bouton close (aria-label "Fermer")
		const closeButton = page.getByRole("button", { name: /Fermer/i }).first()
		await closeButton.click()

		// Le menu doit être fermé
		await expect(menuDialog).not.toBeVisible()
	})

	test("le footer est présent avec les liens de navigation", async ({ page }) => {
		// Faire défiler jusqu'au footer et attendre qu'il soit visible
		const footer = page.getByRole("contentinfo")
		await footer.scrollIntoViewIfNeeded()
		await expect(footer).toBeAttached()

		// Le footer doit contenir un lien vers les créations
		const footerCreationsLink = footer.getByRole("link", { name: /Les créations/i })
		await expect(footerCreationsLink).toBeAttached()
	})

	test("le footer contient les liens légaux", async ({ page }) => {
		const footer = page.getByRole("contentinfo")
		await expect(footer).toBeAttached()

		// Liens légaux
		const cgvLink = footer.getByRole("link", { name: /CGV/i })
		await expect(cgvLink).toBeAttached()

		const mentionsLink = footer.getByRole("link", { name: /Mentions légales/i })
		await expect(mentionsLink).toBeAttached()

		const confidentialiteLink = footer.getByRole("link", { name: /Politique de confidentialité/i })
		await expect(confidentialiteLink).toBeAttached()
	})

	test("le footer affiche les informations de contact", async ({ page }) => {
		const footer = page.getByRole("contentinfo")

		// Le footer doit contenir un lien email
		const emailLink = footer.locator('a[href^="mailto:"]')
		await expect(emailLink).toBeAttached()
	})

	test("le footer contient les icônes de moyens de paiement", async ({ page }) => {
		const footer = page.getByRole("contentinfo")

		// La liste des moyens de paiement doit être présente
		const paymentList = footer.getByRole("list", { name: /Moyens de paiement/i })
		await expect(paymentList).toBeAttached()
	})
})
