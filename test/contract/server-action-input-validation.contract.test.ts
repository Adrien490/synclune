/**
 * @regression server-action-input-validation
 *
 * Toute Server Action qui reçoit un argument doit le VALIDER, pas se contenter de
 * l'annoter.
 *
 * ⚠️ Un fichier `"use server"` transforme **chacun de ses exports** en endpoint RPC
 * appelable directement, avec des arguments arbitraires. Le type TypeScript du
 * paramètre est effacé à l'exécution : `key: FabKey`, `paymentIntentId: string` ou
 * `productId: string` ne garantissent rien.
 *
 * L'audit « Validation Zod » du 2026-07-31 a trouvé quatre occurrences de ce motif,
 * dont une sans aucune garde du tout (`toggleFabVisibility` : ni Zod, ni auth, ni
 * rate limit — le nom du cookie écrit dérivait d'un argument non validé). Le piège
 * récurrent : un wrapper valide correctement puis délègue à un helper **exporté
 * depuis un autre fichier `"use server"`**, qui reste donc exposé séparément. Valider
 * dans le wrapper ne protège pas le wrappé.
 *
 * ── Règle ────────────────────────────────────────────────────────────────────────
 * Un fichier `"use server"` dont un export déclare au moins un paramètre CONSOMMÉ
 * (nom sans préfixe `_`) doit contenir un point de validation : `validateInput`,
 * `.safeParse(`, `.parse(` ou `validateFormData`.
 *
 * Une exception s'ajoute à `EXEMPTIONS` **avec sa raison** — jamais en silence.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();

const VALIDATION_MARKERS = [
	/\bvalidateInput\s*\(/,
	/\.safeParse\s*\(/,
	/\.parse\s*\(/,
	/\bvalidateFormData\s*\(/,
];

/**
 * Fichiers `"use server"` autorisés à consommer un argument sans le parser.
 * Chaque entrée porte sa raison — une exemption non motivée est un oubli déguisé.
 */
const EXEMPTIONS: Record<string, string> = {
	// Délègue le code brut à `validateDiscountCode`, qui fait le `safeParse` (le code
	// n'est jamais utilisé avant). Test de vérité seul ici.
};

