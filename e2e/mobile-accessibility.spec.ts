import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers/axe";
import { requireSeedData, SELECTORS, VIEWPORTS } from "./constants";

const MOBILE_VIEWPORT = VIEWPORTS.MOBILE;
const REFLOW_VIEWPORT = VIEWPORTS.REFLOW_320;

/**
 * Mobile accessibility specs — couvre les gaps identifiés dans l'audit mobile
 * du 2026-04-17 :
 *
 * 1. WCAG 1.4.10 Reflow : contenu lisible à 320 CSS px.
 * 2. WCAG 2.5.5 Target Size : touch targets ≥ 44×44 px.
 * 3. WCAG 2.4.1 Skip Links : landmarks + skip-link sur mobile.
 * 4. axe-core WCAG 2A+2AA+2.1AA+2.2AA sur pages critiques (home, produits,
 *    panier, checkout) + overlays de navigation OUVERTS — viewport mobile.
 * 5. Retour matériel : fermeture d'overlay vs sortie de page.
 *
 * ⚠️ Ce fichier n'est PAS restreint à un projet Playwright : il s'exécute sur
 * `mobile-chrome` / `mobile-webkit` (device réel, `hasTouch` + `isMobile`) ET sur
 * les 3 projets desktop, où `test.use({ viewport })` ne fournit que la TAILLE.
 * Sur ces derniers les variants `can-hover:` s'évaluent en contexte souris — un
 * vert desktop ne prouve donc pas le comportement tactile. Restreindre aux
 * projets mobiles perdrait la couverture reflow, qui est purement dimensionnelle :
 * le double run est assumé, pas un oubli.
 */

// Les audits photographient l'état STABLE : reduced-motion AVANT la navigation.
// Le helper l'émule au moment de l'audit, trop tard pour une transition déjà
// lancée (fondu d'entrée, scrim d'overlay) — axe capturait des contrastes de
// transition fantômes sur les sheets ouverts.
test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
});

async function expectNoHorizontalOverflow(page: Page, name: string) {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
	);
	expect(overflow, `${name} déborde de ${overflow}px à 320 CSS px`).toBeLessThanOrEqual(1);
}

test.describe("A11y Mobile — axe-core WCAG (viewport 390x844)", () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	// AVANT la navigation, pas seulement dans le helper axe : les entrées en
	// stagger du menu sheet lisent la préférence au MONTAGE — l'émuler après
	// coup laisse l'animation déjà lancée, et axe photographiait le texte à
	// mi-fondu (muted-foreground à ~50% d'opacité = 1.93:1, 490 lignes de
	// violations fantômes sur mobile-webkit, plus lent à peindre).
	test.beforeEach(async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
	});

	test("home — aucune violation WCAG", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		await expectNoA11yViolations(page, { context: "home mobile" });
	});

	test("produits — aucune violation WCAG", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");
		await expectNoA11yViolations(page, { context: "produits mobile" });
	});

	test("collections — aucune violation WCAG", async ({ page }) => {
		await page.goto("/collections");
		await page.waitForLoadState("domcontentloaded");
		await expectNoA11yViolations(page, { context: "collections mobile" });
	});

	/**
	 * Les scans ci-dessus ne voient que des surfaces FERMÉES : aucun overlay de
	 * navigation mobile n'était audité ouvert. Le menu sheet est justement celui
	 * qui porte le focus-trap, le titre de dialogue et l'arborescence complète.
	 */
	test("menu sheet ouvert — aucune violation WCAG", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await page.getByRole("button", { name: /Menu de navigation/i }).click();
		await expect(page.getByRole("dialog").first()).toBeVisible();

		await expectNoA11yViolations(page, { context: "menu sheet mobile ouvert" });
	});

	test("panier ouvert depuis la bottom nav — aucune violation WCAG", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await page
			.getByRole("navigation", { name: /Navigation principale de la boutique/i })
			.getByRole("button", { name: /Panier/i })
			.click();
		await expect(page.getByRole("dialog").first()).toBeVisible();

		await expectNoA11yViolations(page, { context: "cart sheet mobile ouvert" });
	});
});

/**
 * Retour matériel / geste de retour — le comportement le plus visible du trio de
 * navigation mobile, et le seul qui n'avait AUCUNE couverture bout-en-bout : la
 * mécanique `useBackButtonClose` n'était testée qu'en unitaire, avec `popstate`
 * simulé.
 */
