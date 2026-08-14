import { test, expect } from "./fixtures";

// ⚠️ SUITE NEUTRALISÉE au lot 1 de la migration lean (docs/MIGRATION-PROMPTS.md) :
// les pages Better Auth (/connexion, /mot-de-passe-oublie…) n'existent plus, la
// connexion admin vit sur /admin/connexion (mot de passe unique + cookie HMAC).
// Le lot 7 refond les e2e — ne pas réparer cette suite avant.
test.skip(true, "Better Auth retiré (migration lean, lot 1) — refonte e2e au lot 7");

test.describe("Authentification - Connexion", { tag: ["@critical"] }, () => {
	test.beforeEach(async ({ authPage }) => {
		await authPage.goto();
	});

	test("la page de connexion charge correctement", { tag: ["@smoke"] }, async ({ page }) => {
		await expect(page).toHaveURL(/\/connexion/);
		await expect(page).toHaveTitle(/Connexion.*Synclune|Synclune.*Connexion/i);
	});

	test("la page de connexion affiche le titre h1", async ({ page }) => {
		const heading = page.getByRole("heading", { level: 1, name: /Connexion/i });
		await expect(heading).toBeVisible();
	});

	test("la page de connexion affiche le champ email", async ({ authPage }) => {
		await expect(authPage.emailInput).toBeVisible();
		await expect(authPage.emailInput).toHaveAttribute("type", "email");
	});

	test("la page de connexion affiche le champ mot de passe", async ({ authPage }) => {
		await expect(authPage.passwordInput).toBeVisible();
	});

	test("la page de connexion affiche le bouton de soumission", async ({ authPage }) => {
		await expect(authPage.submitButton).toBeVisible();
	});

	test("la page de connexion affiche le lien «Mot de passe oublié ?»", async ({ authPage }) => {
		await expect(authPage.forgotPasswordLink).toBeVisible();
		await expect(authPage.forgotPasswordLink).toHaveAttribute("href", "/mot-de-passe-oublie");
	});

	test("la page de connexion affiche un lien vers l'inscription", async ({ authPage }) => {
		await expect(authPage.signUpLink).toBeAttached();
	});

	test("la page de connexion affiche les boutons de connexion sociale", async ({ authPage }) => {
		await expect(authPage.socialButtons.first()).toBeAttached();
	});

	test("la page de connexion affiche le lien de retour au site", async ({ page }) => {
		const backLink = page.getByRole("link", { name: /Retour au site/i });
		await expect(backLink).toBeVisible();
		await expect(backLink).toHaveAttribute("href", "/");
	});

	test("le formulaire de connexion montre des erreurs de validation pour un email vide", async ({
		page,
		authPage,
	}) => {
		await authPage.passwordInput.fill("motdepasse");

		await authPage.emailInput.click();
		await authPage.emailInput.fill("invalide");
		await authPage.emailInput.blur();

		const errorMessage = page.getByText(/Vérifiez le format de votre email|email invalide/i);
		await expect(errorMessage).toBeVisible();
	});

	test("le formulaire de connexion montre une erreur pour un email invalide", async ({
		page,
		authPage,
	}) => {
		await authPage.emailInput.fill("ceci-nest-pas-un-email");
		await authPage.emailInput.blur();

		// Message du SSOT `emailSchema` (partagé avec la Server Action).
		const errorMessage = page.getByText(/Vérifiez le format de votre email/i);
		await expect(errorMessage).toBeVisible();
	});

	/**
	 * @regression gated-form-submit — une soumission invalide ne consomme pas de
	 * tentative de connexion.
	 *
	 * `sign-in-email.ts` applique son rate limit (5 essais / 15 min par IP) avant
	 * toute validation : tant que le client laissait partir un formulaire invalide,
	 * cinq fautes de frappe verrouillaient un utilisateur qui avait pourtant le bon
	 * mot de passe.
	 */
	test("une soumission invalide n'envoie aucune requête au serveur", async ({ page, authPage }) => {
		const serverActionRequests: string[] = [];
		page.on("request", (request) => {
			// Une Server Action est un POST sur l'URL de la page courante.
			if (request.method() === "POST" && request.url().includes("/connexion")) {
				serverActionRequests.push(request.url());
			}
		});

		await authPage.emailInput.fill("pas-un-email");
		await authPage.passwordInput.fill("motdepasse");

		// Trois tentatives : sous l'ancien comportement, trois essais consommés.
		for (let i = 0; i < 3; i++) {
			await authPage.submitButton.click({ force: true });
			await page.waitForTimeout(200);
		}

		expect(serverActionRequests).toHaveLength(0);
		await expect(page).toHaveURL(/\/connexion/);
	});

	test("un email valide ne déclenche pas d'erreur de format", async ({ page, authPage }) => {
		await authPage.emailInput.fill("test@example.com");
		await authPage.emailInput.blur();

		const errorMessage = page.getByText(/Vérifiez le format de votre email/i);
		await expect(errorMessage).not.toBeVisible();
	});
});

