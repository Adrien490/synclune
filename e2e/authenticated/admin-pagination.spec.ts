import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { getE2ePrisma } from "../helpers/db";
import { TEST_RUN_ID } from "../helpers/test-run";
import { waitForHydratedButton } from "../helpers/hydration";

/**
 * Pagination curseur de l'admin.
 *
 * ⚠️ Huit de ces tests se SKIPPAIENT quand le catalogue tenait sur une page
 * (« No next page button — not enough data »), et rien ne garantissait le
 * contraire : le seed rend 14 produits pour une page de 20
 * (`GET_PRODUCTS_DEFAULT_PER_PAGE`). Toute la suite pouvait donc être verte en
 * n'ayant rien exercé (audit e2e 2026-08-16). On sème désormais de quoi FORCER
 * une deuxième page, et les skips deviennent des échecs si la barre manque.
 */
const PER_PAGE = 20;
const PRODUCTS_TO_SEED = 12;
const SEED_PREFIX = `Pagination ${TEST_RUN_ID}`;

/**
 * Le compteur VISIBLE, pas l'annonce lecteur d'écran.
 *
 * ⚠️ `AdminDataTable` rend aussi une live region `sr-only` (« Page chargée,
 * 20 sur 26 résultats. ») qui matche le même motif et arrive PREMIÈRE dans le
 * DOM : un `getByText(...).first()` tombait dessus et échouait en « hidden ».
 * Même piège que celui documenté dans `helpers/assertions.ts`. Filtrer sur la
 * visibilité est la seule forme correcte — un `locator(":not(.sr-only)")`
 * englobant ne sert à rien, il matche aussi les ANCÊTRES du nœud sr-only.
 */
function visibleResultCount(page: Page) {
	return page
		.getByText(/\d+( sur \d+)? résultats?/)
		.filter({ visible: true })
		.first();
}

/**
 * Le sélecteur « par page » VISIBLE : la barre est rendue en deux variantes
 * (compacte et large), donc le libellé résout à plusieurs nœuds dont un seul
 * est peint au viewport courant.
 */
function visiblePerPageSelect(page: Page) {
	return page
		.getByLabel(/Nombre de résultats par page/i)
		.filter({ visible: true })
		.first();
}

/**
 * Va à la page suivante et ATTEND que l'URL porte le curseur.
 *
 * ⚠️ Les boutons de `CursorPagination` poussent l'état via le router : un clic
 * ANTÉRIEUR à l'hydratation est avalé sans erreur, l'URL ne bouge pas. Ces
 * tests ne l'avaient jamais rencontré parce qu'ils se skippaient tous faute de
 * page 2 (audit 2026-08-16) — le semis les a réveillés, et ce piège avec.
 */
async function goToNextPage(page: Page) {
	const nextButton = page.getByRole("button", { name: /Page suivante/i });
	await expect(nextButton).toBeVisible({ timeout: 15_000 });
	await waitForHydratedButton(page, /Page suivante/i);
	await expect(async () => {
		if (!page.url().includes("cursor=")) {
			await nextButton.click({ timeout: 2000 }).catch(() => {});
		}
		expect(page.url()).toContain("cursor=");
	}).toPass({ timeout: 20_000 });
}

