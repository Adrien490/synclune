import { test as setup, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@synclune.fr";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "password123";

/**
 * Authenticate via Better Auth API directly (faster than UI login).
 * Falls back to UI login if the API call fails.
 */
async function authenticateViaAPI(
	page: Page,
	email: string,
	password: string,
	storagePath: string,
) {
	const baseURL = "http://localhost:3000";

	// Try API-based auth first (much faster than UI)
	const response = await page.request.post(`${baseURL}/api/auth/sign-in/email`, {
		data: { email, password, callbackURL: "/" },
		headers: { "Content-Type": "application/json" },
	});

	if (response.ok()) {
		// Navigate to a page to ensure cookies are properly set in the browser context
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Vérifie l'authentification via `/admin`, seule surface authentifiée depuis le
		// retrait de l'espace client (2026-07-31). `/commandes` servait de sonde ici ;
		// la route n'existe plus, et le proxy l'aurait renvoyée sur `/` — donc sans
		// `/connexion` dans l'URL, la sonde aurait validé un état NON authentifié.
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		if (!page.url().includes("/connexion")) {
			// API auth worked, save state
			await page.context().storageState({ path: storagePath });
			return;
		}
	}

	// Fallback: UI-based login
	await page.goto("/connexion");
	await page.waitForLoadState("domcontentloaded");

	// Dismiss cookie consent banner if present
	const cookieRefuse = page.getByRole("button", { name: /Refuser/i });
	if (await cookieRefuse.isVisible({ timeout: 2000 }).catch(() => false)) {
		await cookieRefuse.click();
	}

	const emailField = page.getByRole("textbox", { name: /Email/i });
	await emailField.waitFor({ state: "visible" });
	// Use click + fill + dispatch to ensure TanStack Form picks up values
	await emailField.click();
	await emailField.fill(email);
	await emailField.dispatchEvent("blur");

	const passwordField = page.locator('input[type="password"]');
	await passwordField.click();
	await passwordField.fill(password);
	await passwordField.dispatchEvent("blur");

	const submitButton = page.getByRole("button", {
		name: "Se connecter",
		exact: true,
	});
	await expect(submitButton).toBeEnabled({ timeout: 5000 });
	await submitButton.click();

	await expect(page).not.toHaveURL(/\/connexion/, { timeout: 15000 });
	await page.context().storageState({ path: storagePath });
}

setup("authenticate as admin", async ({ page }) => {
	await authenticateViaAPI(page, ADMIN_EMAIL, ADMIN_PASSWORD, "e2e/.auth/admin.json");
});

// Plus de `setup("authenticate as user")` : il n'existe plus de compte CLIENT à
// connecter (inscription fermée, `disableSignUp`) — retrait de l'espace client
// 2026-07-31. Les specs commerce tournent en invité, ce qui est le parcours réel
// de tous les clients.
