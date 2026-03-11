import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

const CUSTOMIZATIONS_URL = "/admin/marketing/personnalisations";

test.describe("Admin - Personnalisations (page)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(CUSTOMIZATIONS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("affiche la page avec le titre", async ({ page }) => {
		await expect(page).toHaveURL(new RegExp(CUSTOMIZATIONS_URL));
		const heading = page.getByRole("heading", { name: /Personnalisation/i });
		await expect(heading).toBeVisible();
	});

	test("affiche les cartes de statistiques", async ({ page }) => {
		const statsTexts = [/en attente/i, /en cours/i, /terminée/i, /finalisée/i];

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
		const emptyState = page.getByText(/aucune personnalisation|aucune demande/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("affiche la barre de recherche", async ({ page }) => {
		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await expect(searchInput.first()).toBeVisible();
	});

	test("la recherche filtre les résultats", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune personnalisation|aucune demande/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de personnalisations dans la table");

		const searchInput = page.getByPlaceholder(/Rechercher/i).or(page.getByRole("searchbox"));
		await searchInput.first().fill("zzz_inexistant_xyz");

		await page.waitForTimeout(600);
		const noResults = page.getByText(/aucune personnalisation|aucun résultat|aucune demande/i);
		await expect(noResults).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("le filtre de statut fonctionne", async ({ page }) => {
		const statusFilter = page
			.getByRole("combobox", { name: /Statut/i })
			.or(page.getByRole("button", { name: /Statut/i }))
			.or(page.getByLabel(/Statut/i));
		const hasFilter = (await statusFilter.count()) > 0;
		test.skip(!hasFilter, "Pas de filtre de statut visible");

		await statusFilter.first().click();

		const options = page.getByText(
			/En attente|En cours|Terminée|Finalisée|PENDING|IN_PROGRESS|COMPLETED|CLOSED/i,
		);
		await expect(options.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("sélectionner une ligne affiche la toolbar", async ({ page }) => {
		const table = page.locator("table");
		const emptyState = page.getByText(/aucune personnalisation|aucune demande/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de personnalisations dans la table");

		const firstRowCheckbox = table.locator("tbody tr").first().getByRole("checkbox");
		await firstRowCheckbox.check();

		const selectionToolbar = page.getByText(/sélectionné/i);
		await expect(selectionToolbar).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

test.describe("Admin - Personnalisations (détail)", { tag: ["@regression"] }, () => {
	test("naviguer vers le détail d'une personnalisation", async ({ page }) => {
		await page.goto(CUSTOMIZATIONS_URL);
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const emptyState = page.getByText(/aucune personnalisation|aucune demande/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de personnalisations dans la table");

		// Click on first row link
		const firstRowLink = table.locator("tbody tr").first().getByRole("link").first();
		const hasLink = (await firstRowLink.count()) > 0;

		if (hasLink) {
			await firstRowLink.click();
		} else {
			// Try clicking the row itself
			await table.locator("tbody tr").first().click();
		}

		await page.waitForLoadState("domcontentloaded");
		await expect(page).toHaveURL(/\/admin\/marketing\/personnalisations\//);

		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();
	});

	test("la page détail affiche les informations client", async ({ page }) => {
		await page.goto(CUSTOMIZATIONS_URL);
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de personnalisations dans la table");

		// Navigate to detail
		const firstRowLink = table.locator("tbody tr").first().getByRole("link").first();
		const hasLink = (await firstRowLink.count()) > 0;

		if (hasLink) {
			await firstRowLink.click();
		} else {
			await table.locator("tbody tr").first().click();
		}

		await page.waitForLoadState("domcontentloaded");

		// Client info should be present
		const clientInfo = page.getByText(/email|prénom|téléphone|type de produit/i);
		await expect(clientInfo.first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		// Status badge should be visible
		const statusBadge = page.getByText(/En attente|En cours|Terminée|Finalisée/i);
		await expect(statusBadge.first()).toBeVisible();
	});

	test("le formulaire de mise à jour de statut est disponible", async ({ page }) => {
		await page.goto(CUSTOMIZATIONS_URL);
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de personnalisations");

		const firstRowLink = table.locator("tbody tr").first().getByRole("link").first();
		const hasLink = (await firstRowLink.count()) > 0;

		if (hasLink) {
			await firstRowLink.click();
		} else {
			await table.locator("tbody tr").first().click();
		}

		await page.waitForLoadState("domcontentloaded");

		// Status update form or button should exist
		const statusForm = page
			.getByRole("button", { name: /Mettre à jour|Changer le statut|Modifier le statut/i })
			.or(page.getByLabel(/Statut/i));
		await expect(statusForm.first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});
});