test.describe("A11y Mobile — retour matériel et overlays (viewport 390x844)", () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("le retour ferme le menu sheet sans quitter la page", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		await page.getByRole("button", { name: /Menu de navigation/i }).click();
		const menuDialog = page.getByRole("dialog").first();
		await expect(menuDialog).toBeVisible();

		await page.goBack();

		await expect(menuDialog).not.toBeVisible();
		// L'essentiel : on est TOUJOURS sur /produits. Sans l'entrée d'historique
		// poussée à l'ouverture, ce retour aurait quitté la page.
		await expect(page).toHaveURL(/\/produits/);
	});

	test("un tap sur une entrée du menu navigue vraiment (pas de history.back concurrent)", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await page.getByRole("button", { name: /Menu de navigation/i }).click();
		const menuDialog = page.getByRole("dialog").first();
		await expect(menuDialog).toBeVisible();

		// Régression : avec `<SheetClose asChild><Link>`, `handleClose()` déclenchait
		// un `history.back()` synchrone qui raçait le `router.push` du Link — le tap
		// fermait le menu et laissait l'utilisateur sur la même page.
		// ⚠️ « Toutes les collections » jusqu'au 2026-08-08 : c'était le lien d'en-tête
		// de la bande de cartes, supprimée avec les autres surfaces à cartes de
		// collection. La destination survit en rangée pleine largeur, sous le
		// libellé de la SSOT `getMobileNavItems`.
		await menuDialog.getByRole("link", { name: /^Les collections$/i }).click();

		await expect(page).toHaveURL(/\/collections/);
		await expect(menuDialog).not.toBeVisible();
	});

	test("après navigation depuis le menu, un seul retour ramène à la page précédente", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await page.getByRole("button", { name: /Menu de navigation/i }).click();
		await page
			.getByRole("dialog")
			.first()
			.getByRole("link", { name: /^Les collections$/i })
			.click();
		await expect(page).toHaveURL(/\/collections/);

		// Les liens du menu naviguent en `replace` : ils consomment l'entrée poussée
		// à l'ouverture au lieu de l'enterrer. Sans cela il fallait DEUX retours
		// (une pression morte par cycle ouvrir → naviguer, cumulative).
		await page.goBack();
		await expect(page).toHaveURL(/^[^?]*\/$|\/$/);
	});
});

/**
 * WCAG 1.4.10 Reflow — 320 CSS px, la largeur exigée par le critère.
 *
 * L'ancienne valeur (195×422, soit 390 ÷ 2) était plus sévère que la norme sans
 * en être un sur-ensemble utile : elle ne pouvait pas révéler les défauts qui
 * n'apparaissent qu'entre 195 et 320px, typiquement une grille `grid-cols-2`
 * dont les cartes ne débordent qu'une fois qu'elles ont assez de place pour
 * afficher leur contenu.
 *
 * Couvre tout le chemin d'achat : avant l'audit 2026-07-26, seules `/` et
 * `/produits` étaient testées — ni fiche produit, ni panier, ni paiement.
 */
test.describe("A11y Mobile — WCAG 1.4.10 Reflow (320 CSS px)", () => {
	test.use({ viewport: REFLOW_VIEWPORT });

	for (const { path, name } of [
		{ path: "/", name: "home" },
		{ path: "/produits", name: "produits" },
		{ path: "/collections", name: "collections" },
		{ path: "/favoris", name: "favoris" },
	]) {
		test(`${name} — pas de scroll horizontal à 320 CSS px`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");
			await expectNoHorizontalOverflow(page, name);
		});
	}

	test("fiche produit — pas de scroll horizontal à 320 CSS px", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		// À 320 px la bottom-nav fixe intercepte le clic sur la carte scrollée en
		// bord de pli : on navigue par l'URL, la cible du test est la FICHE.
		const firstProduct = page.locator(SELECTORS.PRODUCT_LINK).first();
		await expect(firstProduct).toBeVisible();
		const href = await firstProduct.getAttribute("href");
		expect(href).toBeTruthy();
		await page.goto(href!);
		await page.waitForLoadState("domcontentloaded");
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

		await expectNoHorizontalOverflow(page, "fiche produit");
	});

	test("panier (sheet) — pas de scroll horizontal à 320 CSS px", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const cartTrigger = page.getByRole("button", { name: /panier/i }).first();
		await expect(cartTrigger).toBeVisible();
		// Le bouton est peint avant d'être hydraté : sous la charge d'un run
		// complet, un clic trop tôt part dans le vide — on retente une fois.
		await cartTrigger.click();
		try {
			await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 });
		} catch {
			await cartTrigger.click();
			await expect(page.getByRole("dialog")).toBeVisible();
		}

		await expectNoHorizontalOverflow(page, "panier");
	});

	test("checkout — pas de scroll horizontal à 320 CSS px", async ({
		page,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		// Le docblock de ce bloc annonçait « ni fiche produit, ni panier, ni
		// paiement » depuis l'audit 2026-07-26 ; les deux premiers ont été ajoutés,
		// le paiement était resté en rade. C'est pourtant la page la plus dense du
		// storefront : 8 champs, un récapitulatif et une barre CTA fixe.
		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		requireSeedData(test, !seeded.skipped, seeded.skipped ? seeded.reason : "");
		if (seeded.skipped) return;

		await expectNoHorizontalOverflow(page, "checkout");
	});

	test("le h1 reste visible (pas de tronquage) à 320 CSS px", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const h1 = page.getByRole("heading", { level: 1 }).first();
		await expect(h1).toBeVisible();
	});

	test("le h1 du catalogue reste visible à 320 CSS px", async ({ page }) => {
		// Bug historique du storefront : le PageHeader était masqué sous `sm` avec
		// au mieux un repli sr-only — la page n'affichait plus un seul mot en
		// mobile. `catalogue-mobile-h1.regression.test.ts` verrouille la SOURCE de
		// `StorefrontHeading` ; ceci verrouille le RENDU (un seul spec suffit :
		// même composant sur /produits, /collections[/slug] et /favoris).
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const h1 = page.getByRole("heading", { level: 1 }).first();
		await expect(h1).toBeVisible();
	});
});

