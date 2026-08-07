/**
 * @regression theme-token-consumers-2026-08-06
 *
 * Critère d'admission des variables CSS (CLAUDE.md § Conventions UI) :
 * **un token custom du bloc `@theme` doit avoir au moins un lecteur hors `globals.css`.**
 *
 * ⚠️ **Pourquoi ce test existe** : un token sans consommateur ne casse rien — ni `tsc`,
 * ni ESLint, ni le build, ni l'œil. C'est ainsi que `--blur-1/2/3`, l'échelle
 * `--text-shadow-sm/md/lg/glow` (tokens + classes `.text-shadow-*` de `components.css`,
 * personne au bout de la chaîne) et `--duration-slower` ont vécu des mois en poids mort
 * avant le nettoyage du 2026-08-06. Ce scan interdit d'en réintroduire : soit le token
 * gagne un lecteur, soit il n'entre pas.
 *
 * Ce que le scan NE couvre pas, délibérément :
 * - les indirections `--color-x: var(--x)` (pont shadcn → Tailwind : le graphe de
 *   consommation réel vit sur `--x`, dans `:root`) ;
 * - les sous-tokens (`--text-2xs--line-height`, lié à `--text-2xs`) ;
 * - les échelles standard shadcn/Tailwind (`--shadow*`, `--radius*`, `--tracking-*`),
 *   livrées entières — un cran inutilisé d'une échelle standard n'est pas un token
 *   ad hoc, et « shadow » nu matcherait tout le dépôt.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const GLOBALS_PATH = join(ROOT, "app", "globals.css");
const GLOBALS = readFileSync(GLOBALS_PATH, "utf-8");

/** Échelles standard livrées entières — hors périmètre (cf. JSDoc). */
const STANDARD_SCALES = /^--(shadow(-(2xs|xs|sm|md|lg|xl|2xl))?|radius(-\w+)?|tracking-\w+)$/;

/**
 * Tokens consommés via une syntaxe qui ne contient pas leur nom.
 * `--breakpoint-xs` génère le variant `xs:` — c'est lui qu'on cherche.
 */
const VARIANT_CONSUMED: Record<string, RegExp> = {
	"--breakpoint-xs": /(^|[^\w-])xs:/m,
};

const SCAN_DIRS = ["app", "modules", "shared"];
const SCAN_EXTENSIONS = [".ts", ".tsx", ".css"];
/** `app/generated` (client Prisma) : volumineux et hors sujet. */
const SKIP_DIRS = new Set(["generated", "node_modules"]);

function collectSources(dir: string, acc: string[]): string[] {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) collectSources(full, acc);
		} else if (
			SCAN_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) &&
			full !== GLOBALS_PATH &&
			full !== __filename
		) {
			acc.push(full);
		}
	}
	return acc;
}

function themeTokens(): Array<{ name: string; value: string }> {
	const block = GLOBALS.match(/@theme[^{]*\{[\s\S]*?\n\}/)?.[0];
	if (!block) throw new Error("Bloc @theme introuvable dans globals.css");
	return [...block.matchAll(/^\t(--[\w-]+(?:--[\w-]+)?):\s*([^;]+);/gm)].map((m) => ({
		name: m[1] as string,
		value: (m[2] as string).trim(),
	}));
}

describe("@regression theme-token-consumers", () => {
	it("chaque token custom du bloc @theme a au moins un lecteur hors globals.css", () => {
		const candidates = themeTokens().filter(
			({ name, value }) =>
				// Pont shadcn `--color-x: var(--x)` : le vrai token est `--x`.
				!/^var\(--[\w-]+\)$/.test(value) &&
				// Sous-token (`--text-2xs--line-height`) : lié à son token porteur.
				!name.slice(2).includes("--") &&
				!STANDARD_SCALES.test(name),
		);
		expect(
			candidates.length,
			"le parsing du bloc @theme ne doit pas rendre une liste vide",
		).toBeGreaterThan(10);

		const haystack = collectSources(join(ROOT, SCAN_DIRS[0] as string), [])
			.concat(...SCAN_DIRS.slice(1).map((d) => collectSources(join(ROOT, d), [])))
			.map((f) => readFileSync(f, "utf-8"))
			.join("\n");

		const orphans = candidates
			.filter(({ name }) => {
				const variantPattern = VARIANT_CONSUMED[name];
				if (variantPattern) return !variantPattern.test(haystack);
				// `--color-brand-mint` se consomme en `text-brand-mint` / `var(--color-brand-mint)` :
				// le suffixe sans `--`/`color-` couvre les deux formes.
				return !haystack.includes(name.slice(2).replace(/^color-/, ""));
			})
			.map(({ name }) => name);

		expect(
			orphans,
			"Tokens @theme sans aucun lecteur (un token sans lecteur est du poids mort — " +
				"l'inliner au call site ou le supprimer, cf. CLAUDE.md § Conventions UI)",
		).toEqual([]);
	});
});