test.describe("Admin - Pagination cursor", { tag: ["@regression"] }, () => {
	/**
	 * ⚠️ `beforeAll` s'exécute une fois PAR WORKER (3 en local, 4 en CI) : trois
	 * workers créaient les mêmes slugs et deux échouaient en P2002, tuant leurs
	 * tests (« 5 did not run »). D'où l'`upsert` — idempotent, donc chaque worker
	 * converge sur le même jeu au lieu d'entrer en collision.
	 *
	 * Et PAS d'`afterAll` : il s'exécuterait lui aussi par worker et supprimerait
	 * les produits des workers encore en cours. Le nettoyage revient au teardown
	 * global, qui ramasse tout produit dont le slug contient « e2e- ».
	 */
	test.beforeAll(async () => {
		const prisma = getE2ePrisma();
		const existing = await prisma.product.count();
		const missing = Math.max(0, PER_PAGE + 1 - existing);
		const toCreate = Math.max(PRODUCTS_TO_SEED, missing);

		for (let i = 0; i < toCreate; i++) {
			// Numérotation zéro-paddée : l'ordre alphabétique est stable, donc la
			// tranche de la page 2 l'est aussi d'un run à l'autre.
			const index = String(i).padStart(2, "0");
			const slug = `pagination-${TEST_RUN_ID}-${index}`;
			try {
				await prisma.product.create({
					data: {
						slug,
						name: `${SEED_PREFIX} ${index}`,
						description: "Produit semé par les E2E pour garantir une deuxième page.",
						priceCents: 1500 + i,
						active: false,
						variants: { create: { stock: 1 } },
					},
				});
			} catch (e) {
				// ⚠️ P2002 TOLÉRÉ : `upsert` ne suffit pas — il n'est pas atomique,
				// deux workers constatent tous deux l'absence puis insèrent. La
				// collision signifie « un autre worker a déjà semé cette ligne »,
				// exactement le résultat voulu. Même stratégie que le retry P2002 du
				// compteur de factures.
				if (!(e instanceof Error && (e as { code?: string }).code === "P2002")) throw e;
			}
		}
	});

	test("la barre de pagination existe — le semis garantit une deuxième page", async ({
		page,
		adminPage,
	}) => {
		await adminPage.gotoProducts();
		await expect(page.getByRole("navigation", { name: /Pagination/i })).toBeVisible({
			timeout: 15_000,
		});
		await expect(page.getByRole("button", { name: /Page suivante/i })).toBeVisible();
	});

	test("la barre de pagination rend AUSSI le sélecteur « par page »", async ({
		page,
		adminPage,
	}) => {
		await adminPage.gotoProducts();

		// `CursorPagination` rend la barre ENTIÈRE ou rien : quand elle est là, le
		// sélecteur « par page » l'est aussi. (Le cas « une seule page » n'est plus
		// atteignable ici — le semis force la page 2 — et le compteur de résultats,
		// lui, vit hors de la barre, dans `AdminDataTable`.)
		await expect(page.getByRole("navigation", { name: /Pagination/i })).toBeVisible({
			timeout: 15_000,
		});
		await expect(visiblePerPageSelect(page)).toBeVisible();
		await expect(visibleResultCount(page)).toBeVisible();
	});

	test("le compteur de résultats est toujours affiché", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		// Rendu par `AdminDataTable`, donc indépendant du nombre de pages.
		await expect(visibleResultCount(page)).toBeVisible();
	});

	test("changer le tri depuis la page 2 repart du debut (curseur purge)", async ({
		page,
		adminPage,
	}) => {
		await adminPage.gotoProducts();

		await goToNextPage(page);

		// Changer le tri depuis une page profonde doit purger cursor + direction :
		// sinon Prisma se repositionne sur un id de l'ANCIEN tri et rend une
		// tranche arbitraire, sans erreur ni signal visible.
		const sortTrigger = page.getByLabel(/Trier par/i).first();
		await sortTrigger.click();
		const option = page.getByRole("option").nth(1);
		await option.click();

		// Le router pousse de façon ASYNCHRONE : lire `page.url()` juste après le
		// clic observe encore l'URL de la page 2. On attend la purge.
		await expect.poll(() => page.url(), { timeout: 15_000 }).not.toContain("cursor=");
		expect(page.url()).not.toContain("direction=");
	});

	test("le retour navigateur conserve la position de scroll", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		// Il faut de quoi scroller pour que le test ait un sens — on mesure la marge
		// de scroll RÉELLE (scrollHeight - innerHeight), pas juste la hauteur : avec
		// une marge < 300px, `scrollTo(300)` plafonne et l'attente ne se résout jamais.
		// ⚠️ La hauteur peut encore CHANGER après le stream (skeletons plus hauts que le
		// contenu final) : l'attente est bornée et re-vérifiée, jamais bloquante.
		await page.waitForLoadState("networkidle").catch(() => {});
		const maxScroll = await page.evaluate(
			() => document.documentElement.scrollHeight - window.innerHeight,
		);
		test.skip(maxScroll < 350, "Page too short to scroll - not enough data");

		await page.evaluate(() => window.scrollTo({ top: 300, behavior: "instant" }));
		const reached = await page
			.waitForFunction(() => window.scrollY > 250, undefined, { timeout: 5000 })
			.catch(() => null);
		test.skip(!reached, "La page a raccourci après le stream — plus de quoi scroller");

		const firstRowLink = page.getByRole("link", { name: /^Voir / }).first();
		await firstRowLink.click();
		await page.waitForLoadState("domcontentloaded");

		await page.goBack();
		await page.waitForLoadState("domcontentloaded");

		// `CursorPagination` ne doit PAS forcer un scroll-to-top au montage : sa
		// sentinelle d'initialisation le déclenchait à chaque retour arrière, juste
		// après que Next.js ait restauré la position.
		await expect
			.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
			.toBeGreaterThan(100);
	});

	test("naviguer page suivante met a jour l'URL", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		await goToNextPage(page);

		// URL should contain cursor and direction params
		expect(page.url()).toContain("cursor=");
		expect(page.url()).toContain("direction=forward");
	});

	test("naviguer page precedente met a jour l'URL", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		// First, go to page 2
		await goToNextPage(page);

		// Then go back
		const prevButton = page.getByRole("button", { name: /Page précédente/i });
		await expect(prevButton).toBeEnabled();
		await prevButton.click();

		await expect.poll(() => page.url(), { timeout: 15_000 }).toContain("direction=backward");
	});

	test("retour au debut supprime le cursor de l'URL", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		await goToNextPage(page);

		// Click reset
		const resetButton = page.getByRole("button", { name: /Retour au début/i });
		await expect(resetButton).toBeEnabled();
		await resetButton.click();

		// URL should no longer have cursor or direction
		await expect.poll(() => page.url(), { timeout: 15_000 }).not.toContain("cursor=");
		expect(page.url()).not.toContain("direction=");
	});

	test("changer le nombre par page reset le cursor", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		// Page 2 d'abord — garantie par le semis de `beforeAll`.
		await goToNextPage(page);

		const perPageTrigger = visiblePerPageSelect(page);
		await expect(perPageTrigger).toBeVisible();
		await perPageTrigger.click();

		const option50 = page.getByRole("option", { name: "50" });
		await expect(option50).toBeVisible();
		await option50.click();

		// URL should have perPage=50 but no cursor
		await expect.poll(() => page.url(), { timeout: 15_000 }).toContain("perPage=50");
		expect(page.url()).not.toContain("cursor=");
	});

	test("le status badge indique la position courante", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const pagination = page.getByRole("navigation", { name: /Pagination/i });
		await expect(pagination).toBeVisible({ timeout: 15_000 });

		// Le badge porte un rôle et un nom accessibles : on le cible par là plutôt
		// que par son texte (rendu en double avec la barre compacte).
		const positionBadge = page
			.getByRole("status", { name: /Position actuelle dans la pagination/i })
			.filter({ visible: true })
			.first();
		await expect(positionBadge).toHaveText("Première page");

		// Navigate to next page
		await goToNextPage(page);

		// Page 2 : le badge quitte « Première page » pour « Suite » ou, si c'est la
		// dernière, « Dernière page ». Le contrat vérifié est le CHANGEMENT.
		await expect(positionBadge).toHaveText(/^(Suite|Dernière page)$/, { timeout: 10_000 });
	});

	test("les raccourcis clavier Alt+Fleche fonctionnent", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		await expect(page.getByRole("button", { name: /Page suivante/i })).toBeVisible({
			timeout: 15_000,
		});
		// Le raccourci est posé par un effet du composant : sans hydratation, la
		// frappe part dans le vide (même piège que le clic, cf. `goToNextPage`).
		await waitForHydratedButton(page, /Page suivante/i);

		// ⚠️ `onKeyDown` IGNORE les frappes dont la cible est interactive
		// (`isInteractiveTarget`) : si le focus traîne sur un lien de la liste, le
		// raccourci ne fait rien. On le ramène sur le body avant chaque tentative.
		await expect(async () => {
			if (!page.url().includes("cursor=")) {
				await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
				await page.keyboard.press("Alt+ArrowRight");
			}
			expect(page.url()).toContain("cursor=");
		}).toPass({ timeout: 20_000 });
		expect(page.url()).toContain("direction=forward");

		// Use Alt+ArrowLeft to go back
		await expect(async () => {
			if (!page.url().includes("direction=backward")) {
				await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
				await page.keyboard.press("Alt+ArrowLeft");
			}
			expect(page.url()).toContain("direction=backward");
		}).toPass({ timeout: 20_000 });
	});
});