/** Retire commentaires et chaînes pour ne pas détecter un marqueur cité en prose. */
function stripCommentsAndStrings(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
		.replace(/`(?:\\.|[^`\\])*`/g, "``")
		.replace(/"(?:\\.|[^"\\])*"/g, '""')
		.replace(/'(?:\\.|[^'\\])*'/g, "''");
}

/**
 * Signatures d'export d'un fichier `"use server"`, dans les DEUX formes du dépôt.
 *
 * ⚠️ La version d'origine ne matchait que `export async function`. Or les actions
 * Better Auth d'alors étaient déclarées
 * `export const signInEmail = async (…) => {…}` : elles sortaient **entièrement**
 * du contrat. Toutes validaient, mais rien ne l'imposait — et c'est précisément
 * la garantie qu'on croit avoir qui est dangereuse (cf. le `readdirSync` plat de
 * `admin-actions-require-admin.contract.test.ts`, même leçon).
 */
const EXPORT_SIGNATURES = [
	/export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)/g,
	/export\s+const\s+(\w+)\s*(?::[^=]+?)?=\s*async\s*\(([^)]*)\)/g,
];

/**
 * Paramètres consommés par un export.
 *
 * Convention du repo : un paramètre présent pour la signature `useActionState` mais
 * jamais lu est préfixé d'un `_` (`_prevState`, `_formData`). Les ~20 actions
 * `refresh-*` / `clear-*` n'ont ainsi aucun paramètre consommé et sortent du champ.
 */
function consumedParamsOf(rawParams: string): string[] {
	const params: string[] = [];
	for (const part of rawParams.split(",")) {
		const name = part.trim().split(/[:=]/)[0]?.trim();
		if (!name || name.startsWith("_") || name.startsWith("{")) continue;
		params.push(name);
	}
	return params;
}

/** Tous les paramètres consommés d'un fichier, toutes formes d'export confondues. */
function consumedParams(strippedSource: string): string[] {
	return EXPORT_SIGNATURES.flatMap((signature) =>
		[...strippedSource.matchAll(signature)].flatMap((match) => consumedParamsOf(match[2] ?? "")),
	);
}

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

/** `"use server"` en tête de fichier (avant tout import), pas une occurrence en prose. */
function hasUseServerDirective(source: string): boolean {
	return /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*["']use server["']\s*;?/.test(source);
}

const SERVER_ACTION_FILES = ["modules", "shared", "app"]
	.flatMap((root) => collectSourceFiles(join(REPO_ROOT, root)))
	.filter((file) => hasUseServerDirective(readFileSync(file, "utf8")))
	.map((file) => relative(REPO_ROOT, file));

describe("contrat · validation des entrées de Server Actions", () => {
	describe("garde-fous du garde-fou", () => {
		it("le scan trouve réellement les fichiers 'use server'", () => {
			// Sans ce plancher, un glob cassé rendrait la suite vacuellement verte.
			// Abaissé de 100 à 90 le 2026-08-05 (retrait des codes promo), puis de
			// 90 à 80 au lot 1 de la migration lean : les 7 actions Better Auth sont
			// parties, remplacées par les 2 de `modules/admin-auth`.
			expect(SERVER_ACTION_FILES.length).toBeGreaterThan(80);
		});

		it("le détecteur de paramètres distingue consommé et ignoré", () => {
			expect(
				consumedParams("export async function a(_prevState: X, formData: FormData) {}"),
			).toEqual(["formData"]);
			expect(consumedParams("export async function b(_: X, __formData?: FormData) {}")).toEqual([]);
			expect(consumedParams("export async function c() {}")).toEqual([]);
			expect(consumedParams("export async function d(data: unknown) {}")).toEqual(["data"]);
		});

		it("le détecteur voit AUSSI la forme fléchée `export const x = async (…)`", () => {
			// Plusieurs actions du repo utilisent cette forme. Sans ce cas,
			// elles sortaient du contrat sans que rien ne le signale.
			expect(
				consumedParams("export const signInEmail = async (_: X, formData: FormData) => {}"),
			).toEqual(["formData"]);
			expect(
				consumedParams("export const x: Handler = async (_prev: X, formData: FormData) => {}"),
			).toEqual(["formData"]);
			expect(consumedParams("export const y = async () => {}")).toEqual([]);
		});

		it("toute action en forme fléchée du dépôt reste visible au contrat", () => {
			// Depuis la purge Better Auth (migration lean, lot 1) le dépôt peut ne plus
			// compter AUCUNE action fléchée — le plancher ≥5 est parti avec elles. La
			// capacité du détecteur reste verrouillée par le cas synthétique ci-dessus ;
			// ici on vérifie seulement que celles qui existeraient sont bien lues.
			const arrowFormActions = SERVER_ACTION_FILES.filter((file) => {
				const stripped = stripCommentsAndStrings(readFileSync(file, "utf8"));
				return /export\s+const\s+\w+\s*(?::[^=]+?)?=\s*async\s*\(/.test(stripped);
			});

			for (const file of arrowFormActions) {
				const stripped = stripCommentsAndStrings(readFileSync(file, "utf8"));
				expect(
					consumedParams(stripped).length,
					`${file} : aucun paramètre détecté`,
				).toBeGreaterThan(0);
			}
		});

		it("le stripper neutralise un marqueur cité en commentaire", () => {
			const prose =
				"// on pourrait appeler validateInput( ici\nexport async function x(a: string) {}";
			expect(VALIDATION_MARKERS.some((m) => m.test(stripCommentsAndStrings(prose)))).toBe(false);
			const real = "export async function x(a: string) { validateInput(s, a); }";
			expect(VALIDATION_MARKERS.some((m) => m.test(stripCommentsAndStrings(real)))).toBe(true);
		});

		it("chaque exemption est motivée", () => {
			for (const [file, reason] of Object.entries(EXEMPTIONS)) {
				expect(reason.length, `Exemption sans raison : ${file}`).toBeGreaterThan(15);
				expect(SERVER_ACTION_FILES, `Exemption obsolète : ${file}`).toContain(file);
			}
		});
	});

	it("aucune Server Action ne consomme un argument sans le valider", () => {
		const offenders = SERVER_ACTION_FILES.filter((file) => {
			if (file in EXEMPTIONS) return false;

			const stripped = stripCommentsAndStrings(readFileSync(file, "utf8"));
			if (consumedParams(stripped).length === 0) return false;

			return !VALIDATION_MARKERS.some((marker) => marker.test(stripped));
		});

		expect(
			offenders,
			`Ces fichiers "use server" lisent un argument sans le parser. Le type TypeScript du paramètre ne vaut rien à une frontière RPC : ajoute un \`safeParse\`/\`validateInput\`, ou déplace le helper hors d'un module "use server" (c'est la directive qui l'expose, pas son appelant).`,
		).toEqual([]);
	});
});
