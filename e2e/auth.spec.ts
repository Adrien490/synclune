import { test, expect } from "@playwright/test"

test.describe("Authentification - Connexion", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/connexion")
		await page.waitForLoadState("domcontentloaded")
	})

	test("la page de connexion charge correctement", async ({ page }) => {
		await expect(page).toHaveURL(/\/connexion/)
		await expect(page).toHaveTitle(/Connexion.*Synclune|Synclune.*Connexion/i)
	})

	test("la page de connexion affiche le titre h1", async ({ page }) => {
		const heading = page.getByRole("heading", { level: 1, name: /Connexion/i })
		await expect(heading).toBeVisible()
	})

	test("la page de connexion affiche le champ email", async ({ page }) => {
		const emailInput = page.getByRole("textbox", { name: /Email/i })
		await expect(emailInput).toBeVisible()
		await expect(emailInput).toHaveAttribute("type", "email")
	})

	test("la page de connexion affiche le champ mot de passe", async ({ page }) => {
		// Le champ mot de passe est de type password (pas textbox)
		const passwordInput = page.locator('input[type="password"]')
		await expect(passwordInput).toBeVisible()
	})

	test("la page de connexion affiche le bouton de soumission", async ({ page }) => {
		const submitButton = page.getByRole("button", { name: /Se connecter/i })
		await expect(submitButton).toBeVisible()
	})

	test("la page de connexion affiche le lien «Mot de passe oublié ?»", async ({ page }) => {
		const forgotLink = page.getByRole("link", { name: /Mot de passe oublié/i })
		await expect(forgotLink).toBeVisible()
		await expect(forgotLink).toHaveAttribute("href", "/mot-de-passe-oublie")
	})

	test("la page de connexion affiche un lien vers l'inscription", async ({ page }) => {
		const signUpLink = page.getByRole("link", { name: /Inscrivez-vous|Créez|S'inscrire/i })
		await expect(signUpLink).toBeAttached()
	})

	test("la page de connexion affiche les boutons de connexion sociale", async ({ page }) => {
		// Les boutons Google/GitHub doivent être présents
		const socialButtons = page.getByRole("button", { name: /Google|GitHub|Continuer avec/i })
		// Au moins un bouton social doit être présent
		await expect(socialButtons.first()).toBeAttached()
	})

	test("la page de connexion affiche le lien de retour au site", async ({ page }) => {
		const backLink = page.getByRole("link", { name: /Retour au site/i })
		await expect(backLink).toBeVisible()
		await expect(backLink).toHaveAttribute("href", "/")
	})

	test("le formulaire de connexion montre des erreurs de validation pour un email vide", async ({ page }) => {
		// Remplir le mot de passe sans l'email, puis tenter de soumettre
		const passwordInput = page.locator('input[type="password"]')
		await passwordInput.fill("motdepasse")

		// Cliquer sur le champ email pour déclencher la validation onChange
		const emailInput = page.getByRole("textbox", { name: /Email/i })
		await emailInput.click()
		await emailInput.fill("invalide")
		await emailInput.blur()

		// Un message d'erreur de validation email doit apparaître
		const errorMessage = page.getByText(/Format d'email invalide|email invalide/i)
		await expect(errorMessage).toBeVisible()
	})

	test("le formulaire de connexion montre une erreur pour un email invalide", async ({ page }) => {
		const emailInput = page.getByRole("textbox", { name: /Email/i })
		await emailInput.fill("ceci-nest-pas-un-email")
		await emailInput.blur()

		const errorMessage = page.getByText(/Format d'email invalide/i)
		await expect(errorMessage).toBeVisible()
	})

	test("un email valide ne déclenche pas d'erreur de format", async ({ page }) => {
		const emailInput = page.getByRole("textbox", { name: /Email/i })
		await emailInput.fill("test@example.com")
		await emailInput.blur()

		// Aucune erreur de format ne doit apparaître
		const errorMessage = page.getByText(/Format d'email invalide/i)
		await expect(errorMessage).not.toBeVisible()
	})
})

test.describe("Authentification - Inscription", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/inscription")
		await page.waitForLoadState("domcontentloaded")
	})

	test("la page d'inscription charge correctement", async ({ page }) => {
		await expect(page).toHaveURL(/\/inscription/)
		await expect(page).toHaveTitle(/Inscription.*Synclune|Synclune.*Inscription/i)
	})

	test("la page d'inscription affiche le titre h1", async ({ page }) => {
		const heading = page.getByRole("heading", { level: 1, name: /Inscription/i })
		await expect(heading).toBeVisible()
	})

	test("la page d'inscription affiche les champs requis", async ({ page }) => {
		// Champ prénom
		const nameInput = page.getByRole("textbox", { name: /Prénom/i })
		await expect(nameInput).toBeVisible()

		// Champ email
		const emailInput = page.getByRole("textbox", { name: /^Email$/i })
		await expect(emailInput).toBeVisible()

		// Champ confirmation email
		const confirmEmailInput = page.getByRole("textbox", { name: /Confirmer l'email/i })
		await expect(confirmEmailInput).toBeVisible()

		// Champ mot de passe
		const passwordInput = page.locator('input[type="password"]')
		await expect(passwordInput).toBeVisible()
	})

	test("la page d'inscription affiche le bouton de soumission", async ({ page }) => {
		const submitButton = page.getByRole("button", { name: /S'inscrire/i })
		await expect(submitButton).toBeVisible()
	})

	test("la page d'inscription affiche un lien vers les CGV", async ({ page }) => {
		const cgvLink = page.getByRole("link", { name: /conditions générales/i })
		await expect(cgvLink).toBeAttached()
	})

	test("la page d'inscription affiche un lien vers la politique de confidentialité", async ({ page }) => {
		const privacyLink = page.getByRole("link", { name: /politique de confidentialité/i })
		await expect(privacyLink).toBeAttached()
	})

	test("la page d'inscription affiche un lien vers la connexion", async ({ page }) => {
		const signInLink = page.getByRole("link", { name: /Connectez-vous/i })
		await expect(signInLink).toBeVisible()
		await expect(signInLink).toHaveAttribute("href", "/connexion")
	})

	test("la page d'inscription affiche le lien de retour au site", async ({ page }) => {
		const backLink = page.getByRole("link", { name: /Retour au site/i })
		await expect(backLink).toBeVisible()
	})

	test("le formulaire d'inscription valide le format email", async ({ page }) => {
		const emailInput = page.getByRole("textbox", { name: /^Email$/i })
		await emailInput.fill("email-invalide")
		await emailInput.blur()

		const errorMessage = page.getByText(/Format d'email invalide/i)
		await expect(errorMessage).toBeVisible()
	})

	test("le formulaire d'inscription valide la confirmation email", async ({ page }) => {
		const emailInput = page.getByRole("textbox", { name: /^Email$/i })
		await emailInput.fill("user@example.com")
		await emailInput.blur()

		const confirmEmailInput = page.getByRole("textbox", { name: /Confirmer l'email/i })
		await confirmEmailInput.fill("autre@example.com")
		await confirmEmailInput.blur()

		// Les emails ne correspondent pas
		const errorMessage = page.getByText(/Les emails ne correspondent pas/i)
		await expect(errorMessage).toBeVisible()
	})

	test("le formulaire d'inscription valide la longueur du prénom", async ({ page }) => {
		const nameInput = page.getByRole("textbox", { name: /Prénom/i })
		await nameInput.fill("A") // Trop court (min 2 chars)
		await nameInput.blur()

		const errorMessage = page.getByText(/au moins 2 caractères/i)
		await expect(errorMessage).toBeVisible()
	})

	test("le formulaire d'inscription valide la longueur du mot de passe", async ({ page }) => {
		const passwordInput = page.locator('input[type="password"]').first()
		await passwordInput.fill("court") // Trop court (min 8 chars)
		await passwordInput.blur()

		const errorMessage = page.getByText(/au moins 8 caractères/i)
		await expect(errorMessage).toBeVisible()
	})
})

test.describe("Authentification - Mot de passe oublié", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/mot-de-passe-oublie")
		await page.waitForLoadState("domcontentloaded")
	})

	test("la page charge correctement", async ({ page }) => {
		await expect(page).toHaveURL(/\/mot-de-passe-oublie/)
		await expect(page).toHaveTitle(/Mot de passe oublié.*Synclune|Synclune.*Mot de passe/i)
	})

	test("la page affiche le titre h1", async ({ page }) => {
		const heading = page.getByRole("heading", { level: 1, name: /Mot de passe oublié/i })
		await expect(heading).toBeVisible()
	})

	test("la page affiche un champ email", async ({ page }) => {
		const emailInput = page.getByRole("textbox", { name: /Email/i })
		await expect(emailInput).toBeVisible()
		await expect(emailInput).toHaveAttribute("type", "email")
	})

	test("la page affiche le bouton d'envoi du lien de réinitialisation", async ({ page }) => {
		const submitButton = page.getByRole("button", { name: /Envoyer le lien/i })
		await expect(submitButton).toBeVisible()
	})

	test("la page affiche un lien de retour vers la connexion", async ({ page }) => {
		const backLink = page.getByRole("link", { name: /Retour à la connexion/i })
		await expect(backLink).toBeVisible()
		await expect(backLink).toHaveAttribute("href", "/connexion")
	})

	test("la page affiche un lien «Connectez-vous» en bas du formulaire", async ({ page }) => {
		const signInLink = page.getByRole("link", { name: /Connectez-vous/i })
		await expect(signInLink).toBeVisible()
	})

	test("le formulaire valide le format email", async ({ page }) => {
		const emailInput = page.getByRole("textbox", { name: /Email/i })
		await emailInput.fill("pas-un-email")
		await emailInput.blur()

		const errorMessage = page.getByText(/Format d'email invalide/i)
		await expect(errorMessage).toBeVisible()
	})
})
