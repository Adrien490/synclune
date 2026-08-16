import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { VIEWPORTS } from "./constants";

/**
 * Zone de bascule mobile ↔ desktop — la plus souvent cassée, et jusqu'à l'audit
 * « Confort desktop et robustesse du responsive » (2026-07-26) couverte par
 * aucun projet Playwright : le saut allait de 412px à 1280px.
 *
 * Deux invariants :
 *
 * 1. **Exactement une** surface de navigation, à toute largeur et à toute taille
 *    de police racine. Le bug P1-1 produisait *zéro* surface : les seuils JS
 *    étaient en px, ceux de Tailwind en rem, et à police racine 14px la plage
 *    672-767px voyait le JS dire « mobile » (sidebar → `null`) pendant que le
 *    CSS disait déjà « desktop » (header mobile et bottom bar cachés).
 * 2. Aucun chevauchement des éléments flottants avec la bottom-nav sur la plage
 *    48-64rem, où la bottom-nav boutique reste montée.
 */

/** Applique une taille de police racine — le seul levier qui déplace les rem. */
async function setRootFontSize(page: Page, value: string) {
	await page.evaluate((v: string) => {
		document.documentElement.style.fontSize = v;
	}, value);
	await page.waitForTimeout(250);
}

async function countVisible(page: Page, selector: string): Promise<number> {
	return page.locator(selector).filter({ visible: true }).count();
}

test.describe("Responsive — surfaces de navigation boutique", () => {
	// La bottom-nav boutique bascule à `lg` (64rem), alignée sur la nav desktop.
	// Sous ce seuil elle doit être là ; au-dessus, c'est le mega-menu.
	test("expose une bottom-nav sous lg et une nav desktop au-dessus", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const bottomNav = page.getByRole("navigation", {
			name: /Navigation principale de la boutique/i,
		});

		await page.setViewportSize(VIEWPORTS.TABLET_PORTRAIT); // 768×1024 → sous lg
		await expect(
			bottomNav,
			"iPad portrait : la bottom-nav doit rester (le mega-menu n'arrive qu'à 64rem)",
		).toBeVisible();

		await page.setViewportSize(VIEWPORTS.DESKTOP); // 1280×800 → au-dessus de lg
		await expect(bottomNav, "desktop : la nav desktop prend le relais").toBeHidden();
	});

	// Régression du chevauchement introduit si un consommateur de
	// `--bottom-bar-height` fige son offset avec un préfixe de breakpoint.
	test("aucun élément flottant ne recouvre la bottom-nav en iPad portrait", async ({ page }) => {
		await page.setViewportSize(VIEWPORTS.TABLET_PORTRAIT);
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const bottomNav = page.getByRole("navigation", {
			name: /Navigation principale de la boutique/i,
		});
		await expect(bottomNav).toBeVisible();
		const navBox = await bottomNav.boundingBox();
		expect(navBox).not.toBeNull();
		if (!navBox) return;

		// Chaque onglet doit répondre au hit-test en son centre : si un bandeau
		// cookies ou un bouton « haut de page » se pose dessus, le tap part ailleurs.
		const tabs = bottomNav.locator("a, button");
		const count = await tabs.count();
		expect(count).toBeGreaterThanOrEqual(3);

		for (let i = 0; i < count; i++) {
			// Retenté : juste après `domcontentloaded`, la barre peut encore se
			// positionner (hit-test hors viewport → « aucun élément au point »).
			await expect(async () => {
				const box = await tabs.nth(i).boundingBox();
				expect(box, `onglet ${i} sans boundingBox`).not.toBeNull();
				const covered = await page.evaluate(
					({ x, y }) => {
						const el = document.elementFromPoint(x, y);
						if (!el) return "aucun élément au point";
						const nav = el.closest('nav[aria-label*="boutique" i]');
						return nav ? null : `${el.tagName}.${el.className}`.slice(0, 120);
					},
					{ x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
				);
				expect(covered, `onglet ${i} de la bottom-nav recouvert`).toBeNull();
			}).toPass({ timeout: 10_000 });
		}
	});
});

