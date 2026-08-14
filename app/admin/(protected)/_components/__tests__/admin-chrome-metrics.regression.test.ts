/**
 * @regression admin-chrome-metrics
 *
 * Verrouille trois corrections de métriques du chrome admin (audit « shell &
 * navigation ») que rien ne peut attraper au runtime jsdom :
 *
 * 1. **`--admin-header-height` doit être déclarée sur `html`.** Les règles
 *    `html:has([data-admin-layout])` (scroll-padding) lisaient une
 *    variable déclarée sur `[data-admin-layout]` — un DESCENDANT. Les custom
 *    properties héritent vers le bas : la règle retombait donc toujours,
 *    silencieusement, sur son fallback. Correct seulement par coïncidence.
 *
 * 2. **Fallback unique `56px` pour `--bottom-bar-height` côté réservation.** Trois
 *    valeurs coexistaient (`0px`, `56px`, `5rem`) ; les 11 sites `5rem` étaient les
 *    listes mobiles admin dont les squelettes utilisaient `56px` → 24px de saut au
 *    streaming. Le fallback `0px` reste légitime pour les consommateurs qui veulent
 *    l'espace réellement OCCUPÉ (la variable est retirée quand la barre se masque).
 *
 * 3. **Pas de double comptage de la safe-area.** `body` porte déjà
 *    `padding-top: env(safe-area-inset-top)` (pwa.css) : un descendant qui l'ajoute
 *    à son propre `pt-` compte l'encoche deux fois (~47px de vide mort).
 *
 * Toute modification requiert une review explicite.
 */
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../../../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("@regression admin-chrome-metrics — portée des variables", () => {
	const globals = read("app/globals.css");

	it("déclare --admin-header-height sur html:has([data-admin-layout])", () => {
		// Le bloc `html:has(...)` doit contenir la déclaration, pas seulement la lire.
		const htmlBlock = globals.match(
			/html:has\(\[data-admin-layout\]\)\s*\{[^}]*--admin-header-height:\s*3\.5rem/,
		);
		expect(htmlBlock).not.toBeNull();
	});

	it("publie le palier md (4rem) sur html aussi, pas seulement sur le descendant", () => {
		// Le `@media` contient un bloc imbriqué : on isole la portion après le
		// sélecteur `html:has(...)` plutôt que de compter les accolades en regex.
		// Les deux syntaxes de media query sont acceptées — Prettier normalise
		// `(min-width: 768px)` en `(width >= 48rem)`.
		const mdIndex = globals.search(
			/@media\s*\((?:min-width:\s*768px|width\s*>=\s*48rem)\)\s*\{\s*html:has\(\[data-admin-layout\]\)/,
		);
		expect(mdIndex).toBeGreaterThan(-1);
		expect(globals.slice(mdIndex, mdIndex + 400)).toMatch(/--admin-header-height:\s*4rem/);
	});

	it("réserve la bottom-bar via scroll-padding-bottom (pendant du cas checkout)", () => {
		expect(globals).toMatch(
			/html:has\(\[data-admin-layout\]\)\s*\{[\s\S]*?scroll-padding-bottom:\s*calc\(\s*var\(--bottom-bar-height,\s*56px\)/,
		);
	});

	it("ne déclare PAS --bottom-bar-height en CSS (son absence signifie « barre masquée »)", () => {
		expect(globals).not.toMatch(/^\s*--bottom-bar-height:\s*\d/m);
	});
});

describe("@regression admin-chrome-metrics — fallback unique de --bottom-bar-height", () => {
	/**
	 * `0px` = espace réellement occupé (toaster, cookie-banner, scroll-to-top…).
	 * `56px` = réservation de place. Toute autre valeur est un drift.
	 */
	const ALLOWED = new Set(["0px", "56px"]);

	it("aucun site n'utilise un fallback autre que 0px ou 56px", () => {
		const offenders = collectSourceFiles()
			.flatMap(({ rel, code }) =>
				[...code.matchAll(/--bottom-bar-height,\s*([^)]+)\)/g)].map((m) => ({
					rel,
					value: (m[1] ?? "").trim(),
				})),
			)
			.filter(({ value }) => !ALLOWED.has(value));

		expect(offenders).toEqual([]);
	});
});

describe("@regression admin-chrome-metrics — safe-area non dupliquée", () => {
	it("la layout admin n'ajoute pas env(safe-area-inset-top) à son padding-top", () => {
		const layout = read("app/admin/(protected)/layout.tsx");
		// `body` (pwa.css) l'applique déjà : `main` démarre sous l'encoche.
		expect(layout).not.toMatch(/pt-\[calc\([^\]]*safe-area-inset-top/);
	});

	it("pwa.css applique bien la safe-area sur body (prémisse de la règle ci-dessus)", () => {
		const pwa = read("app/styles/pwa.css");
		expect(pwa).toMatch(/body\s*\{[^}]*padding-top:\s*env\(safe-area-inset-top/);
	});

	it("le header mobile garde sa propre safe-area (il est fixed, hors flux de body)", () => {
		const header = read("app/admin/(protected)/_components/admin-mobile-header.tsx");
		expect(header).toMatch(/pwa-header/);
	});
});

/**
 * Sources de PRODUCTION susceptibles de consommer la variable.
 * Les tests sont exclus : ce fichier contient lui-même des littéraux
 * `--bottom-bar-height,…` dans ses regex, qu'il compterait comme des violations.
 */
function collectSourceFiles(): Array<{ rel: string; code: string }> {
	const files = globSync(
		["app/**/*.{ts,tsx,css}", "modules/**/*.{ts,tsx}", "shared/**/*.{ts,tsx,css}"],
		{
			cwd: ROOT,
		},
	)
		.map(String)
		.filter((rel) => !rel.includes("__tests__") && !/\.test\.tsx?$/.test(rel));

	return files.map((rel) => ({ rel, code: read(rel) }));
}
