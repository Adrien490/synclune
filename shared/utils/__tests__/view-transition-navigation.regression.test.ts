/**
 * @regression view-transition-navigation
 *
 * Une navigation ne démarre PLUS sa view transition elle-même.
 *
 * `withViewTransition(() => router.push(…))` a enveloppé 34 navigations
 * jusqu'au 2026-08-18, et le motif était faux depuis le début :
 * `document.startViewTransition(cb)` prend le snapshot d'arrivée dès que `cb`
 * rend la main, or `router.push` ne rend la main qu'après avoir POSTÉ
 * l'intention de navigation — la page suivante n'est pas montée, il reste des
 * allers-retours serveur à faire. La transition se jouait donc entre l'ancienne
 * page et elle-même, sans erreur, sans trace : c'est l'incident
 * `checkout-back-link-viewtransition-bug-2026-05-20`.
 *
 * Le remplaçant est déclaratif : les deux layouts posent une frontière
 * `<ViewTransition>` (React canary vendoré par Next — cf.
 * `test/contract/react-view-transition.contract.test.ts`), et comme
 * `router.push`/`router.replace` sont déjà enveloppés dans `startTransition`
 * par Next, React possède la transition de bout en bout : il n'échantillonne
 * l'état d'arrivée qu'une fois le nouveau contenu prêt à être commité.
 *
 * Trois assertions, parce que le motif peut revenir par trois portes :
 * 1. plus AUCUN `withViewTransition` autour d'un `router.push`/`replace` ;
 * 2. le helper impératif n'a plus qu'un consommateur, et c'est une mutation
 *    d'état synchrone (cf. son JSDoc) — la liste est explicite pour qu'un ajout
 *    passe par une revue ;
 * 3. les deux frontières existent — sans elles, plus rien n'anime, et la perte
 *    serait elle aussi silencieuse.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const SOURCE_ROOTS = ["app", "modules", "shared"] as const;

/** Le helper lui-même : il se nomme dans sa propre doc, forcément. */
const HELPER = "shared/utils/view-transition.ts";

/**
 * Seul appelant légitime restant. Y ajouter une ligne = affirmer que la
 * mutation enveloppée est SYNCHRONE (pas une navigation, pas un `await`).
 */
const ALLOWED_CALLERS = ["shared/components/media-upload/media-upload-grid.tsx"] as const;

const LAYOUTS = ["app/(shop)/layout.tsx", "app/admin/(protected)/layout.tsx"] as const;

/**
 * Les fichiers visés NOMMENT ce qui est interdit — la frontière du storefront
 * dit qu'elle remplace `withViewTransition()`, la SSOT des noms aussi. Scanner
 * le source brut ferait échouer ce test sur sa propre documentation, et le
 * « corriger » en effaçant ces commentaires détruirait l'explication. Même
 * parade que `filter-rail-immediate-apply.regression.test.ts`.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function collectSources(dir: string, acc: string[] = []): string[] {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return acc;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "__tests__" || entry === "node_modules") continue;
			collectSources(full, acc);
			continue;
		}
		if (!/\.tsx?$/.test(entry)) continue;
		if (/\.test\.tsx?$/.test(entry)) continue;
		acc.push(full);
	}
	return acc;
}

const SOURCES = SOURCE_ROOTS.flatMap((root) => collectSources(join(REPO_ROOT, root)))
	.map((file) => relative(REPO_ROOT, file))
	.sort();

describe("@regression view-transition-navigation", () => {
	it("aucune navigation n'est enveloppée dans withViewTransition", () => {
		const offenders = SOURCES.filter((file) =>
			/withViewTransition\(\(\)\s*=>\s*\n?\s*router\.(push|replace)/.test(
				stripComments(readFileSync(join(REPO_ROOT, file), "utf-8")),
			),
		);

		expect(
			offenders,
			"Le snapshot d'arrivée partirait avant le montage de la page suivante : " +
				"laisser la frontière <ViewTransition> des layouts animer la navigation.",
		).toEqual([]);
	});

	it("le helper impératif n'a plus que ses appelants autorisés", () => {
		const callers = SOURCES.filter(
			(file) =>
				file !== HELPER &&
				stripComments(readFileSync(join(REPO_ROOT, file), "utf-8")).includes("withViewTransition("),
		);

		expect(callers).toEqual([...ALLOWED_CALLERS]);
	});

	it.each(LAYOUTS)("%s pose la frontière <ViewTransition>", (layout) => {
		const source = readFileSync(join(REPO_ROOT, layout), "utf-8");

		expect(source, "L'import doit venir de `react` — Next y aliase son React canary.").toMatch(
			/import \{[^}]*\bViewTransition\b[^}]*\} from "react";/,
		);
		expect(source).toMatch(/<ViewTransition[\s\n]/);
		expect(
			source,
			"La frontière enveloppe le <main> : c'est ce qui garde le chrome net pendant la navigation.",
		).toMatch(/<ViewTransition[\s\S]*?<main[\s\S]*?<\/ViewTransition>/);
	});
});
