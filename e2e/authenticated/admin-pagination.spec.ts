import { test, expect } from "../fixtures";

test.describe("Admin - Pagination cursor", { tag: ["@regression"] }, () => {
	test("la pagination est visible sur la page produits", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const pagination = page.getByRole("navigation", { name: /Pagination/i });
		const paginationVisible = await pagination.isVisible().catch(() => false);

		if (!paginationVisible) {
			// Une seule page : `CursorPagination` retourne `null` et masque TOUTE la
			// barre, sélecteur « par page » compris. L'ancienne version de ce test
			// affirmait ici que le sélecteur restait visible — assertion impossible à
			// satisfaire, qui échouait dès que le seed tenait sur une page.
			await expect(page.getByLabel(/Nombre de résultats par page/i)).toBeHidden();
			// Le compteur de résultats, lui, reste rendu par `AdminDataTable` hors de
			// la zone conditionnelle : c'est tout l'intérêt de l'avoir sorti de la barre.
			await expect(page.getByText(/\d+ résultats?/).first()).toBeVisible();
			return;
		}

		await expect(pagination).toBeVisible();
	});

	test("le compteur de résultats est toujours affiché", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		// Rendu par `AdminDataTable`, donc indépendant du nombre de pages.
		await expect(page.getByText(/\d+( sur \d+)? résultats?/).first()).toBeVisible();
	});

	test("changer le tri depuis la page 2 repart du debut (curseur purge)", async ({
		page,
		adminPage,
	}) => {
		await adminPage.gotoProducts();

		const nextButton = page.getByRole("button", { name: /Page suivante/i });
		const nextVisible = await nextButton.isVisible().catch(() => false);
		test.skip(!nextVisible, "No next page button - not enough data for pagination");

		await nextButton.click();
		await page.waitForLoadState("domcontentloaded");
		expect(page.url()).toContain("cursor=");

		// Changer le tri depuis une page profonde doit purger cursor + direction :
		// sinon Prisma se repositionne sur un id de l'ANCIEN tri et rend une
		// tranche arbitraire, sans erreur ni signal visible.
		const sortTrigger = page.getByLabel(/Trier par/i).first();
		await sortTrigger.click();
		const option = page.getByRole("option").nth(1);
		await option.click();
		await page.waitForLoadState("domcontentloaded");

		expect(page.url()).not.toContain("cursor=");
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

		const nextButton = page.getByRole("button", { name: /Page suivante/i });
		const nextVisible = await nextButton.isVisible().catch(() => false);
		test.skip(!nextVisible, "No next page button - not enough data for pagination");

		await nextButton.click();
		await page.waitForLoadState("domcontentloaded");

		// URL should contain cursor and direction params
		const url = page.url();
		expect(url).toContain("cursor=");
		expect(url).toContain("direction=forward");
	});

	test("naviguer page precedente met a jour l'URL", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		// First, go to page 2
		const nextButton = page.getByRole("button", { name: /Page suivante/i });
		const nextVisible = await nextButton.isVisible().catch(() => false);
		test.skip(!nextVisible, "No next page button - not enough data for pagination");

		await nextButton.click();
		await page.waitForLoadState("domcontentloaded");

		// Then go back
		const prevButton = page.getByRole("button", { name: /Page précédente/i });
		await expect(prevButton).toBeEnabled();
		await prevButton.click();
		await page.waitForLoadState("domcontentloaded");

		const url = page.url();
		expect(url).toContain("direction=backward");
	});

	test("retour au debut supprime le cursor de l'URL", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const nextButton = page.getByRole("button", { name: /Page suivante/i });
		const nextVisible = await nextButton.isVisible().catch(() => false);
		test.skip(!nextVisible, "No next page button - not enough data for pagination");

		// Go to page 2
		await nextButton.click();
		await page.waitForLoadState("domcontentloaded");
		expect(page.url()).toContain("cursor=");

		// Click reset
		const resetButton = page.getByRole("button", { name: /Retour au début/i });
		await expect(resetButton).toBeEnabled();
		await resetButton.click();
		await page.waitForLoadState("domcontentloaded");

		// URL should no longer have cursor or direction
		const url = page.url();
		expect(url).not.toContain("cursor=");
		expect(url).not.toContain("direction=");
	});

	test("changer le nombre par page reset le cursor", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		// First navigate to page 2 if possible
		const nextButton = page.getByRole("button", { name: /Page suivante/i });
		const nextVisible = await nextButton.isVisible().catch(() => false);

		if (nextVisible) {
			await nextButton.click();
			await page.waitForLoadState("domcontentloaded");
			expect(page.url()).toContain("cursor=");
		}

		// Change per-page — la barre entière (sélecteur compris) est absente quand la
		// liste tient sur une page : rien à tester dans ce cas.
		const perPageTrigger = page.getByLabel(/Nombre de résultats par page/i);
		test.skip(
			(await perPageTrigger.count()) === 0,
			"Pas de sélecteur par page (liste sur une seule page)",
		);
		await expect(perPageTrigger).toBeVisible();
		await perPageTrigger.click();

		// Select 50
		const option50 = page.getByRole("option", { name: "50" });
		const option50Visible = await option50.isVisible().catch(() => false);
		test.skip(!option50Visible, "No per-page option 50 found");

		await option50.click();
		await page.waitForLoadState("domcontentloaded");

		// URL should have perPage=50 but no cursor
		const url = page.url();
		expect(url).toContain("perPage=50");
		expect(url).not.toContain("cursor=");
	});

	test("le status badge indique la position courante", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const pagination = page.getByRole("navigation", { name: /Pagination/i });
		const paginationVisible = await pagination.isVisible().catch(() => false);
		test.skip(!paginationVisible, "No pagination visible");

		// On first page, should show "Première page"
		await expect(page.getByText("Première page")).toBeVisible();

		// Navigate to next page
		const nextButton = page.getByRole("button", { name: /Page suivante/i });
		const nextEnabled = await nextButton.isEnabled().catch(() => false);
		test.skip(!nextEnabled, "Next button not enabled");

		await nextButton.click();
		await page.waitForLoadState("domcontentloaded");

		// Should show "Suite" or "Dernière page"
		const suite = page.getByText("Suite");
		const derniere = page.getByText("Dernière page");
		await expect(suite.or(derniere).first()).toBeVisible({ timeout: 5000 });
	});

	test("les raccourcis clavier Alt+Fleche fonctionnent", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const nextButton = page.getByRole("button", { name: /Page suivante/i });
		const nextVisible = await nextButton.isVisible().catch(() => false);
		test.skip(!nextVisible, "No next page button - not enough data for pagination");

		// Use Alt+ArrowRight to go next
		await page.keyboard.press("Alt+ArrowRight");
		await page.waitForLoadState("domcontentloaded");

		expect(page.url()).toContain("cursor=");
		expect(page.url()).toContain("direction=forward");

		// Use Alt+ArrowLeft to go back
		await page.keyboard.press("Alt+ArrowLeft");
		await page.waitForLoadState("domcontentloaded");

		expect(page.url()).toContain("direction=backward");
	});
});
