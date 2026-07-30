/**
 * @regression prisma-config-optional-env
 *
 * `prisma.config.ts` est chargé par TOUTES les commandes Prisma — dont
 * `prisma generate`, qui ouvre `pnpm build`. Le helper `env()` de `prisma/config` est
 * STRICT : sur une variable absente il lève
 * `PrismaConfigEnvError: Cannot resolve environment variable`, et la commande échoue
 * avant même de lire le schéma.
 *
 * Conséquence si une variable OPTIONNELLE est lue via `env()` : le build casse sur
 * toute machine et tout CI qui ne la définissent pas. L'échec ne ressemble pas à un
 * problème de config — il ressemble à un schéma invalide. Rencontré en direct pendant
 * l'audit schéma 2026-07-30 en ajoutant `shadowDatabaseUrl`.
 *
 * Règle : une variable requise passe par `env("X")` ; une variable optionnelle passe
 * par un spread conditionnel sur `process.env.X`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");
const configSrc = readFileSync(join(REPO_ROOT, "prisma.config.ts"), "utf-8");
const envSchemaSrc = readFileSync(join(REPO_ROOT, "shared", "schemas", "env.schema.ts"), "utf-8");

/**
 * Retire commentaires de bloc et de ligne. Indispensable : ce fichier DOCUMENTE le
 * piège en citant `env("SHADOW_DATABASE_URL")` en prose, et sans ce nettoyage le test
 * était rouge sur le code correct — il accusait son propre commentaire d'avertissement.
 */
function stripComments(src: string): string {
	return src
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.split("\n")
		.map((l) => l.replace(/\/\/.*$/, ""))
		.join("\n");
}

/** Variables lues par prisma.config.ts via le helper strict `env()` (hors commentaires). */
function strictEnvReads(src: string): string[] {
	return Array.from(stripComments(src).matchAll(/\benv\(\s*"([A-Z0-9_]+)"\s*\)/g), (m) => m[1]!);
}

/** Variables déclarées `.optional()` dans le schéma d'env (SSOT). */
function optionalEnvVars(src: string): Set<string> {
	const out = new Set<string>();
	for (const line of src.split("\n")) {
		const m = line.match(/^\s*([A-Z0-9_]+):\s*z\..*\.optional\(\)/);
		if (m) out.add(m[1]!);
	}
	return out;
}

describe("prisma.config.ts — lecture d'environnement", () => {
	it("aucune variable optionnelle n'est lue via le helper strict env()", () => {
		const optional = optionalEnvVars(envSchemaSrc);
		// Sanity : sans ça l'assertion suivante passerait à vide si le parser cassait.
		expect(optional.size).toBeGreaterThan(0);
		expect(optional.has("SHADOW_DATABASE_URL")).toBe(true);

		const strict = strictEnvReads(configSrc);
		const offenders = strict.filter((name) => optional.has(name));
		expect(
			offenders,
			`Ces variables sont \`.optional()\` dans shared/schemas/env.schema.ts mais lues ` +
				`via \`env()\` dans prisma.config.ts :\n  ${offenders.join("\n  ")}\n\n` +
				`\`env()\` lève PrismaConfigEnvError quand la variable est absente, et ce ` +
				`fichier est chargé par \`prisma generate\` — donc par \`pnpm build\`. ` +
				`Utiliser un spread conditionnel :\n` +
				`  ...(process.env.X ? { champ: process.env.X } : {})`,
		).toEqual([]);
	});

	it("DATABASE_URL, elle, reste lue via env() (requise, échec explicite voulu)", () => {
		expect(strictEnvReads(configSrc)).toContain("DATABASE_URL");
	});

	it("shadowDatabaseUrl est bien déclaré (workflow `migrate dev`)", () => {
		// Son absence est la cause racine documentée de l'historique non rejouable :
		// `migrate dev` échoue en P3006 contre un endpoint Neon poolé, ce qui a fait
		// écrire les migrations à la main via `db execute` + `migrate resolve --applied`.
		expect(configSrc).toContain("shadowDatabaseUrl");
	});
});
