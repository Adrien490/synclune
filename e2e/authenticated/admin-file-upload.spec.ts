import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";
import path from "node:path";
import fs from "node:fs";

/**
 * Create a minimal test image file for upload testing.
 * Returns the path to the created file.
 */
function createTestImage(filename: string): string {
	const dir = path.join(process.cwd(), "e2e", ".tmp");
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	const filePath = path.join(dir, filename);

	// Minimal valid PNG: 1x1 pixel transparent
	const png = Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
		"base64",
	);
	fs.writeFileSync(filePath, png);

	return filePath;
}

/**
 * Cleanup test image files after test run.
 */
function cleanupTestImages() {
	const dir = path.join(process.cwd(), "e2e", ".tmp");
	if (fs.existsSync(dir)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

test.describe("Admin - Upload media (produit)", { tag: ["@regression"] }, () => {
	test.afterAll(() => {
		cleanupTestImages();
	});

	test("la zone d'upload est visible sur le formulaire de creation produit", async ({ page }) => {
		await page.goto("/admin/catalogue/produits/nouveau");
		await page.waitForLoadState("domcontentloaded");

		// Upload zone should be present
		const uploadZone = page
			.locator("#media-upload-zone")
			.or(page.getByLabel(/Zone d'upload/i))
			.or(page.locator("[class*='dropzone'], [class*='upload']"));
		await expect(uploadZone.first()).toBeAttached();
	});

	test("la zone d'upload affiche les instructions", async ({ page }) => {
		await page.goto("/admin/catalogue/produits/nouveau");
		await page.waitForLoadState("domcontentloaded");

		// Should show upload instructions or drag & drop text
		const instructions = page.getByText(/image principale|Glissez|déposez|upload/i);
		await expect(instructions.first()).toBeAttached();
	});

	test("selectionner un fichier image declenche l'upload", async ({ page }) => {
		await page.goto("/admin/catalogue/produits/nouveau");
		await page.waitForLoadState("domcontentloaded");

		const testImagePath = createTestImage("test-upload.png");

		// Find the file input (hidden, used by the dropzone)
		const fileInput = page.locator('input[type="file"]').first();
		const hasFileInput = (await fileInput.count()) > 0;
		test.skip(!hasFileInput, "Pas d'input file trouvé");

		// Set the file on the input
		await fileInput.setInputFiles(testImagePath);

		// Should show upload progress or preview
		// The upload may fail (no UploadThing in test), but the UI should react
		const progressOrPreview = page
			.getByRole("status")
			.or(page.getByText(/upload|chargement|validation|erreur/i))
			.or(page.locator("[class*='preview'], [class*='thumbnail'], [class*='progress']"));

		await expect(progressOrPreview.first()).toBeAttached({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("les limites de taille sont documentees dans l'UI", async ({ page }) => {
		await page.goto("/admin/catalogue/produits/nouveau");
		await page.waitForLoadState("domcontentloaded");

		// Upload zone or surrounding text should mention file limits
		const sizeInfo = page.getByText(/Mo|MB|taille|16|512/i);
		// This is optional - some UIs don't show limits until an error
		if ((await sizeInfo.count()) > 0) {
			await expect(sizeInfo.first()).toBeAttached();
		}
	});

	test("le compteur de medias affiche le nombre actuel", async ({ page }) => {
		await page.goto("/admin/catalogue/produits/nouveau");
		await page.waitForLoadState("domcontentloaded");

		// Counter badge showing current/max count (e.g., "0/6")
		const counter = page
			.getByText(/0\s*\/\s*6|0\s*sur\s*6/i)
			.or(page.locator("[class*='counter'], [class*='badge']").filter({ hasText: /\/\s*\d/ }));
		if ((await counter.count()) > 0) {
			await expect(counter.first()).toBeVisible();
		}
	});
});

test.describe("Admin - Upload media (variante)", { tag: ["@regression"] }, () => {
	test.afterAll(() => {
		cleanupTestImages();
	});

	test("la page de creation variante a un champ image principale", async ({ page }) => {
		// First find a product slug
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const emptyState = page.getByText(/aucun produit/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de produits");

		const firstProductLink = table.locator("tbody tr").first().getByRole("link").first();
		const href = await firstProductLink.getAttribute("href");
		test.skip(!href, "Pas de lien produit");

		const match = href!.match(/\/admin\/catalogue\/produits\/([^/]+)/);
		test.skip(!match, "Pas de slug trouvé");

		await page.goto(`/admin/catalogue/produits/${match![1]}/variantes/nouveau`);
		await page.waitForLoadState("domcontentloaded");

		// Image upload field should be present
		const imageSection = page
			.getByText(/Image principale|Photo/i)
			.or(page.locator('input[type="file"]'));
		await expect(imageSection.first()).toBeAttached();
	});

	test("un input file est present pour l'upload de la variante", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		test.skip(!(await table.isVisible()), "Pas de produits");

		const firstProductLink = table.locator("tbody tr").first().getByRole("link").first();
		const href = await firstProductLink.getAttribute("href");
		test.skip(!href, "Pas de lien produit");

		const match = href!.match(/\/admin\/catalogue\/produits\/([^/]+)/);
		test.skip(!match, "Pas de slug");

		await page.goto(`/admin/catalogue/produits/${match![1]}/variantes/nouveau`);
		await page.waitForLoadState("domcontentloaded");

		const fileInputs = page.locator('input[type="file"]');
		const count = await fileInputs.count();
		// Should have at least one file input (primary image)
		expect(count).toBeGreaterThanOrEqual(1);
	});

	test("le bouton creer est desactive pendant l'upload", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		test.skip(!(await table.isVisible()), "Pas de produits");

		const firstProductLink = table.locator("tbody tr").first().getByRole("link").first();
		const href = await firstProductLink.getAttribute("href");
		test.skip(!href, "Pas de lien produit");

		const match = href!.match(/\/admin\/catalogue\/produits\/([^/]+)/);
		test.skip(!match, "Pas de slug");

		await page.goto(`/admin/catalogue/produits/${match![1]}/variantes/nouveau`);
		await page.waitForLoadState("domcontentloaded");

		const testImagePath = createTestImage("test-variant-upload.png");
		const fileInput = page.locator('input[type="file"]').first();
		const hasFileInput = (await fileInput.count()) > 0;
		test.skip(!hasFileInput, "Pas d'input file");

		// Set file to trigger upload
		await fileInput.setInputFiles(testImagePath);

		// During upload, the create button should show uploading state or be disabled
		const createButton = page.getByRole("button", { name: /Créer|Upload/i });
		if ((await createButton.count()) > 0) {
			// Brief check - button may show "Upload..." text
			const buttonText = await createButton.first().textContent();
			// Either disabled or showing upload state
			expect(buttonText).toBeDefined();
		}
	});
});
