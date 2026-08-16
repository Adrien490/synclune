import { test, expect } from "./fixtures";
import { delayServerActions, failServerActions } from "./helpers/network";
import { requireSeedData } from "./constants";
import { waitForHydratedButton } from "./helpers/hydration";

/**
 * Scénarios d'erreur avancés — pannes RÉELLES du canal Server Actions.
 *
 * ⚠️ Réécrit le 2026-08-16 : les trois anciens tests interceptaient `**\/api/**`,
 * or le storefront ne parle pas en `/api` — toutes ses mutations sont des
 * Server Actions (POST + en-tête `next-action`). Les interceptions ne
 * matchaient jamais rien : les tests passaient sans avoir simulé la moindre
 * panne. Les helpers de `helpers/network.ts` ciblent désormais le vrai canal.
 */
test.describe("Scenarios d'erreur avances", { tag: ["@regression"] }, () => {
	test("un 500 sur la Server Action d'ajout panier affiche une erreur en place, panier intact", async ({
		page,
		productCatalogPage,
		cartPage,
	}) => {
		await productCatalogPage.goto();
		const productCount = await productCatalogPage.productLinks.count();
		requireSeedData(test, productCount > 0, "Pas de produits dans la base");

		await productCatalogPage.gotoFirstProduct();
		if (await productCatalogPage.hasVariantSelector()) {
			await productCatalogPage.selectAllVariantOptions();
		}
		const addButton = productCatalogPage.addToCartButton.first();
		await expect(addButton).toBeVisible({ timeout: 15_000 });

		// Panne : toute Server Action répond 500.
		const restore = await failServerActions(page, 500);

		try {
			// ⚠️ Le feedback n'est PAS la frontière d'erreur du segment : `add-to-cart`
			// attrape ses exceptions (`handleActionError`) et renvoie un état d'erreur
			// que le formulaire rend en `role="alert"` — vérifié le 2026-08-16, le h1
			// reste celui du produit. Asserter `app/(shop)/error.tsx` ici décrivait un
			// comportement qui n'existe pas.
			const errorAlert = page
				.getByRole("alert")
				.filter({ hasText: /Une erreur est survenue\. Merci de réessayer\./i });

			// Le clic peut précéder l'hydratation : re-cliquer jusqu'à réaction.
			await expect(async () => {
				if (!(await errorAlert.isVisible())) {
					await addButton.click({ timeout: 1000 }).catch(() => {});
				}
				await expect(errorAlert).toBeVisible({ timeout: 2000 });
			}).toPass({ timeout: 20_000 });

			// La page reste la fiche produit — aucune frontière d'erreur déclenchée.
			await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		} finally {
			await restore();
		}

		// L'état n'est pas corrompu : le panier est resté vide (l'ajout a échoué).
		await cartPage.open();
		await expect(cartPage.emptyMessage).toBeVisible();
	});

	test("une Server Action lente expose l'état d'attente puis aboutit", async ({
		page,
		productCatalogPage,
		cartPage,
	}) => {
		await productCatalogPage.goto();
		const productCount = await productCatalogPage.productLinks.count();
		requireSeedData(test, productCount > 0, "Pas de produits dans la base");

		await productCatalogPage.gotoFirstProduct();
		if (await productCatalogPage.hasVariantSelector()) {
			await productCatalogPage.selectAllVariantOptions();
		}
		const addButton = productCatalogPage.addToCartButton.first();
		await expect(addButton).toBeVisible({ timeout: 15_000 });

		// ⚠️ Attendre l'HYDRATATION avant d'installer le délai : un clic
		// pré-hydratation est AVALÉ (aucune Server Action émise, donc aucun état
		// d'attente), et la boucle de re-clic butait ensuite sur un bouton passé
		// `disabled`. La sonde est déterministe, elle ne coûte pas un ajout à blanc.
		await waitForHydratedButton(page, /ajouter.*au panier/i);

		const restore = await delayServerActions(page, 2000);

		try {
			// Pendant le délai, le formulaire annonce son attente (`aria-busy="true"`
			// + libellé « Ajout en cours… ») — l'état de chargement réel que
			// l'ancien test « requete API lente » prétendait vérifier.
			await addButton.click();
			const pendingForm = page.locator('form[aria-busy="true"]');
			await expect(pendingForm).toBeVisible({ timeout: 5_000 });
			await expect(page.getByText("Ajout en cours…")).toBeVisible();

			// Puis l'action aboutit : le panier contient bien des articles.
			await expect(pendingForm).toHaveCount(0, { timeout: 15_000 });
			await cartPage.open();
			await expect(cartPage.emptyMessage).toHaveCount(0, { timeout: 10_000 });
		} finally {
			await restore();
		}
	});

	test("coupure reseau complete : la navigation échoue sans corrompre la page courante", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Abort all navigation requests
		await page.route("**/*", (route) => {
			if (route.request().resourceType() === "document") {
				return route.abort("connectionrefused");
			}
			return route.continue();
		});

		// Try to navigate — this should fail gracefully
		try {
			await page.goto("/produits", { timeout: 5000 });
		} catch {
			// Navigation failure is expected
		}

		// La navigation est bloquée : on reste sur l'URL d'origine.
		expect(page.url()).not.toContain("/produits");

		// ⚠️ Le DOM d'origine, lui, N'EST PAS préservé : Chromium remplace le
		// document par sa page d'erreur réseau, `h1` tombe à 0 (mesuré le
		// 2026-08-16). L'ancienne assertion « la page courante reste utilisable »
		// décrivait donc un comportement inexistant. Ce qui est vrai — et ce qui
		// compte pour la cliente — c'est que le site RÉCUPÈRE dès le réseau revenu.
		await page.unroute("**/*");
		await page.goto("/produits");
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
		await expect(page).toHaveURL(/\/produits/);
	});
});
