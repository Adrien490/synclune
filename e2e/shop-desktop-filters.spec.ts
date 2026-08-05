import { test, expect } from "./fixtures";
import { TIMEOUTS, VIEWPORTS } from "./constants";

/**
 * Rail de filtres desktop — « Le plan de travail » (artifact filtres
 * 2026-08-04, direction C).
 *
 * Aucun E2E ne couvrait les filtres au viewport desktop : les trois specs
 * existantes (`shop-mobile`, `accessibility`, `a11y/keyboard-navigation`)
 * tournent toutes à 390 px, et deux d'entre elles SKIPPENT en silence quand le
 * bouton « Filtrer » est absent. Ce fichier vérifie donc ce que le rail change
 * en propre : les filtres sont visibles sans overlay, chaque coche s'applique
 * seule, et le compte annonce ce qu'il compte.
 */
test.describe("Filtres desktop — le rail (viewport 1280x800)", { tag: ["@regression"] }, () => {
	test.use({ viewport: VIEWPORTS.DESKTOP });

	test("le rail remplace le bouton Filtrer : aucun overlay pour filtrer", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		await expect(page.locator("article.product-card").first()).toBeVisible({
			timeout: TIMEOUTS.FEEDBACK,
		});

		// Le rail est un `<h2>` « Filtres » suivi des compartiments, rendu dans le
		// flux — pas dans un dialog.
		const railHeading = page.getByRole("heading", { name: "Filtres", level: 2 });
		await expect(railHeading).toBeVisible();
		await expect(page.getByRole("dialog")).toHaveCount(0);

		// Le bouton de la barre s'efface à `lg` : deux entrées pour un seul geste.
		await expect(page.getByRole("button", { name: /^Filtrer/ })).toBeHidden();
	});

	test("cocher une couleur applique le filtre sans bouton, et le compte le dit", async ({
		page,
	}) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");
		await expect(page.locator("article.product-card").first()).toBeVisible({
			timeout: TIMEOUTS.FEEDBACK,
		});

		// Première case du compartiment « Couleurs » (les entrées sont triées par
		// nombre de pièces, donc jamais vides sur un catalogue peuplé).
		// Id préfixé par l'hôte depuis `filter-dual-mount-id-scope` (2026-08-05) :
		// à 1280 c'est le RAIL qui rend les compartiments.
		const colorsSection = page.locator('section[aria-labelledby="filter-compartment-rail-colors"]');
		await expect(colorsSection).toBeVisible();
		const firstColor = colorsSection.getByRole("checkbox").first();
		const colorLabel = (await firstColor.evaluate(
			(el) => el.closest("label")?.textContent.trim() ?? "",
		)) as string;

		await firstColor.click();

		// Aucun clic sur « Appliquer » : l'URL porte déjà le filtre.
		await expect(page).toHaveURL(/[?&]color=/, { timeout: TIMEOUTS.FEEDBACK });

		// La ligne de compte devient « N pièces · <résumé> » — le seul rappel de ce
		// qui est coché, puisqu'on n'a pas quitté la page.
		await expect(page.getByText(/pièces? ·/).first()).toBeVisible({
			timeout: TIMEOUTS.FEEDBACK,
		});
		// Le nom de la couleur cochée apparaît dans ce résumé.
		const colorName = colorLabel.replace(/\(\d+\)\s*$/, "").trim();
		if (colorName) {
			await expect(
				page.getByText(new RegExp(`pièces? ·.*${colorName}`, "i")).first(),
			).toBeVisible();
		}
	});

	test("cocher exactement un type change de PAGE (path dédié)", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");
		await expect(page.locator("article.product-card").first()).toBeVisible({
			timeout: TIMEOUTS.FEEDBACK,
		});

		const typesSection = page.locator('section[aria-labelledby="filter-compartment-rail-types"]');
		await expect(typesSection).toBeVisible();
		await typesSection.getByRole("checkbox").first().click();

		// `buildFilterURL` route un type unique vers sa page dédiée : c'est une vraie
		// navigation, que le retour arrière doit défaire.
		await expect(page).toHaveURL(/\/produits\/[a-z0-9-]+$/, { timeout: TIMEOUTS.DATA_LOAD });

		await page.goBack();
		await expect(page).toHaveURL(/\/produits\/?$/, { timeout: TIMEOUTS.DATA_LOAD });
	});

	test("« Tout effacer » demande confirmation au-delà de 3 filtres", async ({ page }) => {
		// Trois filtres actifs posés par l'URL — le seuil de confirmation du rail.
		await page.goto("/produits?color=or-jaune&material=acier&stockStatus=in_stock");
		await page.waitForLoadState("domcontentloaded");

		// Nom EXACT : depuis le lot 0 filter-badges (2026-08-05), le bandeau de
		// badges expose lui aussi un bouton nommé « Tout effacer » (2.5.3) — un
		// regex /Tout effacer/ matcherait les deux et violerait le strict mode.
		const clearButton = page.getByRole("button", { name: "Tout effacer les filtres", exact: true });
		await expect(clearButton).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await clearButton.click();

		// AlertDialog à tous les viewports (refus « Drawer pour une confirmation »).
		const confirmation = page.getByRole("alertdialog");
		await expect(confirmation).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await expect(confirmation.getByText("Effacer tous les filtres ?")).toBeVisible();

		// Échap ne ferme QUE la confirmation, le rail reste utilisable.
		await page.keyboard.press("Escape");
		await expect(confirmation).toBeHidden();
		await expect(page.getByRole("heading", { name: "Filtres", level: 2 })).toBeVisible();
	});
});
