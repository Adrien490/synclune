import { test, expect } from "../fixtures";
import { expectNoA11yViolations } from "../helpers/axe";

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

			// Simulate 200% zoom via font-size scaling
			await page.evaluate(() => {
				document.documentElement.style.fontSize = "200%";
			});
			await page.waitForTimeout(200);

			// No horizontal scrollbar (content reflows)
			const hasHorizontalScroll = await page.evaluate(() => {
				return document.documentElement.scrollWidth > document.documentElement.clientWidth;
			});
			expect(hasHorizontalScroll, `${name} a un scroll horizontal à 200%`).toBe(false);

			// No text clipping (overflow hidden cutting content)
			const clippedElements = await page.evaluate(() => {
				const els = document.querySelectorAll("*");
				let clipped = 0;
				for (const el of els) {
					const style = getComputedStyle(el);
					if (
						style.overflow === "hidden" &&
						el.scrollHeight > el.clientHeight &&
						el.clientHeight < 50
					) {
						clipped++;
					}
				}
				return clipped;
			});
			expect(clippedElements, `${name} a ${clippedElements} éléments tronqués à 200%`).toBe(0);

			// axe-core still passes at 200%
			await expectNoA11yViolations(page, { context: `${name} (zoom 200%)` });
		});
	}
});
