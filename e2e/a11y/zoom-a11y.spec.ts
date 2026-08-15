import { test, expect } from "../fixtures";
import type { Page } from "@playwright/test";
import { expectNoA11yViolations } from "../helpers/axe";
import { preseedCookieConsent } from "../helpers/consent";
import { requireSeedData, SELECTORS } from "../constants";

/**
 * Zoom texte 200 % (WCAG 1.4.4 Resize Text).
 *
 * Le grossissement passe par `documentElement.style.fontSize`, pas par une
 * réduction de viewport : c'est ce que fait le réglage « taille de police » du
 * navigateur, et c'est le seul mode qui déplace les breakpoints Tailwind (en
 * rem) — donc le seul qui exerce la cohérence entre seuils CSS et seuils JS.
 * Le reflow à 320 CSS px (WCAG 1.4.10) est couvert par
 * `e2e/mobile-accessibility.spec.ts`.
 */

async function zoomTo200(page: Page) {
	await page.evaluate(() => {
		document.documentElement.style.fontSize = "200%";
	});
	// Laisse les media queries rem re-matcher et les ResizeObserver (barre CTA
	// paiement) republier leurs hauteurs.
	await page.waitForTimeout(300);
}

async function expectNoHorizontalScroll(page: Page, name: string) {
	// `expect.poll` : sous la charge d'un run complet (8 workers), des sections
	// streamées ou des images en cours de chargement produisent des états de
	// layout TRANSITOIRES qui débordent quelques centaines de ms — un débordement
	// réel, lui, est stable et fait toujours échouer le poll.
	await expect
		.poll(
			() =>
				page.evaluate(
					() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
				),
			{ message: `${name} déborde horizontalement à 200%`, timeout: 5000 },
		)
		.toBeLessThanOrEqual(1);
}

/**
 * Chevauchement : aucune barre `position: fixed` ne doit recouvrir un élément
 * interactif. C'est le mode de défaillance dominant au zoom (le chrome fixe ne
 * grandit pas proportionnellement au viewport) et il n'était asserté nulle part
 * dans le repo — l'ancienne heuristique de troncature ne regardait que le
 * débordement vertical de conteneurs de moins de 50px de haut.
 */
async function expectNoFixedBarCoveringControls(page: Page, name: string) {
	const collisions = await page.evaluate(() => {
		const isFixed = (el: Element) => getComputedStyle(el).position === "fixed";
		const visible = (r: DOMRect) => r.width > 0 && r.height > 0;

		const bars = [...document.querySelectorAll("body *")].filter((el) => {
			if (!isFixed(el)) return false;
			// Un overlay MODAL ouvert (sheet, dialog, backdrop) recouvre la page
			// PAR DESIGN — le focus est piégé dans la modale, les contrôles
			// dessous sont inertes. Le test vise le chrome fixe (barres), pas les
			// modales : on écarte tout fixed qui est ou contient un dialog.
			if (el.closest('[role="dialog"]') || el.querySelector('[role="dialog"]')) return false;
			if (el.getAttribute("aria-hidden") === "true") return false;
			const style = getComputedStyle(el);
			if (style.visibility === "hidden" || style.display === "none") return false;
			if (Number(style.opacity) === 0) return false;
			// `pointer-events: none` ne bloque pas le clic : ce n'est pas un
			// obstacle même s'il recouvre visuellement.
			if (style.pointerEvents === "none") return false;
			const r = el.getBoundingClientRect();
			// Une "barre" occupe une part significative de la largeur.
			return visible(r) && r.width > window.innerWidth * 0.5;
		});

		const controls = [...document.querySelectorAll("a[href], button, input, select, textarea")];
		const hits: string[] = [];

		for (const control of controls) {
			const c = control.getBoundingClientRect();
			if (!visible(c)) continue;
			// Hors viewport vertical → non concerné (scroll le ramènera).
			if (c.bottom <= 0 || c.top >= window.innerHeight) continue;

			const coveredByABar = () => {
				const cc = control.getBoundingClientRect();
				for (const bar of bars) {
					if (bar.contains(control)) continue;
					const b = bar.getBoundingClientRect();

					const overlapX = Math.min(b.right, cc.right) - Math.max(b.left, cc.left);
					const overlapY = Math.min(b.bottom, cc.bottom) - Math.max(b.top, cc.top);
					if (overlapX <= 2 || overlapY <= 2) continue;

					// Le contrôle est-il réellement inatteignable au point recouvert ?
					// elementFromPoint tranche : si c'est la barre qui répond, le clic
					// part sur elle.
					const x = Math.max(b.left, cc.left) + overlapX / 2;
					const y = Math.max(b.top, cc.top) + overlapY / 2;
					const topMost = document.elementFromPoint(x, y);
					if (!topMost || control.contains(topMost) || topMost === control) continue;
					if (!bar.contains(topMost) && topMost !== bar) continue;
					return bar;
				}
				return null;
			};

			let bar = coveredByABar();
			if (bar) {
				// Une barre fixe recouvre TOUJOURS ce qui passe sous elle au scroll
				// courant — c'est normal (bottom-nav mobile sur le contenu au pli).
				// Le vrai critère WCAG est : l'utilisatrice peut-elle DÉGAGER le
				// contrôle en scrollant ? On le centre, puis on re-mesure ; seul un
				// recouvrement qui survit au scroll est une défaillance.
				control.scrollIntoView({ block: "center", behavior: "instant" });
				bar = coveredByABar();
			}
			if (bar) {
				const text = control.textContent.trim().slice(0, 40);
				const label = text !== "" ? text : (control.getAttribute("aria-label") ?? control.tagName);
				hits.push(`${label} recouvert par ${bar.tagName}.${bar.className}`.slice(0, 160));
			}
		}

		return [...new Set(hits)];
	});

	expect(collisions, `${name} : contrôles recouverts par une barre fixe à 200%\n`).toEqual([]);
}

