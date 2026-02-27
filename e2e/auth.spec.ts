import { test, expect } from "./fixtures"

test.describe("Authentification - Connexion", () => {
	test.beforeEach(async ({ authPage }) => {
		await authPage.goto()
	})

	test("la page de connexion charge correctement", async ({ page }) => {
		await expect(page).toHaveURL(/\/connexion/)
		await expect(page).toHaveTitle(/Connexion.*Synclune|Synclune.*Connexion/i)
	})

	test("la page de connexion affiche le titre h1", async ({ page }) => {
		const heading = page.getByRole("heading", { level: 1, name: /Connexion/i })
		await expect(heading).toBeVisible()
	})

	test("la page de connexion affiche le champ email", async ({ authPage }) => {
		await expect(authPage.emailInput).toBeVisible()
		await expect(authPage.emailInput).toHaveAttribute("type", "email")
	})

	test("la page de connexion affiche le champ mot de passe", async ({ authPage }) => {
		await expect(authPage.passwordInput).toBeVisible()
	})

	test("la page de connexion affiche le bouton de soumission", async ({ authPage }) => {
		await expect(authPage.submitButton).toBeVisible()
	})

	test("la page de connexion affiche le lien «Mot de passe oublié ?»", async ({ authPage }) => {
		await expect(authPage.forgotPasswordLink).toBeVisible()
		await expect(authPage.forgotPasswordLink).toHaveAttribute("href", "/mot-de-passe-oublie")
	})

	test("la page de connexion affiche un lien vers l'inscription", async ({ authPage }) => {
		await expect(authPage.signUpLink).toBeAttached()
	})

	test("la page de connexion affiche les boutons de connexion sociale", async ({ authPage }) => {
		await expect(authPage.socialButtons.first()).toBeAttached()
	})

	test("la page de connexion affiche le lien de retour au site", async ({ page }) => {
		const backLink = page.getByRole("link", { name: /Retour au site/i })
		await expect(backLink).toBeVisible()
		await expect(backLink).toHaveAttribute("href", "/")
	})

	test("le formulaire de connexion montre des erreurs de validation pour un email vide", async ({ page, authPage }) => {
		await authPage.passwordInput.fill("motdepasse")

		await authPage.emailInput.click()
		await authPage.emailInput.fill("invalide")
		await authPage.emailInput.blur()

		const errorMessage = page.getByText(/Format d'email invalide|email invalide/i)
		await expect(errorMessage).toBeVisible()
	})

	test("le formulaire de connexion montre une erreur pour un email invalide", async ({ page, authPage }) => {
		await authPage.emailInput.fill("ceci-nest-pas-un-email")
		await authPage.emailInput.blur()

		const errorMessage = page.getByText(/Format d'email invalide/i)
		await expect(errorMessage).toBeVisible()
	})

	test("un email valide ne déclenche pas d'erreur de format", async ({ page, authPage }) => {
		await authPage.emailInput.fill("test@example.com")
		await authPage.emailInput.blur()

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
		const nameInput = page.getByRole("textbox", { name: /Prénom/i })
		await expect(nameInput).toBeVisible()

		const emailInput = page.getByRole("textbox", { name: /^Email$/i })
		await expect(emailInput).toBeVisible()

		const confirmEmailInput = page.getByRole("textbox", { name: /Confirmer l'email/i })
		await expect(confirmEmailInput).toBeVisible()

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

		const errorMessage = page.getByText(/Les emails ne correspondent pas/i)
		await expect(errorMessage).toBeVisible()
	})

	test("le formulaire d'inscription valide la longueur du prénom", async ({ page }) => {
		const nameInput = page.getByRole("textbox", { name: /Prénom/i })
		await nameInput.fill("A")
		await nameInput.blur()

		const errorMessage = page.getByText(/au moins 2 caractères/i)
		await expect(errorMessage).toBeVisible()
	})

	test("le formulaire d'inscription valide la longueur du mot de passe", async ({ page }) => {
		const passwordInput = page.locator('input[type="password"]').first()
		await passwordInput.fill("court")
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

test.describe("Authentification - Verification email", () => {
	test("la page /verifier-email charge sans erreur 500", async ({ page }) => {
		const response = await page.goto("/verifier-email")
		await page.waitForLoadState("domcontentloaded")

		expect(response?.status(), "/verifier-email returned 500").toBeLessThan(500)
	})

	test("la page /verifier-email affiche un contenu pertinent", async ({ page }) => {
		await page.goto("/verifier-email")
		await page.waitForLoadState("domcontentloaded")

		// Without a valid token, should show error or resend form
		const content = page.getByText(/vérif|email|renvoyer|token/i)
		await expect(content.first()).toBeVisible()
	})

	test("la page /verifier-email a noindex", async ({ page }) => {
		await page.goto("/verifier-email")
		await page.waitForLoadState("domcontentloaded")

		const robotsMeta = page.locator('meta[name="robots"]')
		await expect(robotsMeta).toBeAttached()

		const content = await robotsMeta.getAttribute("content")
		expect(content).toMatch(/noindex/)
	})
})

test.describe("Authentification - Renvoyer verification", () => {
	test("la page /renvoyer-verification charge correctement", async ({ page }) => {
		const response = await page.goto("/renvoyer-verification")
		await page.waitForLoadState("domcontentloaded")

		expect(response?.status(), "/renvoyer-verification returned 500").toBeLessThan(500)
	})

	test("la page /renvoyer-verification affiche un formulaire", async ({ page }) => {
		await page.goto("/renvoyer-verification")
		await page.waitForLoadState("domcontentloaded")

		// Should have an email input and submit button
		const emailInput = page.getByRole("textbox", { name: /Email/i })
			.or(page.locator('input[type="email"]'))
		await expect(emailInput.first()).toBeVisible()
	})

	test("la page /renvoyer-verification a un lien retour connexion", async ({ page }) => {
		await page.goto("/renvoyer-verification")
		await page.waitForLoadState("domcontentloaded")

		const backLink = page.getByRole("link", { name: /connexion/i })
		await expect(backLink.first()).toBeVisible()
	})
})

test.describe("Authentification - Reinitialiser mot de passe", () => {
	test("la page /reinitialiser-mot-de-passe charge sans erreur 500", async ({ page }) => {
		const response = await page.goto("/reinitialiser-mot-de-passe")
		await page.waitForLoadState("domcontentloaded")

		expect(response?.status(), "/reinitialiser-mot-de-passe returned 500").toBeLessThan(500)
	})

	test("la page /reinitialiser-mot-de-passe affiche un contenu pertinent", async ({ page }) => {
		await page.goto("/reinitialiser-mot-de-passe")
		await page.waitForLoadState("domcontentloaded")

		// Without a valid token, should show error or redirect
		const content = page.getByText(/mot de passe|réinitialiser|token|erreur|expiré/i)
			.or(page.getByRole("heading"))
		await expect(content.first()).toBeVisible()
	})
})