/*
 * Le bloc « Authentification - Inscription » a été retiré avec la route
 * `/inscription` (2026-07-31). L'inscription est fermée côté API par
 * `emailAndPassword.disableSignUp`, et `/connexion` n'est plus qu'une porte
 * d'administration — couverte par le bloc de connexion ci-dessus.
 */

test.describe("Authentification - Mot de passe oublié", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/mot-de-passe-oublie");
		await page.waitForLoadState("domcontentloaded");
	});

	test("la page charge correctement", async ({ page }) => {
		await expect(page).toHaveURL(/\/mot-de-passe-oublie/);
		await expect(page).toHaveTitle(/Mot de passe oublié.*Synclune|Synclune.*Mot de passe/i);
	});

	test("la page affiche le titre h1", async ({ page }) => {
		const heading = page.getByRole("heading", { level: 1, name: /Mot de passe oublié/i });
		await expect(heading).toBeVisible();
	});

	test("la page affiche un champ email", async ({ page }) => {
		const emailInput = page.getByRole("textbox", { name: /Email/i });
		await expect(emailInput).toBeVisible();
		await expect(emailInput).toHaveAttribute("type", "email");
	});

	test("la page affiche le bouton d'envoi du lien de réinitialisation", async ({ page }) => {
		const submitButton = page.getByRole("button", { name: /Envoyer le lien/i });
		await expect(submitButton).toBeVisible();
	});

	test("la page affiche un lien de retour vers la connexion", async ({ page }) => {
		const backLink = page.getByRole("link", { name: /Retour à la connexion/i });
		await expect(backLink).toBeVisible();
		await expect(backLink).toHaveAttribute("href", "/connexion");
	});

	test("la page affiche un lien «Connectez-vous» en bas du formulaire", async ({ page }) => {
		const signInLink = page.getByRole("link", { name: /Connectez-vous/i });
		await expect(signInLink).toBeVisible();
	});

	test("le formulaire valide le format email", async ({ page }) => {
		const emailInput = page.getByRole("textbox", { name: /Email/i });
		await emailInput.fill("pas-un-email");
		await emailInput.blur();

		const errorMessage = page.getByText(/Format d'email invalide/i);
		await expect(errorMessage).toBeVisible();
	});
});

test.describe("Authentification - Verification email", { tag: ["@regression"] }, () => {
	test("la page /verifier-email charge sans erreur 500", async ({ page }) => {
		const response = await page.goto("/verifier-email");
		await page.waitForLoadState("domcontentloaded");

		expect(response?.status(), "/verifier-email returned 500").toBeLessThan(500);
	});

	test("la page /verifier-email affiche un contenu pertinent", async ({ page }) => {
		await page.goto("/verifier-email");
		await page.waitForLoadState("domcontentloaded");

		// Without a valid token, should show error or resend form
		const content = page.getByText(/vérif|email|renvoyer|token/i);
		await expect(content.first()).toBeVisible();
	});

	test("la page /verifier-email a noindex", async ({ page }) => {
		await page.goto("/verifier-email");
		await page.waitForLoadState("domcontentloaded");

		const robotsMeta = page.locator('meta[name="robots"]');
		await expect(robotsMeta).toBeAttached();

		const content = await robotsMeta.getAttribute("content");
		expect(content).toMatch(/noindex/);
	});
});

test.describe("Authentification - Renvoyer verification", { tag: ["@regression"] }, () => {
	test("la page /renvoyer-verification charge correctement", async ({ page }) => {
		const response = await page.goto("/renvoyer-verification");
		await page.waitForLoadState("domcontentloaded");

		expect(response?.status(), "/renvoyer-verification returned 500").toBeLessThan(500);
	});

	test("la page /renvoyer-verification affiche un formulaire", async ({ page }) => {
		await page.goto("/renvoyer-verification");
		await page.waitForLoadState("domcontentloaded");

		// Should have an email input and submit button
		const emailInput = page
			.getByRole("textbox", { name: /Email/i })
			.or(page.locator('input[type="email"]'));
		await expect(emailInput.first()).toBeVisible();
	});

	test("la page /renvoyer-verification a un lien retour connexion", async ({ page }) => {
		await page.goto("/renvoyer-verification");
		await page.waitForLoadState("domcontentloaded");

		const backLink = page.getByRole("link", { name: /connexion/i });
		await expect(backLink.first()).toBeVisible();
	});
});

test.describe("Authentification - Reinitialiser mot de passe", { tag: ["@regression"] }, () => {
	test("la page /reinitialiser-mot-de-passe charge sans erreur 500", async ({ page }) => {
		const response = await page.goto("/reinitialiser-mot-de-passe");
		await page.waitForLoadState("domcontentloaded");

		expect(response?.status(), "/reinitialiser-mot-de-passe returned 500").toBeLessThan(500);
	});

	test("la page /reinitialiser-mot-de-passe affiche un contenu pertinent", async ({ page }) => {
		await page.goto("/reinitialiser-mot-de-passe");
		await page.waitForLoadState("domcontentloaded");

		// Without a valid token, should show error or redirect
		const content = page
			.getByText(/mot de passe|réinitialiser|token|erreur|expiré/i)
			.or(page.getByRole("heading"));
		await expect(content.first()).toBeVisible();
	});
});
