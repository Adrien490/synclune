import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { TIMEOUTS, VIEWPORTS } from "../constants";
import path from "node:path";
import fs from "node:fs";

/**
 * Upload de médias — formulaire produit admin.
 *
 * ⚠️ Cette suite a été RÉÉCRITE (audit UI/UX file upload). La version précédente
 * comptait 7 cas dont 4 ne pouvaient structurellement pas échouer :
 *
 * - « le bouton creer est desactive pendant l'upload » concluait par
 *   `expect(buttonText).toBeDefined()` — vrai pour n'importe quelle chaîne, bouton
 *   actif compris ;
 * - trois cas étaient enveloppés dans `if ((await x.count()) > 0)` et passaient donc
 *   à vide quand l'élément cherché n'existait pas ;
 * - les sélecteurs `.or(page.locator("[class*='upload']"))` matchaient à peu près
 *   n'importe quoi, et les assertions étaient `toBeAttached()` là où les intitulés
 *   promettaient « est visible ».
 *
 * Règles tenues ici : pas de garde `if (count > 0)` autour d'une assertion, pas de
 * sélecteur par fragment de classe, et `toBeVisible` / `toBeDisabled` plutôt que
 * `toBeAttached` dès qu'on parle de ce que voit l'utilisatrice.
 */

// Par PROCESS : les deux describes de ce fichier tournent dans des workers
// parallèles, et un dossier partagé faisait s'entre-supprimer leurs fichiers
// (l'afterAll de l'un pendant que l'autre écrivait — ENOENT mesuré au run 8).
const TMP_DIR = path.join(process.cwd(), "e2e", ".tmp", String(process.pid));

/** PNG 1×1 valide — suffisant pour que le navigateur produise un `image/png`. */
const PNG_1x1 = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
	"base64",
);

function writeTempFile(filename: string, contents: Buffer): string {
	fs.mkdirSync(TMP_DIR, { recursive: true });
	const filePath = path.join(TMP_DIR, filename);
	fs.writeFileSync(filePath, contents);
	return filePath;
}

const NEW_PRODUCT_URL = "/admin/catalogue/produits/nouveau";

/**
 * Sélectionne un fichier et attend son entrée dans la file de confirmation.
 * `setInputFiles` juste après `domcontentloaded` peut précéder l'hydratation :
 * l'événement change part dans le vide et la file ne s'ouvre jamais — on re-tente
 * une fois avant d'échouer.
 */
