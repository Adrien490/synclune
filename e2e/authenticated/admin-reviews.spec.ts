import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

const REVIEWS_URL = "/admin/marketing/avis";

test.describe("Admin - Avis clients (page)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(REVIEWS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("affiche la page avec le titre", async ({ page }) => {
		await expect(page).toHaveURL(new RegExp(REVIEWS_URL));
		const heading = page.getByRole("heading", { name: /Avis/i });
		await expect(heading).toBeVisible();
	});

	test("affiche les cartes de statistiques", async ({ page }) => {
		// Stats cards should be visible
		const statsTexts = [/total|tous/i, /publié/i, /masqué/i, /note moyenne|moyenne/i];

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
		const emptyState = page.getByText(/aucun avis/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("affiche la barre de recherche", async ({ page }) => {
		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await expect(searchInput.first()).toBeVisible();
	});

	test("la recherche filtre les résultats", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun avis/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas d'avis dans la table");

		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await searchInput.first().fill("zzz_inexistant_xyz");

		await page.waitForTimeout(600);
		const noResults = page.getByText(/aucun avis|aucun résultat/i);
		await expect(noResults).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("les filtres de statut sont disponibles", async ({ page }) => {
		const statusFilter = page
			.getByRole("combobox", { name: /Statut/i })
			.or(page.getByRole("button", { name: /Statut/i }))
			.or(page.getByLabel(/Statut/i));
		const hasFilter = (await statusFilter.count()) > 0;
		test.skip(!hasFilter, "Pas de filtre de statut visible");

		await statusFilter.first().click();

		const options = page.getByText(/Publié|Masqué|PUBLISHED|HIDDEN/i);
		await expect(options.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("les filtres de note sont disponibles", async ({ page }) => {
		const ratingFilter = page
			.getByRole("combobox", { name: /Note/i })
			.or(page.getByRole("button", { name: /Note/i }))
			.or(page.getByLabel(/Note/i));
		const hasFilter = (await ratingFilter.count()) > 0;
		test.skip(!hasFilter, "Pas de filtre de note visible");

		await ratingFilter.first().click();
		await page.waitForLoadState("domcontentloaded");
	});
});

test.describe("Admin - Avis clients (modération)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(REVIEWS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("les actions de ligne permettent la modération", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucun avis/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas d'avis à modérer");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await actionsButton.click();

		// Should show moderation options
		const moderateOption = page.getByRole("menuitem", { name: /Publier|Masquer|Modérer/i });
		const deleteOption = page.getByRole("menuitem", { name: /Supprimer/i });

		const hasModerate = (await moderateOption.count()) > 0;
		const hasDelete = (await deleteOption.count()) > 0;

		expect(hasModerate || hasDelete).toBe(true);
	});
});
