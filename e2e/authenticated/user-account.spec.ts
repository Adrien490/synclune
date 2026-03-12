import { test, expect } from "../fixtures";

test.describe("Compte utilisateur - Navigation", () => {
	test("la navigation du compte contient les tabs", async ({ page }) => {
		await page.goto("/commandes");
		await page.waitForLoadState("domcontentloaded");

		const navLinks = [
			{ name: /Commandes/i, href: "/commandes" },
			{ name: /Adresses/i, href: "/adresses" },
			{ name: /Paramètres/i, href: "/parametres" },
		];

		for (const link of navLinks) {
			const navItem = page.getByRole("link", { name: link.name });
			await expect(navItem.first()).toBeAttached();
		}
	});

	test("naviguer entre les sections du compte", async ({ page }) => {
		const sections = [
			{ url: "/commandes", waitFor: /Mes commandes|Commandes/i },
			{ url: "/parametres", waitFor: /Paramètres/i },
			{ url: "/adresses", waitFor: /Mes adresses|Adresses/i },
		];

		for (const section of sections) {
			await page.goto(section.url);
			await page.waitForLoadState("domcontentloaded");

			await expect(page).not.toHaveURL(/\/connexion/);
			const heading = page.getByRole("heading", { name: section.waitFor });
			await expect(heading.first()).toBeVisible({ timeout: 10000 });
		}
	});
});

test.describe("Compte utilisateur - Commandes", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/commandes");
		await page.waitForLoadState("domcontentloaded");
	});

	test("affiche la page des commandes", async ({ page }) => {
		const heading = page.getByRole("heading", { name: /Mes commandes|Commandes/i });
		await expect(heading).toBeVisible();
	});

	test("affiche le tableau des commandes ou un état vide", async ({ page }) => {
		const orders = page.locator("table, [data-testid='orders-list']");
		const emptyState = page.getByText(/Aucune commande|Vous n'avez pas encore/i);
		await expect(orders.or(emptyState)).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Compte utilisateur - Adresses", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/adresses");
		await page.waitForLoadState("domcontentloaded");
	});

	test("affiche la page des adresses", async ({ page }) => {
		const heading = page.getByRole("heading", { name: /Mes adresses|Adresses/i });
		await expect(heading).toBeVisible();
	});

	test("affiche un bouton pour ajouter une adresse", async ({ page }) => {
		const addButton = page.getByRole("button", { name: /Ajouter/i });
		const addLink = page.getByRole("link", { name: /Ajouter/i });
		await expect(addButton.or(addLink)).toBeVisible({ timeout: 10000 });
	});
});