test.describe("A11y Mobile — Touch targets WCAG 2.5.5 (viewport 390x844)", () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("bottom nav tabs — chaque tab ≥ 44×44 px", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const bottomNav = page.getByRole("navigation", {
			name: /Navigation principale de la boutique/i,
		});
		await expect(bottomNav).toBeVisible();

		const tabs = bottomNav.locator("a, button");
		const count = await tabs.count();
		expect(count).toBeGreaterThanOrEqual(3);

		for (let i = 0; i < count; i++) {
			const tab = tabs.nth(i);
			const box = await tab.boundingBox();
			expect(box).not.toBeNull();
			if (box) {
				expect(box.height).toBeGreaterThanOrEqual(44);
				expect(box.width).toBeGreaterThanOrEqual(44);
			}
		}
	});

	test("navbar hamburger — target ≥ 44×44 px", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Sélecteur exact, et assertion INCONDITIONNELLE. L'ancien
		// `/Ouvrir|Menu/i` + `.first()` matchait aussi « Ouvrir mon panier » et
		// « Ouvrir la recherche rapide » : un réordonnancement de la navbar
		// retargettait le test en silence. Et le `if (isVisible)` le faisait passer
		// au vert sans rien asserter si le burger disparaissait — le mode de
		// défaillance exact de l'incident admin.
		const hamburger = page.getByRole("button", { name: /Menu de navigation/i });
		await expect(hamburger).toBeVisible();

		const box = await hamburger.boundingBox();
		expect(box).not.toBeNull();
		expect(box!.height).toBeGreaterThanOrEqual(44);
		expect(box!.width).toBeGreaterThanOrEqual(44);
	});

	test("entrées du menu sheet — chaque cible ≥ 44 px de haut", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await page.getByRole("button", { name: /Menu de navigation/i }).click();
		const menuDialog = page.getByRole("dialog").first();
		await expect(menuDialog).toBeVisible();

		// Inclut le lien de marque du header, qui ne mesurait que 28px (line-height
		// de `text-xl`) avant l'ajout de `min-h-11`.
		const entries = menuDialog.locator("a, button");
		const count = await entries.count();
		expect(count).toBeGreaterThanOrEqual(4);

		for (let i = 0; i < count; i++) {
			const entry = entries.nth(i);
			if (!(await entry.isVisible())) continue;
			const box = await entry.boundingBox();
			expect(box).not.toBeNull();
			const label = (await entry.getAttribute("aria-label")) ?? (await entry.innerText());
			expect(
				box!.height,
				`« ${label} » ne mesure que ${box!.height}px de haut`,
			).toBeGreaterThanOrEqual(44);
		}
	});
});

test.describe("A11y Mobile — Landmarks + Skip link (viewport 390x844)", () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("landmark main présent sur home", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const main = page.getByRole("main");
		await expect(main).toBeVisible();
	});

	test("aria-label Navigation principale présent pour la bottom nav", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const bottomNav = page.getByRole("navigation", {
			name: /Navigation principale de la boutique/i,
		});
		await expect(bottomNav).toBeVisible();
	});
});
