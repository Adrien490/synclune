import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";
import { TEST_RUN_ID } from "../helpers/test-run";
import { getE2ePrisma } from "../helpers/db";

const PRODUCT_TYPES_URL = "/admin/catalogue/types-de-produits";

test.describe("Admin - Types de bijoux (page)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PRODUCT_TYPES_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("affiche la page avec le titre et le bouton de création", async ({ page }) => {
		await expect(page).toHaveURL(new RegExp(PRODUCT_TYPES_URL));
		const heading = page.getByRole("heading", { name: /Types de bijoux/i });
		await expect(heading).toBeVisible();
		const createButton = page.getByRole("button", { name: /Créer un type/i });
		await expect(createButton).toBeVisible();
	});

	test("affiche le tableau de données ou un état vide", async ({ page }) => {
		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/aucun type/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("affiche la barre de recherche", async ({ page }) => {
		const searchInput = page
			.getByPlaceholder(/Rechercher par label, slug/i)
			.filter({ visible: true })
			.first();
		await expect(searchInput).toBeVisible();
	});

	test("la recherche filtre les résultats", async ({ page }) => {
		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/aucun type/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de types de bijoux dans la table");

		const searchInput = page
			.getByPlaceholder(/Rechercher par label, slug/i)
			.filter({ visible: true })
			.first();
		await searchInput.fill("zzz_inexistant_xyz");

		// La frappe peut précéder l'hydratation : on re-tente jusqu'à ce que l'URL
		// porte la recherche (debounce compris).
		await expect(async () => {
			if (!page.url().includes("search=")) {
				await searchInput.fill("zzz_inexistant_xyz");
			}
			expect(page.url()).toContain("search=");
		}).toPass({ timeout: TIMEOUTS.DATA_LOAD });

		const noResults = page
			.getByText(/aucun type|aucun résultat/i)
			.filter({ visible: true })
			.first();
		await expect(noResults).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

test.describe("Admin - Types de bijoux (création)", { tag: ["@regression"] }, () => {
	const testLabel = `Type Test ${TEST_RUN_ID}`;

	test.beforeEach(async ({ page }) => {
		await page.goto(PRODUCT_TYPES_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("ouvre le dialogue de création au clic sur le bouton", async ({ page }) => {
		const createButton = page.getByRole("button", { name: /Créer un type/i });
		await createButton.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await expect(dialog.getByRole("heading", { name: /Créer un type de bijou/i })).toBeVisible();
	});

	test("valide que le champ label est requis", async ({ page }) => {
		const createButton = page.getByRole("button", { name: /Créer un type/i });
		await createButton.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Le bouton n'est plus désactivé à vide : la soumission affiche l'erreur de champ.
		const submitButton = dialog.getByRole("button", { name: /Créer le type/i });
		await submitButton.click();
		await expect(dialog.getByText(/label est requis/i).first()).toBeVisible({
			timeout: TIMEOUTS.VALIDATION,
		});
		await expect(dialog).toBeVisible();
	});

	test("crée un nouveau type de bijou avec succès", async ({ page }) => {
		const createButton = page.getByRole("button", { name: /Créer un type/i });
		await createButton.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Fill label
		const labelInput = dialog.getByLabel(/Label/i);
		await labelInput.fill(testLabel);

		// (Plus de champ description sur le formulaire lean.)

		// Submit
		const submitButton = dialog.getByRole("button", { name: /Créer le type/i });
		await expect(submitButton).toBeEnabled();
		await submitButton.click();

		await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		try {
			// Doctrine : après la mutation, la BASE fait foi (le toast peut être raté).
			const prisma = getE2ePrisma();
			await expect
				.poll(async () => prisma.productType.count({ where: { label: testLabel } }), {
					timeout: TIMEOUTS.DATA_LOAD,
				})
				.toBe(1);

			// La liste nue est cachée et paginée : on vérifie la ligne via une URL de
			// recherche (clé de cache neuve), re-chargée tant que le stream est en retard.
			await expect(async () => {
				await page.goto(`${PRODUCT_TYPES_URL}?search=${encodeURIComponent(testLabel)}`);
				await expect(page.getByText(testLabel).filter({ visible: true }).first()).toBeVisible({
					timeout: 5000,
				});
			}).toPass({ timeout: 30000 });
		} finally {
			// Nettoyage in-spec : le teardown global ne ramasse que les commandes.
			await getE2ePrisma().productType.deleteMany({ where: { label: testLabel } });
		}
	});
});

test.describe("Admin - Types de bijoux (modification)", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(PRODUCT_TYPES_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("ouvre le dialogue d'édition via les actions de ligne", async ({ page }) => {
		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/aucun type/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de types de bijoux à modifier");

		// Migration lean : plus d'interrupteur « Actif » sur les lignes (ni de types
		// « système » verrouillés) — la première ligne expose directement Éditer.
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture du menu.
		const actionsTrigger = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		await expect(async () => {
			await actionsTrigger.click();
			await expect(page.getByRole("menuitem").first()).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 10000 });

		const editOption = page.getByRole("menuitem", { name: /Éditer/i });
		await expect(editOption).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await editOption.click();

		// Dialog opens in update mode
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await expect(dialog.getByRole("heading", { name: /Modifier le type de bijou/i })).toBeVisible();

		// Label field should be pre-filled
		const labelInput = dialog.getByLabel(/Label/i);
		const currentLabel = await labelInput.inputValue();
		expect(currentLabel.length).toBeGreaterThan(0);
	});
});

test.describe("Admin - Types de bijoux (suppression)", { tag: ["@regression"] }, () => {
	const labelToDelete = `Type Suppression ${TEST_RUN_ID}`;

	test("crée puis supprime un type de bijou", async ({ page }) => {
		await page.goto(PRODUCT_TYPES_URL);
		await page.waitForLoadState("domcontentloaded");

		// Step 1: Create a type to delete
		const createButton = page.getByRole("button", { name: /Créer un type/i });
		await createButton.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await dialog.getByLabel(/Label/i).fill(labelToDelete);
		await dialog.getByRole("button", { name: /Créer le type/i }).click();
		await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// La base fait foi sur la création (doctrine), avant toute assertion de liste.
		const prisma = getE2ePrisma();
		await expect
			.poll(async () => prisma.productType.count({ where: { label: labelToDelete } }), {
				timeout: TIMEOUTS.DATA_LOAD,
			})
			.toBe(1);

		// Retrouver la ligne via une URL de recherche (clé de cache neuve), re-chargée
		// tant que le stream post-mutation est en retard.
		const table = page.getByRole("table").first();
		const newRow = table.locator("tbody tr").filter({ hasText: labelToDelete });
		await expect(async () => {
			await page.goto(`${PRODUCT_TYPES_URL}?search=${encodeURIComponent(labelToDelete)}`);
			await expect(newRow).toBeVisible({ timeout: 5000 });
		}).toPass({ timeout: 30000 });

		// Step 2: Open row actions and delete
		const actionsButton = newRow.getByRole("button", { name: /Actions/i });
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture du menu.
		await expect(async () => {
			await actionsButton.click();
			await expect(page.getByRole("menuitem").first()).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 10000 });

		const deleteOption = page.getByRole("menuitem", { name: /Supprimer/i });
		await expect(deleteOption).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await deleteOption.click();

		// Step 3: Confirm deletion in the alert dialog
		const confirmDialog = page.getByRole("alertdialog");
		await expect(confirmDialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await expect(confirmDialog.getByText(labelToDelete)).toBeVisible();

		const confirmButton = confirmDialog.getByRole("button", {
			name: /Supprimer|Confirmer/i,
		});
		await confirmButton.click();

		// Step 4 : la suppression se vérifie en BASE (doctrine), puis la ligne disparaît
		await expect
			.poll(async () => prisma.productType.count({ where: { label: labelToDelete } }), {
				timeout: TIMEOUTS.DATA_LOAD,
			})
			.toBe(0);
		await expect(newRow).not.toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("bloque la suppression si le type est lié à des produits actifs", async ({ page }) => {
		await page.goto(PRODUCT_TYPES_URL);
		await page.waitForLoadState("domcontentloaded");

		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/aucun type/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de types dans la table");

		// Find a row that has products (non-zero count in column)
		const rowWithProducts = table.locator("tbody tr").filter({ hasNotText: "0" }).first();

		const hasRowWithProducts = (await rowWithProducts.count()) > 0;
		test.skip(!hasRowWithProducts, "Aucun type lié à des produits actifs");

		const actionsButton = rowWithProducts.getByRole("button", { name: /Actions/i });
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture du menu.
		await expect(async () => {
			await actionsButton.click();
			await expect(page.getByRole("menuitem").first()).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 10000 });

		const deleteOption = page.getByRole("menuitem", { name: /Supprimer/i });
		if ((await deleteOption.count()) === 0) {
			test.skip(true, "Pas d'option supprimer (type système)");
		}
		await deleteOption.click();

		const confirmDialog = page.getByRole("alertdialog");
		await expect(confirmDialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Le dialog affiche « Impossible : N produit(s) utilise(nt) encore le type… »
		await expect(confirmDialog.getByText(/Impossible/i)).toBeVisible();
	});

	test.afterAll(async () => {
		// Filet : ne pas laisser traîner le type si la suppression UI a échoué.
		await getE2ePrisma().productType.deleteMany({ where: { label: labelToDelete } });
	});
});