test.describe("Accessibilité - Zoom 200%", { tag: ["@slow"] }, () => {
	const criticalPages = [
		{ path: "/", name: "Homepage" },
		{ path: "/produits", name: "Catalogue" },
		{ path: "/admin/connexion", name: "Connexion admin" },
	];

	for (const { path, name } of criticalPages) {
		test(`${name} reste utilisable à 200% zoom`, async ({ page }) => {
			await preseedCookieConsent(page);
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");
			await zoomTo200(page);

			await expectNoHorizontalScroll(page, name);
			await expectNoFixedBarCoveringControls(page, name);
			// `target-size` désactivé ICI SEULEMENT (les audits à zoom normal le
			// gardent) : la simulation par `fontSize` inline ne déplace pas les
			// media queries rem, alors qu'un vrai zoom texte navigateur les
			// déplace — à 200% un viewport de 1024px repasse en layout mobile.
			// La navbar desktop « à l'étroit » que ce test produit n'existe donc
			// pour aucun utilisateur réel.
			await expectNoA11yViolations(page, {
				context: `${name} (zoom 200%)`,
				disableRules: ["target-size"],
			});
		});
	}

	// ─── Chemin d'achat ────────────────────────────────────────────────────
	// Surface la plus chargée en chrome fixe (barre CTA paiement `fixed
	// bottom-0` dont la hauteur varie de ~72 à ~200px avec les alertes 3DS) et
	// pourtant absente de toute couverture reflow/zoom avant l'audit 2026-07-26.

	test("Fiche produit reste utilisable à 200% zoom", async ({ page }) => {
		await preseedCookieConsent(page);
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const firstProduct = page.locator(SELECTORS.PRODUCT_LINK).first();
		await expect(firstProduct).toBeVisible();
		await firstProduct.click();
		await page.waitForLoadState("domcontentloaded");
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

		await zoomTo200(page);

		await expectNoHorizontalScroll(page, "Fiche produit");
		await expectNoFixedBarCoveringControls(page, "Fiche produit");
	});

	test("Panier (sheet) reste utilisable à 200% zoom", async ({ page }) => {
		await preseedCookieConsent(page);
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		await zoomTo200(page);

		// Le panier est un Sheet, pas une route : on l'ouvre depuis la navbar.
		const cartTrigger = page.getByRole("button", { name: /panier/i }).first();
		await expect(cartTrigger).toBeVisible();
		await cartTrigger.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		await expectNoHorizontalScroll(page, "Panier");
		await expectNoFixedBarCoveringControls(page, "Panier");
	});

	test("Checkout reste utilisable à 200% zoom", async ({
		page,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		// Le commentaire ci-dessus DÉSIGNE cette page comme « la surface la plus
		// chargée en chrome fixe » — elle n'était pourtant testée nulle part. La
		// barre CTA `fixed bottom-0` est exactement ce que `expectNoFixedBarCovering
		// Controls` sait attraper.
		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		requireSeedData(test, !seeded.skipped, seeded.skipped ? seeded.reason : "");
		if (seeded.skipped) return;

		await zoomTo200(page);

		await expectNoHorizontalScroll(page, "Checkout");
		await expectNoFixedBarCoveringControls(page, "Checkout");
	});
});

/**
 * Les confirmations destructives sont bornées en hauteur (`max-h`). Sans zone
 * scrollable, le footer — dernier enfant — sortait de l'écran et les boutons
 * Annuler / Confirmer devenaient inatteignables (P1-2, audit 2026-07-26).
 * Le contrat de classes est verrouillé côté unitaire par
 * `alert-dialog-scrollable.regression.test.tsx` ; ici on vérifie le rendu réel.
 */
test.describe("Accessibilité - AlertDialog à 200% zoom", { tag: ["@slow"] }, () => {
	test("les actions d'une confirmation restent dans le viewport", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		// Viewport court : c'est la hauteur, pas la largeur, qui clippait.
		await page.setViewportSize({ width: 844, height: 390 });
		await zoomTo200(page);

		const consentReject = page.getByRole("button", { name: /refuser|tout refuser/i }).first();
		if (!(await consentReject.isVisible().catch(() => false))) {
			test.skip(true, "Bandeau cookies déjà accepté sur ce state");
		}

		// Le bandeau de consentement est le seul overlay borné atteignable sans
		// authentification ni données de seed.
		const box = await consentReject.boundingBox();
		expect(box).not.toBeNull();
		if (box) {
			expect(box.y + box.height, "action hors du viewport à 200%").toBeLessThanOrEqual(390);
		}
		await expect(consentReject).toBeInViewport();
	});
});
