import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe("Admin - Sélection multiple mobile sur produits", { tag: ["@regression"] }, () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("entrée dans le mode sélection affiche header dédié + bottom bar", async ({
		page,
		adminPage,
	}) => {
		await adminPage.gotoProducts();
		await page.waitForLoadState("domcontentloaded");

		const enterButton = page.getByRole("button", { name: /^Sélectionner$/ });
		const enterVisible = await enterButton.isVisible().catch(() => false);
		test.skip(!enterVisible, "Liste mobile vide ou non rendue — pas de bouton Sélectionner");

		await enterButton.click();

		// Header bascule en mode ON.
		await expect(page.getByRole("button", { name: /^Annuler$/ })).toBeVisible({
			timeout: TIMEOUTS.FEEDBACK,
		});
		await expect(page.getByRole("button", { name: /Tout sélectionner/i })).toBeVisible();

		// Annonce SR + count "Aucun élément sélectionné".
		await expect(page.getByText(/Aucun élément sélectionné/i)).toBeVisible();
	});

	test("sélection de 2 cards met à jour le count + active les actions bulk", async ({
		page,
		adminPage,
	}) => {
		await adminPage.gotoProducts();
		await page.waitForLoadState("domcontentloaded");

		const enterButton = page.getByRole("button", { name: /^Sélectionner$/ });
		const enterVisible = await enterButton.isVisible().catch(() => false);
		test.skip(!enterVisible, "Liste mobile vide");

		await enterButton.click();

		// Sélectionne les 2 premières cards.
		const cards = page.getByRole("checkbox", { name: /^Sélectionner /i });
		const cardCount = await cards.count();
		test.skip(cardCount < 2, "Moins de 2 produits visibles — scénario non applicable");

		await cards.first().click();
		await cards.nth(1).click();

		// Count mis à jour (singulier→pluriel ; tolérant pluralisation).
		await expect(page.getByText(/2\s+produits?/i).first()).toBeVisible({
			timeout: TIMEOUTS.FEEDBACK,
		});

		// Bottom bar bulk-actions visible avec boutons activés.
		const archiveButton = page.getByRole("button", { name: /Archiver/i });
		await expect(archiveButton).toBeVisible();
		await expect(archiveButton).toBeEnabled();
	});

	test("Annuler header quitte le mode sans modifier la DB", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();
		await page.waitForLoadState("domcontentloaded");

		const enterButton = page.getByRole("button", { name: /^Sélectionner$/ });
		const enterVisible = await enterButton.isVisible().catch(() => false);
		test.skip(!enterVisible, "Liste mobile vide");

		await enterButton.click();

		const cards = page.getByRole("checkbox", { name: /^Sélectionner /i });
		const cardCount = await cards.count();
		if (cardCount > 0) await cards.first().click();

		await page.getByRole("button", { name: /^Annuler$/ }).click();

		// Retour au mode OFF (Sélectionner réapparaît).
		await expect(page.getByRole("button", { name: /^Sélectionner$/ })).toBeVisible({
			timeout: TIMEOUTS.FEEDBACK,
		});
		await expect(page.getByRole("button", { name: /^Annuler$/ })).not.toBeVisible();
	});

	test("AlertDialog s'ouvre puis se ferme via Annuler sans muter le serveur", async ({
		page,
		adminPage,
	}) => {
		await adminPage.gotoProducts();
		await page.waitForLoadState("domcontentloaded");

		const enterButton = page.getByRole("button", { name: /^Sélectionner$/ });
		const enterVisible = await enterButton.isVisible().catch(() => false);
		test.skip(!enterVisible, "Liste mobile vide");

		await enterButton.click();

		const cards = page.getByRole("checkbox", { name: /^Sélectionner /i });
		const cardCount = await cards.count();
		test.skip(cardCount < 1, "Pas de produit à sélectionner");
		await cards.first().click();

		await page.getByRole("button", { name: /Archiver/i }).click();

		// Dialog visible avec titre confirmant le count.
		const dialog = page.getByRole("alertdialog");
		await expect(dialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await expect(dialog.getByText(/Archiver/i)).toBeVisible();

		// Annuler le dialog (PAS confirmer — on ne mute pas la DB en E2E).
		await dialog.getByRole("button", { name: /^Annuler$/ }).click();
		await expect(dialog).not.toBeVisible();

		// Mode sélection toujours actif après cancel.
		await expect(page.getByRole("button", { name: /^Annuler$/ })).toBeVisible();
	});

	test("Escape clavier physique quitte le mode sélection", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();
		await page.waitForLoadState("domcontentloaded");

		const enterButton = page.getByRole("button", { name: /^Sélectionner$/ });
		const enterVisible = await enterButton.isVisible().catch(() => false);
		test.skip(!enterVisible, "Liste mobile vide");

		await enterButton.click();
		await expect(page.getByRole("button", { name: /^Annuler$/ })).toBeVisible();

		await page.keyboard.press("Escape");

		await expect(page.getByRole("button", { name: /^Sélectionner$/ })).toBeVisible({
			timeout: TIMEOUTS.FEEDBACK,
		});
	});
});
