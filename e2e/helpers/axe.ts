import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

export async function expectNoA11yViolations(
	page: Page,
	options?: {
		exclude?: string[];
		disableRules?: string[];
		context?: string;
	},
) {
	// ⚠️ Sans reduced-motion, axe photographie les éléments EN COURS de fondu
	// d'entrée (fadeUp) et calcule des contrastes de transition (1,25:1 sur du
	// texte à 90 % d'opacité) — des violations fantômes qui n'existent à aucun
	// état stable. Le repo est motion-safe partout : couper l'animation rend
	// l'audit déterministe. Constaté au lot 7 (prod + PPR : l'audit part plus
	// tôt qu'en dev).
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.waitForTimeout(150);

	const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);

	// Sentinelles du piège à focus Base UI : des <span role="button" tabindex="0">
	// SANS nom accessible, clip-pathés et marqués `data-base-ui-inert`. Internes
	// à la bibliothèque (non stylables ni nommables depuis l'app), ils faisaient
	// échouer `aria-command-name` sur tout overlay ouvert — d'abord vu sur WebKit
	// (le timing d'axe y photographie l'état où les guards sont actifs).
	builder.exclude("[data-base-ui-focus-guard]");

	for (const selector of options?.exclude ?? []) {
		builder.exclude(selector);
	}
	if (options?.disableRules?.length) {
		builder.disableRules(options.disableRules);
	}

	const results = await builder.analyze();

	if (results.violations.length > 0) {
		const summary = results.violations
			.map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
			.join("\n");
		expect(
			results.violations,
			`Violations WCAG${options?.context ? ` sur ${options.context}` : ""}:\n${summary}`,
		).toEqual([]);
	}
}
