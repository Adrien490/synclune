/**
 * @regression not-found-call-sites-2026-08-07
 *
 * `notFound(resource, genre?)` compose une phrase : elle suffixe « non trouvé[e] »
 * au nom qu'on lui passe. Deux familles de défauts en sont sorties, toutes deux
 * livrées en production et invisibles à `tsc` (l'argument est un `string`) :
 *
 *  1. **La phrase passée en guise de nom.** `notFound("Produit non trouvé")`
 *     rendait « Produit non trouvé non trouvé », et
 *     `notFound("Une ou plusieurs collections n'existent pas")` rendait
 *     « … n'existent pas non trouvé ». Le nom doit être un GROUPE NOMINAL court,
 *     sans verbe conjugué et sans le suffixe qu'on va lui ajouter.
 *
 *  2. **L'article collé au nom.** `notFound("Le produit source")` rendait
 *     « Le produit source non trouvée » du temps de l'heuristique d'accord —
 *     le `e` final appartenait à « source ». L'article ne se compose pas avec
 *     le reste de la phrase : on ne le passe pas.
 *
 * Le genre, lui, est désormais déclaré et couvert par `responses.test.ts`. Ce
 * test-ci garde la FORME de l'argument, sur tous les call sites du dépôt.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = process.cwd();

/** `notFound("…")` ou `notFound("…", "f")` — capture le premier argument. */
const NOT_FOUND_CALL = /\bnotFound\(\s*"([^"]*)"/g;

/** Articles définis/indéfinis en tête : ils ne se composent pas avec le suffixe. */
const LEADING_ARTICLE = /^(le|la|les|l'|un|une|des|du|de la)\s/i;

/** Un verbe conjugué trahit une phrase déguisée en nom. */
const CONJUGATED_VERB = /\b(est|sont|existe|existent|a|ont|peut|peuvent|n'existe)\b/i;

const MAX_WORDS = 4;

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
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
			collectSourceFiles(full, acc);
		} else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
			acc.push(full);
		}
	}
	return acc;
}

interface CallSite {
	file: string;
	resource: string;
}

const CALL_SITES: CallSite[] = ["modules", "shared", "app"]
	.flatMap((root) => collectSourceFiles(join(REPO_ROOT, root)))
	.flatMap((file) => {
		const source = readFileSync(file, "utf8");
		return [...source.matchAll(NOT_FOUND_CALL)].map((match) => ({
			file: relative(REPO_ROOT, file),
			resource: match[1] ?? "",
		}));
	});

describe("@regression not-found-call-sites — forme de l'argument de notFound()", () => {
	it("le scan trouve bien les call sites du dépôt", () => {
		// Sans ce plancher, un renommage du helper rendrait toutes les assertions
		// vacuellement vertes — le pire des faux verts.
		expect(CALL_SITES.length).toBeGreaterThanOrEqual(15);
	});

	it("aucun call site ne passe déjà « non trouvé » dans le nom", () => {
		const offenders = CALL_SITES.filter(({ resource }) => /non trouv/i.test(resource)).map(
			({ file, resource }) => `${file} → notFound("${resource}")`,
		);

		expect(
			offenders,
			"`notFound()` ajoute déjà « non trouvé[e] » : le passer dans le nom le double.",
		).toEqual([]);
	});

	it("aucun call site ne passe une phrase (verbe conjugué ou nom trop long)", () => {
		const offenders = CALL_SITES.filter(
			({ resource }) =>
				CONJUGATED_VERB.test(resource) || resource.trim().split(/\s+/).length > MAX_WORDS,
		).map(({ file, resource }) => `${file} → notFound("${resource}")`);

		expect(
			offenders,
			`\`notFound()\` attend un groupe nominal court (≤ ${MAX_WORDS} mots, sans verbe). Pour un message hors gabarit — un pluriel, une explication — construire l'ActionState à la main : \`{ status: ActionStatus.NOT_FOUND, message: "…" }\`, comme le font déjà les actions \`orders/\`.`,
		).toEqual([]);
	});

	it("aucun call site ne colle un article au nom", () => {
		const offenders = CALL_SITES.filter(({ resource }) => LEADING_ARTICLE.test(resource)).map(
			({ file, resource }) => `${file} → notFound("${resource}")`,
		);

		expect(
			offenders,
			"L'article ne se compose pas avec le suffixe : passer « Produit », pas « Le produit ».",
		).toEqual([]);
	});

	describe("garde-fous du garde-fou", () => {
		it("les détecteurs attrapent bien les défauts historiques", () => {
			expect(/non trouv/i.test("Produit non trouvé")).toBe(true);
			expect(CONJUGATED_VERB.test("Une ou plusieurs collections n'existent pas")).toBe(true);
			expect("Une ou plusieurs collections n'existent pas".split(/\s+/).length).toBeGreaterThan(
				MAX_WORDS,
			);
			expect(LEADING_ARTICLE.test("Le produit source")).toBe(true);
		});

		it("les détecteurs laissent passer les noms légitimes", () => {
			for (const ok of ["Produit", "Produit source", "Collection", "Variante de produit"]) {
				expect(/non trouv/i.test(ok), ok).toBe(false);
				expect(CONJUGATED_VERB.test(ok), ok).toBe(false);
				expect(LEADING_ARTICLE.test(ok), ok).toBe(false);
				expect(ok.split(/\s+/).length, ok).toBeLessThanOrEqual(MAX_WORDS);
			}
		});
	});
});
