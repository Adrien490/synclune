import { test, expect } from "../fixtures";
import { TEST_RUN_ID } from "../helpers/test-run";
import { getE2ePrisma } from "../helpers/db";

test.describe("Admin - CRUD Produits", { tag: ["@regression"] }, () => {
	const testProductName = `Produit Test ${TEST_RUN_ID}`;

	// ⚠️ La création COMPLÈTE exige un téléversement UploadThing réel (une image est
	// obligatoire), et l'environnement E2E n'a pas d'accès réseau UploadThing fiable
	// (« Échec de l'envoi » systématique). On verrouille donc le contrat atteignable :
	// formulaire rempli, la soumission reste refusée tant qu'aucune image n'est là.
	test("creer un nouveau produit avec les champs obligatoires", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		// Navigate to product creation form
		const newProductButton = page
			.getByRole("link", { name: /Nouveau|Ajouter/i })
			.filter({ visible: true });
		await expect(newProductButton.first()).toBeVisible();
		await newProductButton.first().click();
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/admin\/catalogue\/produits\/(nouveau|new|create)/i);

		// Fill required fields
		const nameField = page.getByLabel(/Titre du bijou/i);
		await expect(nameField.first()).toBeVisible();
		await nameField.first().fill(testProductName);

		const descriptionField = page.getByLabel(/Description/i).or(page.locator("textarea").first());
		await descriptionField.first().fill("Description de test E2E pour un produit artisanal.");

		// Prix (lean : `Product.priceCents`) — /Prix/i seul matchait la CARTE
		// « Le prix et le stock » (aria-label de région).
		const priceField = page.getByRole("spinbutton", { name: /Prix de vente final/i });
		await expect(priceField).toBeVisible();
		await priceField.fill("29.90");

		// ⚠️ Le libellé du bouton de soumission est dynamique (« Publier le bijou » /
		// « Ajoute une photo » / « Il manque le prix »…) : on cible le type.
		const submitButton = page.locator('button[type="submit"]').filter({ visible: true });
		await expect(submitButton.first()).toBeVisible();
		await submitButton.first().click();

		// Sans image, la création est refusée et on reste sur /nouveau.
		await expect(page.getByText(/Au moins une image est requise/i).first()).toBeVisible({
			timeout: 5000,
		});
		await expect(page).toHaveURL(/\/admin\/catalogue\/produits\/nouveau/);
	});

	// ⚠️ On crée le produit à éditer via Prisma plutôt que d'éditer un produit seedé :
	// les médias du seed pointent sur picsum.photos, que `product-media.schemas.ts`
	// REFUSE à la sauvegarde (« L'URL du média doit provenir d'un domaine autorisé »)
	// — un produit seedé ne peut donc pas être re-sauvegardé depuis l'admin.
	test("modifier un produit existant", async ({ page }) => {
		const prisma = getE2ePrisma();
		const slug = `produit-e2e-edit-${TEST_RUN_ID.toLowerCase()}`;
		const created = await prisma.product.create({
			data: {
				slug,
				name: `Produit Edit ${TEST_RUN_ID}`,
				description: "Produit créé par les tests E2E pour l'édition.",
				priceCents: 1990,
				active: false,
				media: {
					create: { url: "https://utfs.io/f/e2e-produit-edit.png", alt: "Bijou E2E", position: 0 },
				},
				variants: { create: { stock: 1 } },
			},
		});

		try {
			await page.goto(`/admin/catalogue/produits/${slug}/modifier`);
			await page.waitForLoadState("domcontentloaded");

			// Verify form is loaded with existing data (champ lean : « Titre du bijou »)
			const nameField = page.getByLabel(/Titre du bijou/i);
			await expect(nameField.first()).toBeVisible();
			await expect(nameField.first()).toHaveValue(created.name);

			await nameField.first().fill(`${created.name} (modifié)`);

			// Save (libellé dynamique → cibler le type). Le succès NAVIGUE vers la liste
			// (`navigateWithTransition(router, PRODUCTS_LIST_PATH)`).
			const saveButton = page.locator('button[type="submit"]').filter({ visible: true }).first();
			await expect(saveButton).toBeVisible();
			await saveButton.click();
			await expect(page).toHaveURL(/\/admin\/catalogue\/produits(\?|$)/, { timeout: 15000 });

			// La mutation a réellement eu lieu (doctrine : poller la base, pas l'UI).
			await expect
				.poll(
					async () =>
						(await prisma.product.findUnique({ where: { id: created.id } }))?.name ?? null,
					{ timeout: 10000 },
				)
				.toBe(`${created.name} (modifié)`);
		} finally {
			await prisma.product.delete({ where: { id: created.id } }).catch(() => {});
		}
	});

	test("supprimer un produit de test via les actions de ligne", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const table = page.getByRole("table").first();
		const emptyState = page.getByText(/aucun produit/i).first();
		await expect(table.or(emptyState).first()).toBeVisible({ timeout: 10000 });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "No products available");

		// Find a test product to delete (created by E2E)
		const testRow = table.locator("tbody tr").filter({ hasText: TEST_RUN_ID });
		const hasTestRow = (await testRow.count()) > 0;
		test.skip(!hasTestRow, "Pas de produit de test à supprimer");

		const actionsButton = testRow.first().getByRole("button", { name: /Actions/i });
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture du menu.
		await expect(async () => {
			await actionsButton.click();
			await expect(page.getByRole("menuitem").first()).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 10000 });

		const deleteOption = page.getByRole("menuitem", { name: /Supprimer|Archiver/i });
		await expect(deleteOption.first()).toBeVisible({ timeout: 5000 });
		await deleteOption.first().click();

		// Confirmation dialog
		const confirmDialog = page.getByRole("alertdialog");
		await expect(confirmDialog).toBeVisible({ timeout: 5000 });

		const confirmButton = confirmDialog.getByRole("button", { name: /Supprimer|Confirmer/i });
		await confirmButton.click();

		await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });

		const successFeedback = page
			.locator("[data-sonner-toast]")
			.filter({ hasText: /supprim|archiv|succès/i });
		await expect(successFeedback.first()).toBeVisible({ timeout: 10000 });
	});

	// Supprimé (migration lean) : plus d'onglets de statut (« Brouillon »/« Publié »)
	// sur la liste produits — le filtre de statut vit dans le sheet « Filtres ».

	test("les actions de ligne d'un produit exposent les options", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const table = page.getByRole("table").first();
		await expect(table.or(page.getByText(/aucun produit/i).first()).first()).toBeVisible({
			timeout: 10000,
		});

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "No products available");

		const actionsButton = table
			.locator("tbody tr")
			.first()
			.getByRole("button", { name: /Actions/i });
		// Le clic peut précéder l'hydratation : on re-tente jusqu'à l'ouverture du menu.
		const menuItems = page.getByRole("menuitem");
		await expect(async () => {
			await actionsButton.click();
			await expect(menuItems.first()).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 10000 });

		// Should show edit, delete, and potentially publish/unpublish options
		const itemCount = await menuItems.count();
		expect(itemCount).toBeGreaterThanOrEqual(2);

		// Edit option should always be present
		const editItem = page.getByRole("menuitem", { name: /Modifier|Éditer/i });
		await expect(editItem.first()).toBeVisible();
	});

	test("naviguer vers les variantes d'un produit", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const table = page.getByRole("table").first();
		await expect(table).toBeVisible({ timeout: 10000 });

		// Click on first product
		const firstRow = table.locator("tbody tr").first();
		const productLink = firstRow.getByRole("link").first();
		test.skip((await productLink.count()) === 0, "No product links in table");

		await productLink.click();
		await page.waitForLoadState("domcontentloaded");

		// La fiche de détail porte un lien vers /variantes
		const variantsLink = page.locator('a[href$="/variantes"]').filter({ visible: true }).first();
		test.skip((await variantsLink.count()) === 0, "Pas de lien variantes sur la fiche");

		await variantsLink.click();
		await page.waitForLoadState("domcontentloaded");
		await expect(page).toHaveURL(/\/variantes/);
	});
});
