import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";
import { TEST_RUN_ID } from "../helpers/test-run";
import { getE2ePrisma } from "../helpers/db";

const MATERIALS_URL = "/admin/catalogue/materiaux";

test.describe("Admin - Matériaux (page)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(MATERIALS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("affiche la page avec le titre et le bouton de création", async ({ page }) => {
		await expect(page).toHaveURL(new RegExp(MATERIALS_URL));
		const heading = page.getByRole("heading", { name: /Matériaux/i });
		await expect(heading).toBeVisible();
		const createButton = page.getByRole("button", { name: /Créer|Ajouter|Nouveau/i });
		await expect(createButton.first()).toBeVisible();
	});

	test("affiche le tableau de données ou un état vide", async ({ page }) => {
		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/aucun matériau/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("affiche la barre de recherche", async ({ page }) => {
		const searchInput = page
			.getByPlaceholder(/Rechercher/i)
			.or(page.getByRole("searchbox"))
			.filter({ visible: true });
		await expect(searchInput.first()).toBeVisible();
	});

	test("la recherche filtre les résultats", async ({ page }) => {
		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/aucun matériau/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de matériaux dans la table");

		const searchInput = page
			.getByPlaceholder(/Rechercher/i)
			.or(page.getByRole("searchbox"))
			.filter({ visible: true });
		await searchInput.first().fill("zzz_inexistant_xyz");

		// La frappe peut précéder l'hydratation (événements perdus) : on re-tente
		// jusqu'à ce que l'URL porte la recherche.
		await expect(async () => {
			if (!page.url().includes("search=")) {
				await searchInput.first().fill("zzz_inexistant_xyz");
			}
			expect(page.url()).toContain("search=");
		}).toPass({ timeout: TIMEOUTS.DATA_LOAD });

		const noResults = page
			.getByText(/aucun matériau|aucun résultat/i)
			.filter({ visible: true })
			.first();
		await expect(noResults).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

test.describe("Admin - Matériaux (création)", { tag: ["@regression"] }, () => {
	const testLabel = `Matériau ${TEST_RUN_ID}`;

	test("ouvre le dialogue de création au clic", async ({ page }) => {
		await page.goto(MATERIALS_URL);
		await page.waitForLoadState("domcontentloaded");

		const createButton = page.getByRole("button", { name: /Créer|Ajouter|Nouveau/i });
		const dialog = page.getByRole("dialog");
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture.
		await expect(async () => {
			await createButton.first().click();
			await expect(dialog).toBeVisible({ timeout: 2000 });
		}).toPass({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("crée un nouveau matériau avec succès", async ({ page }) => {
		await page.goto(MATERIALS_URL);
		await page.waitForLoadState("domcontentloaded");

		const createButton = page.getByRole("button", { name: /Créer|Ajouter|Nouveau/i });
		const dialog = page.getByRole("dialog");
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture.
		await expect(async () => {
			await createButton.first().click();
			await expect(dialog).toBeVisible({ timeout: 2000 });
		}).toPass({ timeout: TIMEOUTS.DATA_LOAD });

		const nameInput = dialog.getByLabel(/Nom/i);
		await nameInput.fill(testLabel);

		const descriptionInput = dialog.getByLabel(/Description/i);
		if ((await descriptionInput.count()) > 0) {
			await descriptionInput.first().fill("Matériau créé par les tests E2E.");
		}

		const submitButton = dialog.getByRole("button", { name: /Créer|Enregistrer|Sauvegarder/i });
		await expect(submitButton.first()).toBeEnabled();
		await submitButton.first().click();

		await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		try {
			// Doctrine : après la mutation, la BASE fait foi (le toast peut être raté).
			const prisma = getE2ePrisma();
			await expect
				.poll(async () => prisma.material.count({ where: { name: testLabel } }), {
					timeout: TIMEOUTS.DATA_LOAD,
				})
				.toBe(1);

			// La liste nue est cachée et paginée : on vérifie la ligne via une URL de
			// recherche (clé de cache neuve), re-chargée tant que le stream est en retard.
			await expect(async () => {
				await page.goto(`${MATERIALS_URL}?search=${encodeURIComponent(testLabel)}`);
				await expect(page.getByText(testLabel).filter({ visible: true }).first()).toBeVisible({
					timeout: 5000,
				});
			}).toPass({ timeout: 30000 });
		} finally {
			// Nettoyage in-spec : le teardown global ne ramasse que les commandes.
			await getE2ePrisma().material.deleteMany({ where: { name: testLabel } });
		}
	});
});

test.describe("Admin - Matériaux (modification)", { tag: ["@regression"] }, () => {
	test("ouvre le dialogue d'édition via les actions de ligne", async ({ page }) => {
		await page.goto(MATERIALS_URL);
		await page.waitForLoadState("domcontentloaded");

		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/aucun matériau/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de matériaux à modifier");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture du menu.
		await expect(async () => {
			await actionsButton.click();
			await expect(page.getByRole("menuitem").first()).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 10000 });

		const editOption = page.getByRole("menuitem", { name: /Éditer|Modifier/i });
		await expect(editOption).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await editOption.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		const nameInput = dialog.getByLabel(/Nom/i);
		const currentName = await nameInput.inputValue();
		expect(currentName.length).toBeGreaterThan(0);
	});
});

test.describe("Admin - Matériaux (actions)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(MATERIALS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("duplique un matériau via les actions de ligne", async ({ page }) => {
		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/aucun matériau/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de matériaux à dupliquer");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture du menu.
		await expect(async () => {
			await actionsButton.click();
			await expect(page.getByRole("menuitem").first()).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 10000 });

		const duplicateOption = page.getByRole("menuitem", { name: /Dupliquer/i });
		const hasDuplicate = (await duplicateOption.count()) > 0;
		test.skip(!hasDuplicate, "Pas d'option dupliquer");

		await duplicateOption.click();

		const toast = page.locator("[data-sonner-toast]").filter({ hasText: /dupliqu|succès|créé/i });
		await expect(toast.first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	// Supprimé (migration lean) : les matériaux n'ont plus de statut actif/inactif —
	// `use-material-actions.ts` n'expose que Voir / Éditer / Dupliquer / Voir les
	// variantes / Supprimer.
});

test.describe("Admin - Matériaux (suppression)", { tag: ["@regression"] }, () => {
	const labelToDelete = `Matériau Suppr ${TEST_RUN_ID}`;

	test("crée puis supprime un matériau", async ({ page }) => {
		await page.goto(MATERIALS_URL);
		await page.waitForLoadState("domcontentloaded");

		// Create
		const createButton = page.getByRole("button", { name: /Créer|Ajouter|Nouveau/i });
		const dialog = page.getByRole("dialog");
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture.
		await expect(async () => {
			await createButton.first().click();
			await expect(dialog).toBeVisible({ timeout: 2000 });
		}).toPass({ timeout: TIMEOUTS.DATA_LOAD });
		await dialog.getByLabel(/Nom/i).fill(labelToDelete);

		const submitButton = dialog.getByRole("button", { name: /Créer|Enregistrer/i });
		await submitButton.first().click();
		await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// La base fait foi sur la création (doctrine), avant toute assertion de liste.
		const prisma = getE2ePrisma();
		await expect
			.poll(async () => prisma.material.count({ where: { name: labelToDelete } }), {
				timeout: TIMEOUTS.DATA_LOAD,
			})
			.toBe(1);

		// Retrouver la ligne via une URL de recherche (clé de cache neuve), re-chargée
		// tant que le stream post-mutation est en retard.
		const table = page.getByRole("table").first();
		const newRow = table.locator("tbody tr").filter({ hasText: labelToDelete });
		await expect(async () => {
			await page.goto(`${MATERIALS_URL}?search=${encodeURIComponent(labelToDelete)}`);
			await expect(newRow).toBeVisible({ timeout: 5000 });
		}).toPass({ timeout: 30000 });

		// Delete
		const actionsButton = newRow.getByRole("button", { name: /Actions/i });
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture du menu.
		await expect(async () => {
			await actionsButton.click();
			await expect(page.getByRole("menuitem").first()).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 10000 });

		const deleteOption = page.getByRole("menuitem", { name: /Supprimer/i });
		await expect(deleteOption).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await deleteOption.click();

		const confirmDialog = page.getByRole("alertdialog");
		await expect(confirmDialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		const confirmButton = confirmDialog.getByRole("button", {
			name: /Supprimer|Confirmer/i,
		});
		await confirmButton.click();

		// Doctrine : la suppression se vérifie en BASE, pas sur un texte d'UI ambigu.
		await expect
			.poll(async () => prisma.material.count({ where: { name: labelToDelete } }), {
				timeout: TIMEOUTS.DATA_LOAD,
			})
			.toBe(0);
		await expect(newRow).not.toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test.afterAll(async () => {
		// Filet : ne pas laisser traîner le matériau si la suppression UI a échoué.
		await getE2ePrisma().material.deleteMany({ where: { name: labelToDelete } });
	});
});
