import { expect, test as setup } from "@playwright/test";

/**
 * Authentification admin — auth maison (migration lean, lot 1) : un seul
 * champ mot de passe sur /admin/connexion, cookie `admin_session` signé HMAC.
 *
 * Le mot de passe vient d'`ADMIN_PASSWORD` (même variable que le serveur —
 * en local, sourcer .env.local avant `pnpm e2e`).
 */
setup("authenticate as admin", async ({ page }) => {
	const password = process.env.ADMIN_PASSWORD;
	if (!password) {
		throw new Error(
			"ADMIN_PASSWORD manquant : les projets authenticated/ ne peuvent pas se connecter. " +
				"En local : `set -a; source .env.local; set +a` avant `pnpm e2e`.",
		);
	}

	await page.goto("/admin/connexion");
	await page.getByRole("textbox", { name: /Mot de passe/i }).fill(password);
	await page.getByRole("button", { name: /Se connecter/i }).click();

	// La PAGE redirige après validation réelle du cookie (le proxy ne le fait
	// plus — il ne sait pas vérifier le HMAC).
	await expect(page).toHaveURL(/\/admin(?!\/connexion)/, { timeout: 15_000 });

	await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
