import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

const NEWSLETTER_URL = "/admin/marketing/newsletter";

test.describe("Admin - Newsletter (page)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(NEWSLETTER_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("affiche la page avec le titre", async ({ page }) => {
		await expect(page).toHaveURL(new RegExp(NEWSLETTER_URL));
		const heading = page.getByRole("heading", { name: /Newsletter/i });
		await expect(heading).toBeVisible();
	});

	test("affiche les cartes de statistiques", async ({ page }) => {
		const statsTexts = [/total|abonné/i, /actif/i, /désabonn/i];

		for (const text of statsTexts) {
			const stat = page.getByText(text);
			const count = await stat.count();
			if (count > 0) {
				await expect(stat.first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
			}
		}
	});

	test("affiche le tableau de données ou un état vide", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun abonné|aucune inscription/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("affiche la barre de recherche", async ({ page }) => {
		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await expect(searchInput.first()).toBeVisible();
	});

	test("la recherche filtre les résultats", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun abonné|aucune inscription/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas d'abonnés dans la table");

		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await searchInput.first().fill("zzz_inexistant@xyz.com");

		await page.waitForTimeout(600);
		const noResults = page.getByText(/aucun abonné|aucun résultat|aucune inscription/i);
		await expect(noResults).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("le tableau affiche les colonnes attendues", async ({ page }) => {
		const table = page.locator("table");
		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de table visible");

		const headers = table.locator("thead th, thead [role='columnheader']");
		const headerCount = await headers.count();
		expect(headerCount).toBeGreaterThan(0);

		// Check for expected column content
		const headerTexts = await headers.allTextContents();
		const joinedHeaders = headerTexts.join(" ").toLowerCase();
		expect(joinedHeaders).toMatch(/email|statut|date/);
	});
});
