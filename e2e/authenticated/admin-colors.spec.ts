import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";
import { TEST_RUN_ID } from "../helpers/test-run";
import { getE2ePrisma } from "../helpers/db";

const COLORS_URL = "/admin/catalogue/couleurs";

test.describe("Admin - Couleurs (page)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(COLORS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("affiche la page avec le titre et le bouton de création", async ({ page }) => {
		await expect(page).toHaveURL(new RegExp(COLORS_URL));
		const heading = page.getByRole("heading", { name: /Couleurs/i });
		await expect(heading).toBeVisible();
		const createButton = page.getByRole("button", { name: /Créer|Ajouter|Nouveau/i });
		await expect(createButton.first()).toBeVisible();
	});

	test("affiche le tableau de données ou un état vide", async ({ page }) => {
		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/aucune couleur/i).first();
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
		const emptyState = page.getByText(/aucune couleur/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de couleurs dans la table");

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
			.getByText(/aucune couleur|aucun résultat/i)
			.filter({ visible: true })
			.first();
		await expect(noResults).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

test.describe("Admin - Couleurs (création)", { tag: ["@regression"] }, () => {
	const testLabel = `Couleur ${TEST_RUN_ID}`;
	// Le hex est UNIQUE en base : un littéral (FF5733) rejouait « existe déjà » dès
	// le second run. Dérivé du timestamp du run.
	const testHex = (Date.now() % 0xffffff).toString(16).padStart(6, "0");

	test("ouvre le dialogue de création au clic sur le bouton", async ({ page }) => {
		await page.goto(COLORS_URL);
		await page.waitForLoadState("domcontentloaded");

		const createButton = page.getByRole("button", { name: /Créer|Ajouter|Nouveau/i });
		const dialog = page.getByRole("dialog");
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture.
		await expect(async () => {
			await createButton.first().click();
			await expect(dialog).toBeVisible({ timeout: 2000 });
		}).toPass({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("crée une nouvelle couleur avec succès", async ({ page }) => {
		await page.goto(COLORS_URL);
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

		// Le champ hex s'appelle « Couleur* » et il est REQUIS (« Le code couleur est
		// requis ») — un getByLabel(/Couleur/) attrapait l'aria-label du <form> lui-même.
		const hexInput = dialog.getByRole("textbox", { name: /^Couleur/ });
		await hexInput.first().fill(testHex);

		const submitButton = dialog.getByRole("button", { name: /Créer|Enregistrer|Sauvegarder/i });
		await expect(submitButton.first()).toBeEnabled();
		await submitButton.first().click();

		await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		try {
			// Doctrine : après la mutation, la BASE fait foi (le toast peut être raté).
			const prisma = getE2ePrisma();
			await expect
				.poll(async () => prisma.color.count({ where: { name: testLabel } }), {
					timeout: TIMEOUTS.DATA_LOAD,
				})
				.toBe(1);

			// La liste nue est cachée et paginée : on vérifie la ligne via une URL de
			// recherche (clé de cache neuve), re-chargée tant que le stream est en retard.
			await expect(async () => {
				await page.goto(`${COLORS_URL}?search=${encodeURIComponent(testLabel)}`);
				await expect(page.getByText(testLabel).filter({ visible: true }).first()).toBeVisible({
					timeout: 5000,
				});
			}).toPass({ timeout: 30000 });
		} finally {
			// Nettoyage in-spec : le teardown global ne ramasse que les commandes.
			await getE2ePrisma().color.deleteMany({ where: { name: testLabel } });
		}
	});
});

test.describe("Admin - Couleurs (modification)", { tag: ["@regression"] }, () => {
	test("ouvre le dialogue d'édition via les actions de ligne", async ({ page }) => {
		await page.goto(COLORS_URL);
		await page.waitForLoadState("domcontentloaded");

		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/aucune couleur/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de couleurs à modifier");

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

test.describe("Admin - Couleurs (actions)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(COLORS_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("duplique une couleur via les actions de ligne", async ({ page }) => {
		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/aucune couleur/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de couleurs à dupliquer");

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

	// Supprimé (migration lean) : les couleurs n'ont plus de statut actif/inactif —
	// ni interrupteur de colonne, ni item de menu. `use-color-actions.ts` n'expose
	// que Voir / Éditer / Dupliquer / Voir les variantes / Supprimer.
});

test.describe("Admin - Couleurs (suppression)", { tag: ["@regression"] }, () => {
	const labelToDelete = `Couleur Suppr ${TEST_RUN_ID}`;
	const hexToDelete = ((Date.now() + 7919) % 0xffffff).toString(16).padStart(6, "0");

	test("crée puis supprime une couleur", async ({ page }) => {
		await page.goto(COLORS_URL);
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

		const hexInput = dialog.getByRole("textbox", { name: /^Couleur/ });
		await hexInput.first().fill(hexToDelete);

		const submitButton = dialog.getByRole("button", { name: /Créer|Enregistrer/i });
		await submitButton.first().click();
		await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// La base fait foi sur la création (doctrine), avant toute assertion de liste.
		const prisma = getE2ePrisma();
		await expect
			.poll(async () => prisma.color.count({ where: { name: labelToDelete } }), {
				timeout: TIMEOUTS.DATA_LOAD,
			})
			.toBe(1);

		// Retrouver la ligne via une URL de recherche (clé de cache neuve), re-chargée
		// tant que le stream post-mutation est en retard.
		const table = page.getByRole("table").first();
		const newRow = table.locator("tbody tr").filter({ hasText: labelToDelete });
		await expect(async () => {
			await page.goto(`${COLORS_URL}?search=${encodeURIComponent(labelToDelete)}`);
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
			.poll(async () => prisma.color.count({ where: { name: labelToDelete } }), {
				timeout: TIMEOUTS.DATA_LOAD,
			})
			.toBe(0);
		await expect(newRow).not.toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test.afterAll(async () => {
		// Filet : si la suppression UI a échoué, ne pas laisser traîner la couleur
		// (son hex UNIQUE bloquerait les runs suivants).
		await getE2ePrisma().color.deleteMany({ where: { name: labelToDelete } });
	});
});