async function stageFile(page: Page, filePath: string) {
	await expect(
		page.getByRole("button", { name: /Zone d'envoi des médias du bijou/i }),
	).toBeVisible();
	const input = page.locator('input[type="file"]').first();
	const pendingGroup = page.getByRole("group", { name: /en attente de confirmation/i });
	await input.setInputFiles(filePath);
	try {
		await expect(pendingGroup).toBeVisible({ timeout: 3000 });
	} catch {
		await input.setInputFiles(filePath);
		await expect(pendingGroup).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	}
	return pendingGroup;
}

test.describe("Admin — upload de médias produit", { tag: ["@regression"] }, () => {
	test.afterAll(() => {
		fs.rmSync(TMP_DIR, { recursive: true, force: true });
	});

	test.beforeEach(async ({ page }) => {
		await page.goto(NEW_PRODUCT_URL);
		await page.waitForLoadState("domcontentloaded");
	});

	test("la zone d'upload et ses contraintes sont visibles", async ({ page }) => {
		// Sur desktop c'est la NativeDropzone qui est rendue visible (l'action sheet
		// mobile est présente dans le DOM mais masquée par la media query).
		const dropzone = page.getByRole("button", { name: /Zone d'envoi des médias du bijou/i });
		await expect(dropzone).toBeVisible();

		// Les contraintes réellement appliquées par le serveur doivent être écrites.
		await expect(dropzone).toContainText("16 Mo");
		await expect(dropzone).toContainText("64 Mo");
		await expect(dropzone).toContainText("MP4");
		// Plafond de vidéos par envoi — appliqué par le FileRouter, longtemps muet.
		await expect(dropzone).toContainText("2 par envoi");
		// Le collage est implémenté : il doit être découvrable.
		await expect(dropzone).toContainText(/Ctrl\/Cmd\+V/);
	});

	test("le compteur de médias démarre à 0 sur 6", async ({ page }) => {
		await expect(page.getByText("0/6 médias").filter({ visible: true }).first()).toBeVisible();
	});

	test("un fichier choisi passe par la grille de confirmation avant tout envoi", async ({
		page,
	}) => {
		const filePath = writeTempFile("bague.png", PNG_1x1);

		// Étape de revue : le fichier est en attente, pas encore téléversé.
		const pendingGroup = await stageFile(page, filePath);
		await expect(pendingGroup).toContainText("1 fichier en attente");
		await expect(pendingGroup.getByRole("button", { name: /Téléverser 1 média/i })).toBeVisible();
		await expect(pendingGroup.getByRole("button", { name: /Retirer bague\.png/i })).toBeVisible();
	});

	test("retirer un fichier en attente vide la grille de confirmation", async ({ page }) => {
		const filePath = writeTempFile("bague-retrait.png", PNG_1x1);

		const pendingGroup = await stageFile(page, filePath);

		await pendingGroup.getByRole("button", { name: /Retirer bague-retrait\.png/i }).click();

		await expect(pendingGroup).toBeHidden();
	});

	test("annuler la mise en attente ne laisse rien derrière", async ({ page }) => {
		const filePath = writeTempFile("bague-annule.png", PNG_1x1);

		const pendingGroup = await stageFile(page, filePath);

		await pendingGroup.getByRole("button", { name: "Annuler" }).click();

		await expect(pendingGroup).toBeHidden();
		await expect(page.getByText("0/6 médias").filter({ visible: true }).first()).toBeVisible();
	});

	test("un .mov est refusé AVANT toute montée réseau", async ({ page }) => {
		// ⚠️ Le cœur de la régression `.mov` : `video/quicktime` traversait toute la
		// validation cliente et n'était refusé qu'après un téléversement complet,
		// jusqu'à 64 Mo. On vérifie donc à la fois le refus ET l'absence de requête
		// vers UploadThing.
		const uploadRequests: string[] = [];
		page.on("request", (request) => {
			const url = request.url();
			if (url.includes("uploadthing") || url.includes("ufs.sh")) uploadRequests.push(url);
		});

		await expect(
			page.getByRole("button", { name: /Zone d'envoi des médias du bijou/i }),
		).toBeVisible();
		const movPath = writeTempFile("bijou.mov", Buffer.from([0x00, 0x00, 0x00, 0x14]));
		await page.locator('input[type="file"]').first().setInputFiles(movPath);
		await page.waitForTimeout(1500);

		// Le fichier n'entre pas dans la file de confirmation…
		await expect(page.getByRole("group", { name: /en attente de confirmation/i })).toBeHidden();
		// …et rien n'a été envoyé.
		expect(uploadRequests).toEqual([]);
	});

	test("le formulaire refuse la soumission sans média", async ({ page }) => {
		// La carte Médias porte un validateur « Au moins une image est requise ».
		// Le libellé du bouton est dynamique (« Ajoute une photo » tant qu'il manque
		// un média) : on cible le type.
		await page.locator('button[type="submit"]').filter({ visible: true }).first().click();

		await expect(page.getByText(/Au moins une image est requise/i).first()).toBeVisible({
			timeout: TIMEOUTS.VALIDATION,
		});
	});
});

test.describe("Admin — upload de médias, surface mobile", { tag: ["@regression"] }, () => {
	test.use({ viewport: VIEWPORTS.MOBILE });

	test.afterAll(() => {
		fs.rmSync(TMP_DIR, { recursive: true, force: true });
	});

	test("propose les trois sources de fichiers, sans zone de dépôt desktop", async ({ page }) => {
		await page.goto(NEW_PRODUCT_URL);
		await page.waitForLoadState("domcontentloaded");

		// ⚠️ La bascule est désormais purement CSS. Sur téléphone, le premier paint
		// rendait auparavant la zone de dépôt desktop (`useIsMobile()` valant `false`
		// côté serveur) avant de la remplacer — contenu inadapté, puis décalage.
		const trigger = page.getByRole("button", { name: /Ajouter des médias/i });
		await expect(trigger).toBeVisible();
		await expect(
			page.getByRole("button", { name: /Zone d'envoi des médias du bijou/i }),
		).toBeHidden();

		await trigger.click();

		await expect(page.getByText("Capturer un cliché")).toBeVisible({
			timeout: TIMEOUTS.FEEDBACK,
		});
		await expect(page.getByText("Depuis la pellicule")).toBeVisible();
		await expect(page.getByText("Parcourir mes fichiers")).toBeVisible();
	});
});