test.describe("Responsive — cohérence des seuils rem/px", () => {
	/**
	 * Le cœur du P1-1 : à police racine réduite, `md:`/`lg:` se déplacent vers
	 * la gauche. Tout seuil JS resté en px cesse d'être d'accord avec eux et une
	 * plage entière se retrouve sans navigation.
	 */
	for (const { label, fontSize } of [
		{ label: "police racine par défaut", fontSize: "100%" },
		{ label: "police racine réduite (14px)", fontSize: "87.5%" },
		{ label: "police racine agrandie (20px)", fontSize: "125%" },
	]) {
		test(`boutique : exactement une nav principale — ${label}`, async ({ page }) => {
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");
			await setRootFontSize(page, fontSize);

			// Burger (mobile/tablette) XOR liens desktop — jamais les deux, jamais
			// aucun.
			//
			// ⚠️ Deux erreurs successives corrigées ici (audit e2e 2026-08-16) :
			//  1. l'assertion d'origine (`burger + desktopNav > 0`) laissait passer
			//     « les deux à la fois », soit la moitié du bug qu'elle prétendait
			//     verrouiller ;
			//  2. le second correctif opposait le burger à
			//     `nav[aria-label="Navigation principale"]` — or ce <nav> est le
			//     CONTENEUR qui héberge les DEUX variantes (le burger est dedans).
			//     Il est donc toujours présent, et l'XOR échouait partout.
			// La vraie alternative se joue à l'intérieur : le burger (`lg:hidden`)
			// contre la barre de liens desktop (`hidden lg:flex`), dont le
			// déclencheur de méga-menu « Les créations » est le témoin stable.
			const mainNav = 'nav[aria-label="Navigation principale"]';
			const burger = await countVisible(page, `${mainNav} button[aria-label*="menu" i]`);
			const desktopNav = await countVisible(
				page,
				`${mainNav} button[aria-label*="créations" i], ${mainNav} a[href="/produits"]`,
			);

			const hasBurger = burger > 0;
			const hasDesktopNav = desktopNav > 0;
			expect(
				hasBurger !== hasDesktopNav,
				`${label} : ${burger} burger(s) + ${desktopNav} nav(s) desktop — il en faut exactement une des deux`,
			).toBe(true);
		});
	}
});

/**
 * La bande 768-1024 px du PANIER — jamais couverte avant le 2026-08-05.
 *
 * Le shell du panier bascule sur `useIsMobile()`, dont le seuil est `md` (48 rem), alors
 * que la bottom-nav boutique est gatée à `lg` (64 rem) et que `CartSheetTrigger` est en
 * `hidden lg:inline-flex`. Entre les deux seuils, il en résulte une combinaison qu'aucun
 * projet Playwright n'exerçait : le seul ouvreur est l'onglet de la bottom-nav, et il
 * ouvre le `Sheet` LATÉRAL desktop.
 *
 * `cart.spec.ts` ne comble pas ce trou : il tourne à 390/412 px et à 1280 px, et les deux
 * projets `tablet-*` sont en `testMatch: /responsive-breakpoints/` — donc ce fichier est
 * le seul endroit d'où ces assertions peuvent s'exécuter à 768 px.
 */
test.describe("Responsive — panier dans la bande 48-64rem", () => {
	test("s'ouvre depuis la bottom-nav et se ferme, en iPad portrait", async ({ page, cartPage }) => {
		await page.setViewportSize(VIEWPORTS.TABLET_PORTRAIT);
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// À cette largeur, `CartSheetTrigger` est en `display:none` : c'est bien l'onglet de
		// la bottom-nav que `CartPage.openButton` doit résoudre (motif `^Panier`).
		const bottomNav = page.getByRole("navigation", {
			name: /Navigation principale de la boutique/i,
		});
		await expect(bottomNav).toBeVisible();

		await cartPage.open();
		await expect(cartPage.title).toBeVisible();

		// Le panneau doit laisser une bande de scrim tapable. À cette largeur c'est le
		// `Sheet` ancré à droite, donc la bande vit à GAUCHE — d'où un test sur `x`, là où
		// la branche mobile laisse la sienne en haut (`y`).
		const panel = await cartPage.dialog.first().boundingBox();
		expect(panel).not.toBeNull();
		if (panel) {
			expect(
				panel.x,
				"le Sheet latéral doit laisser du scrim à sa gauche, sinon plus rien n'est tapable",
			).toBeGreaterThan(0);
		}

		await cartPage.close();
	});
});

test.describe("Responsive — navigation admin", () => {
	// L'admin bascule à `md`. Sans authentification on ne peut pas atteindre
	// `/admin`, mais la redirection elle-même doit rester navigable : le vrai
	// verrou du P1-1 est le garde-fou statique
	// `shared/constants/__tests__/no-px-media-query.regression.test.ts`, qui
	// interdit tout seuil px et donc toute possibilité de désaccord.
	test("la redirection admin reste navigable en tablette", async ({ page }) => {
		await page.setViewportSize(VIEWPORTS.TABLET_PORTRAIT);
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		// Depuis l'auth maison (lot 1), /admin/connexion rend un <main> minimal
		// sans nav ni header : « navigable » = le formulaire de connexion répond.
		await expect(page).toHaveURL(/\/admin\/connexion/);
		await expect(page.getByRole("textbox", { name: /Mot de passe/i })).toBeVisible();
	});
});
