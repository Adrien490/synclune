import { test, expect } from "../fixtures";
import type { Page } from "@playwright/test";
import { expectNoA11yViolations } from "../helpers/axe";
import { SELECTORS } from "../constants";

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
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
	);
	expect(overflow, `${name} déborde de ${overflow}px horizontalement à 200%`).toBeLessThanOrEqual(
		1,
	);
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

			for (const bar of bars) {
				if (bar.contains(control)) continue;
				const b = bar.getBoundingClientRect();

				const overlapX = Math.min(b.right, c.right) - Math.max(b.left, c.left);
				const overlapY = Math.min(b.bottom, c.bottom) - Math.max(b.top, c.top);
				if (overlapX <= 2 || overlapY <= 2) continue;

				// Le contrôle est-il réellement inatteignable au point recouvert ?
				// elementFromPoint tranche : si c'est la barre qui répond, le clic
				// part sur elle.
				const x = Math.max(b.left, c.left) + overlapX / 2;
				const y = Math.max(b.top, c.top) + overlapY / 2;
				const topMost = document.elementFromPoint(x, y);
				if (!topMost || control.contains(topMost) || topMost === control) continue;
				if (!bar.contains(topMost) && topMost !== bar) continue;

				const text = control.textContent.trim().slice(0, 40);
				const label = text !== "" ? text : (control.getAttribute("aria-label") ?? control.tagName);
				hits.push(`${label} recouvert par ${bar.tagName}.${bar.className}`.slice(0, 160));
				break;
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
		{ path: "/connexion", name: "Connexion" },
	];

	for (const { path, name } of criticalPages) {
		test(`${name} reste utilisable à 200% zoom`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");
			await zoomTo200(page);

			await expectNoHorizontalScroll(page, name);
			await expectNoFixedBarCoveringControls(page, name);
			await expectNoA11yViolations(page, { context: `${name} (zoom 200%)` });
		});
	}

	// ─── Chemin d'achat ────────────────────────────────────────────────────
	// Surface la plus chargée en chrome fixe (barre CTA paiement `fixed
	// bottom-0` dont la hauteur varie de ~72 à ~200px avec les alertes 3DS) et
	// pourtant absente de toute couverture reflow/zoom avant l'audit 2026-07-26.

	test("Fiche produit reste utilisable à 200% zoom", async ({ page }) => {
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
