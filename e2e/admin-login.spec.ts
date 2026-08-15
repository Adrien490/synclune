import { expect, test } from "./fixtures";

/**
 * Connexion admin — auth maison (lot 1) : un SEUL champ mot de passe sur
 * /admin/connexion, comparaison à temps constant côté serveur. Le cas
 * « bon mot de passe » est couvert par auth.setup.ts (il conditionne tout
 * le projet authenticated-admin).
 */
test.describe("Connexion admin", () => {
	test("la page rend le formulaire à un seul champ", async ({ page }) => {
		await page.goto("/admin/connexion");

		await expect(page.getByRole("heading", { level: 1, name: /Connexion/i })).toBeVisible();
		await expect(page.getByRole("textbox", { name: /Mot de passe/i })).toBeVisible();
		await expect(page.getByRole("button", { name: /Se connecter/i })).toBeVisible();

		// Plus d'email, plus de social, plus d'inscription (auth maison, D3).
		await expect(page.getByLabel(/Email/i)).toHaveCount(0);
		await expect(page.getByRole("link", { name: /inscription|mot de passe oublié/i })).toHaveCount(
			0,
		);
	});

	test("mot de passe erroné : erreur annoncée, pas de redirection", async ({ page }) => {
		await page.goto("/admin/connexion");

		await page.getByRole("textbox", { name: /Mot de passe/i }).fill("definitivement-pas-le-bon");
		await page.getByRole("button", { name: /Se connecter/i }).click();

		// Les régions live sr-only (toaster, route announcer) portent aussi
		// role="alert" : on cible celle qui porte réellement un message.
		await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible({
			timeout: 15_000,
		});
		await expect(page).toHaveURL(/\/admin\/connexion/);
	});
});
