import { test, expect } from "../fixtures";

/**
 * Régions live — annonces screen-reader (WCAG 4.1.3 Status Messages).
 *
 * ## Pourquoi ce fichier a été réécrit
 *
 * Les deux tests précédents ne pouvaient PAS échouer :
 *
 * - Ils ciblaient `'[aria-live="polite"], [aria-live="assertive"], [role="status"],
 *   [role="alert"]'` puis asseraient `toBeAttached()`. Or `AppToaster` est monté
 *   dans le layout racine : `#toast-live-polite` (role=status) et
 *   `#toast-live-assertive` (role=alert) sont attachés sur **toutes** les pages,
 *   avant le moindre clic. Le test passait donc avec le système d'annonce
 *   intégralement supprimé — et ne détectait aucun des six défauts trouvés par
 *   l'audit « Système de feedback ».
 * - Les préconditions manquantes faisaient un `return` nu, donc un test **passé**
 *   plutôt que *skipped*.
 *
 * ## Règles pour ce fichier
 *
 * 1. Cibler les régions **par id** (`#toast-live-polite` / `#toast-live-assertive`)
 *    ou par un conteneur scopé — jamais un sélecteur générique satisfait par le
 *    toaster racine.
 * 2. Asserter le **contenu** (`toHaveText` / `toContainText`), jamais la seule
 *    présence : c'est le texte injecté qui prouve l'annonce.
 * 3. Précondition manquante → `test.skip(...)`, jamais `return`.
 *
 * ⚠️ Ne jamais asserter `toBeVisible()` sur ces régions : elles sont `.sr-only`,
 * soit une boîte de 1×1 px que Playwright considère **visible**. C'est ce qui fait
 * passer à faux plusieurs autres specs sur un `[role="alert"]` générique.
 */

const POLITE = "#toast-live-polite";
const ASSERTIVE = "#toast-live-assertive";

test.describe("Accessibilité - Live regions", { tag: ["@regression"] }, () => {
	test("les deux régions d'annonce sont montées et vides au chargement", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		// Montées : c'est la précondition de toute annonce.
		await expect(page.locator(POLITE)).toBeAttached();
		await expect(page.locator(ASSERTIVE)).toBeAttached();

		// Vides : une région qui arrive déjà remplie n'est jamais vocalisée.
		await expect(page.locator(POLITE)).toHaveText("");
		await expect(page.locator(ASSERTIVE)).toHaveText("");

		// Attributs — le contrat que `announce()` suppose.
		await expect(page.locator(POLITE)).toHaveAttribute("role", "status");
		await expect(page.locator(POLITE)).toHaveAttribute("aria-live", "polite");
		await expect(page.locator(ASSERTIVE)).toHaveAttribute("role", "alert");
		await expect(page.locator(ASSERTIVE)).toHaveAttribute("aria-live", "assertive");
	});

	test("l'ajout au panier annonce une confirmation dans la région polite", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const productLink = page.locator("article a[href*='/creations/']").first();
		test.skip((await productLink.count()) === 0, "Aucun produit dans le catalogue");

		const href = await productLink.getAttribute("href");
		test.skip(!href, "Lien produit sans href");

		await page.goto(href!);
		await page.waitForLoadState("domcontentloaded");

		const addBtn = page.getByRole("button", { name: /Ajouter au panier/i }).first();
		test.skip((await addBtn.count()) === 0, "Produit indisponible — pas de bouton d'ajout");

		// La région est vide AVANT le clic : sans cette assertion, celle d'après
		// pourrait passer sur un résidu d'annonce.
		await expect(page.locator(POLITE)).toHaveText("");

		await addBtn.click();

		/*
		 * L'ajout au panier n'émet volontairement PAS de toast : l'ouverture du cart
		 * sheet est le feedback visible (`use-add-to-cart.ts`, `showSuccessToast: false`).
		 * L'annonce passe donc par `announce()` — seul canal qui atteint un lecteur
		 * d'écran, les régions locales du sheet et du badge étant montées avec leur
		 * contenu.
		 */
		await expect(page.locator(POLITE)).toContainText(/panier/i, { timeout: 5000 });
	});

	test("le compteur de résultats du catalogue est dans une région live", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		// Région déclarative locale (montée en permanence), scopée au main pour ne
		// pas capter les régions du toaster racine.
		const counter = page
			.locator("main [aria-live='polite'][aria-atomic='true']")
			.filter({ hasText: /produits?/ })
			.first();

		test.skip((await counter.count()) === 0, "Catalogue vide — pas de compteur rendu");
		await expect(counter).toContainText(/\d+\s+produits?/);
	});

	test("une erreur de validation est annoncée par le champ, pas par le toaster", async ({
		page,
	}) => {
		// `/connexion` a disparu (monde lean) — le formulaire de connexion admin
		// (`/admin/connexion`, un seul champ mot de passe) porte le même
		// `FieldError` à éprouver.
		await page.goto("/admin/connexion");
		await page.waitForLoadState("domcontentloaded");

		const passwordInput = page.getByLabel(/^Mot de passe/i).first();
		test.skip((await passwordInput.count()) === 0, "Champ mot de passe absent du formulaire");

		// Le validateur onChange rend « Le mot de passe est requis » quand le champ
		// redevient vide après une saisie.
		await passwordInput.fill("x");
		await passwordInput.fill("");
		await passwordInput.blur();

		/*
		 * `FieldError` monte son `role="alert" aria-live="polite"` en PERMANENCE (le
		 * collapse se fait sur la grille parente), donc l'injection du texte est
		 * réellement annoncée. On vérifie le message, pas la présence d'un nœud.
		 */
		const fieldError = page
			.locator("[aria-live='polite'], [role='alert']")
			.filter({ hasText: /Le mot de passe est requis/i })
			.first();
		await expect(fieldError).toBeAttached({ timeout: 3000 });

		// Le toaster reste muet : les VALIDATION_ERROR sont inline par contrat
		// (`create-toast-callbacks.ts` supprime le toast dans ce cas).
		await expect(page.locator(ASSERTIVE)).toHaveText("");
	});
});
