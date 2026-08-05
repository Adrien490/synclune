/**
 * @regression font-fallback-declared
 *
 * Toute famille chargée par `next/font` doit avoir un REPLI déclaré.
 *
 * ## Pourquoi ce test existe
 *
 * Après la migration de polices du 2026-08-05, `--font-display` était émise comme
 * `"Winky Sans"` — **toute seule**. Ni face de repli à métriques ajustées, ni même
 * une famille générique derrière. Les deux autres, elles, en avaient une :
 * `--font-sans: "Onest", "Onest Fallback"` et `--font-cursive: "Kalam", "Kalam Fallback"`
 * (`size-adjust: 97.58%` / `105.2%`, vérifiés dans le CSS émis).
 *
 * La cause est une combinaison : `adjustFontFallback: false` — obligatoire, Winky
 * Sans est absente de `capsize-font-metrics.json` — **sans** `fallback` pour
 * compenser. Conséquence : tant que le woff2 n'était pas arrivé, ou s'il échouait,
 * le `h1` de l'étal se peignait dans la police par défaut de l'UA, une SERIF, avant
 * de re-flower. Or c'est lui qui porte le LCP mobile (mesuré : 32 571 px² contre
 * 28 501 pour la première photo à 390 px de large). Fraunces, la display d'avant,
 * avait ses métriques capsize : la migration a retiré le repli de l'élément LCP.
 *
 * ⚠️ Ce que ce test ne peut PAS voir, et pourquoi il scanne la source : la valeur
 * réellement émise dans `--font-display` n'existe qu'après un build. `tsc` accepte
 * un loader sans repli, aucun lint ne le signale, et les tests de composant
 * n'atteignent jamais la CSS. Le défaut n'était visible que dans
 * `.next/static/*.css` — c'est-à-dire nulle part dans la CI.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const FONTS_SOURCE = readFileSync(join(__dirname, "../fonts.ts"), "utf8");

type Loader = { name: string; body: string };

/** Découpe chaque appel `export const x = Family({ … });` en (nom, corps). */
function readLoaders(source: string): Loader[] {
	const loaders: Loader[] = [];
	const pattern = /export const (\w+)\s*=\s*\w+\(\{/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(source)) !== null) {
		// Fin du bloc : le `});` qui referme l'objet d'options.
		const start = match.index + match[0].length;
		const end = source.indexOf("});", start);
		if (end === -1) throw new Error(`Bloc d'options non refermé pour ${match[1]}`);
		loaders.push({ name: match[1] as string, body: source.slice(start, end) });
	}
	return loaders;
}

const LOADERS = readLoaders(FONTS_SOURCE);

describe("@regression font-fallback-declared", () => {
	it("trouve bien les loaders (garde-fou du garde-fou)", () => {
		// Si le découpage casse, toutes les assertions ci-dessous deviennent vertes
		// pour la mauvaise raison : un tableau vide passe tous les `.each`.
		expect(LOADERS.map((l) => l.name)).toEqual(["winkySans", "winkySansItalic", "onest", "kalam"]);
	});

	it.each(LOADERS.map((l) => [l.name, l.body] as const))(
		"%s déclare un repli — soit métrique, soit explicite",
		(name, body) => {
			const disablesMetricFallback = /adjustFontFallback:\s*false/.test(body);
			const hasExplicitFallback = /fallback:\s*\S/.test(body);

			if (disablesMetricFallback) {
				expect(
					hasExplicitFallback,
					`${name} coupe le repli métrique (adjustFontFallback: false) SANS déclarer de ` +
						`\`fallback\` : la famille est émise seule et le navigateur retombe sur sa ` +
						`police par défaut, une serif, sans plancher de CLS.`,
				).toBe(true);
			}
		},
	);

	/**
	 * ⚠️ La pile est lue DANS le corps du loader, jamais depuis une constante
	 * partagée : next/font analyse statiquement ses options, donc
	 * `fallback: DISPLAY_FALLBACK` fait échouer le build sur « Font loader values
	 * must be explicitly written literals ». La version précédente de ce test
	 * exigeait exactement cette forme — elle verrouillait un build cassé, et ni
	 * `tsc` ni le lint ne voyaient la contradiction.
	 */
	function readFallbackStack(body: string): string {
		return /fallback:\s*\[([^\]]+)\]/.exec(body)?.[1] ?? "";
	}

	const DISPLAY_LOADERS = LOADERS.filter((l) => l.name.startsWith("winkySans"));

	it("les deux faces display partagent la MÊME pile de repli", () => {
		// Une pile différente entre romaine et italique ferait sauter la ligne au
		// moment où l'italique arrive — sur les sous-titres de méga-menu, pile là
		// où l'utilisatrice est en train de viser un lien. La pile étant dupliquée
		// en littéral (contrainte next/font ci-dessus), c'est ce test qui remplace
		// la constante partagée comme garde-fou.
		expect(DISPLAY_LOADERS).toHaveLength(2);
		const stacks = DISPLAY_LOADERS.map((l) => readFallbackStack(l.body).replace(/\s+/g, " "));
		expect(stacks[0]).not.toBe("");
		expect(stacks[1]).toBe(stacks[0]);
	});

	it("aucun loader ne factorise sa pile de repli dans une constante", () => {
		// Le défaut inverse, et il ne rougit QUE dans un build : une valeur non
		// littérale passe le typecheck puis casse `next dev` / `next build`.
		for (const loader of LOADERS) {
			const value = /fallback:\s*([^\n,]+)/.exec(loader.body)?.[1];
			if (value === undefined) continue;
			expect(
				value.trimStart().startsWith("["),
				`${loader.name} passe \`fallback: ${value.trim()}\` — next/font exige un tableau ` +
					`écrit en littéral sur place, sinon le build échoue sur « Font loader values must ` +
					`be explicitly written literals ».`,
			).toBe(true);
		}
	});

	it("la pile de repli de la display n'est pas une serif", () => {
		// La retombée sur une serif était le symptôme visible du défaut : un titre
		// « trait d'encre » qui paraît une fraction de seconde en Times.
		const stack = readFallbackStack(DISPLAY_LOADERS[0]?.body ?? "");
		expect(stack).not.toBe("");
		// ⚠️ Lookbehind obligatoire : `sans-serif` CONTIENT `serif`, donc un
		// `not.toMatch(/serif/)` nu rougirait sur la pile correcte.
		expect(stack).not.toMatch(/(?<!sans-)serif/);
		expect(stack).not.toMatch(/Times/);
		expect(stack).toMatch(/sans-serif/);
	});
});
