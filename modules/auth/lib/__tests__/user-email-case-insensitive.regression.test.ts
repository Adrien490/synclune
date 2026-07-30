import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	normalizeUserEmailOnCreate,
	normalizeUserEmailOnUpdate,
} from "../normalize-user-email-hooks";

/**
 * @regression user-email-case-insensitive
 *
 * Verrouille la normalisation de `User.email` et son unicité insensible à la casse.
 *
 * Défaut d'origine (audit schéma 2026-07-30) : `email @unique` est un index Postgres
 * SENSIBLE À LA CASSE, et trois chemins écrivaient la colonne — inscription
 * email/mot de passe, profil Google (`accountLinking` / `trustedProviders`), et
 * `changeEmail` — dont un seul passait par le `.toLowerCase()` de `emailSchema`.
 *
 * Le coût n'était pas le doublon de compte mais un GARDE DE SÉCURITÉ défait : le hook
 * `hooks.before` sur `/sign-in/email` minuscule l'email soumis puis interroge la
 * colonne en comparaison EXACTE pour bloquer les comptes suspendus / anonymisés /
 * supprimés. Une ligne stockée en casse mixte ne matchait pas, et le compte révoqué
 * se reconnectait — sans erreur, sans trace.
 *
 * Le schéma contredisait ici sa propre doctrine (CLAUDE.md, à propos des filtres de
 * visibilité) : « la discipline de l'appelant n'est pas un mécanisme de sécurité ».
 * D'où deux gardes en base et non un seul :
 *   - `User_email_lowercase` (CHECK) — la valeur STOCKÉE est normalisée, ce qui rend
 *     fiable toute comparaison exacte ;
 *   - `User_email_lower_key` (UNIQUE sur lower(email)) — deux comptes ne peuvent plus
 *     différer par la seule casse.
 *
 * L'ordre de mise en place est structurant : les hooks d'abord, le CHECK ensuite.
 * Poser le CHECK sans normaliser à l'écriture ferait échouer EN DUR l'inscription d'un
 * utilisateur dont le fournisseur OAuth renvoie une casse mixte.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const rawGuards = readFileSync(join(REPO_ROOT, "prisma", "sql", "raw-guards.sql"), "utf-8");
const authSrc = readFileSync(join(REPO_ROOT, "modules", "auth", "lib", "auth.ts"), "utf-8");

describe("normalisation à l'écriture (databaseHooks)", () => {
	it("minuscule et trim un email à la création (inscription, OAuth, admin)", () => {
		expect(normalizeUserEmailOnCreate({ email: "Alice@Example.COM" })).toEqual({
			data: { email: "alice@example.com" },
		});
		expect(normalizeUserEmailOnCreate({ email: "  bob@example.com \t" })).toEqual({
			data: { email: "bob@example.com" },
		});
	});

	it("normalise aussi un changement d'email (changeEmail est activé)", () => {
		expect(normalizeUserEmailOnUpdate({ email: "New.Address@Example.FR" })).toEqual({
			data: { email: "new.address@example.fr" },
		});
	});

	it("ne touche pas un payload d'update sans email", () => {
		// `changeEmail` n'est qu'un cas d'update parmi d'autres (emailVerified, image,
		// accountStatus…) : renvoyer `{ data: { email: undefined } }` écraserait la
		// colonne, donc l'absence de retour est le comportement correct.
		expect(normalizeUserEmailOnUpdate({})).toBeUndefined();
		expect(normalizeUserEmailOnUpdate({ email: undefined })).toBeUndefined();
		expect(normalizeUserEmailOnCreate({ email: null })).toBeUndefined();
	});

	it("ne renvoie rien quand l'email est déjà normalisé (pas d'écriture inutile)", () => {
		expect(normalizeUserEmailOnCreate({ email: "alice@example.com" })).toBeUndefined();
		expect(normalizeUserEmailOnUpdate({ email: "alice@example.com" })).toBeUndefined();
	});

	it("les deux hooks sont réellement branchés sur l'adaptateur Better Auth", () => {
		// Un hook parfaitement testé mais non câblé est le mode d'échec récurrent de ce
		// repo. `auth.ts` n'est pas chargeable en test (toute la config Better Auth) :
		// on assert donc sur la source.
		//
		// ⚠️ L'assertion porte sur le BLOC `databaseHooks`, pas sur le fichier entier :
		// un `toContain` global était vert alors que j'avais débranché le call site,
		// parce que la ligne d'`import` contenait encore les deux noms.
		const start = authSrc.indexOf("databaseHooks:");
		expect(start).toBeGreaterThan(-1);
		const hooksBlock = authSrc.slice(start, authSrc.indexOf("plugins:", start));
		expect(hooksBlock).toMatch(/create:\s*{\s*before:.*normalizeUserEmailOnCreate\(/s);
		expect(hooksBlock).toMatch(/update:\s*{\s*before:.*normalizeUserEmailOnUpdate\(/s);
	});

	it("le garde de compte révoqué normalise via la SSOT, pas un toLowerCase local", () => {
		// C'est LE couplage sensible : ce garde compare la colonne en exact. S'il
		// normalisait autrement que l'écriture, la divergence rouvrirait le trou.
		const signInGuard = authSrc.slice(authSrc.indexOf('path === "/sign-in/email"'));
		const guardBody = signInGuard.slice(0, signInGuard.indexOf("blockedUser"));
		expect(guardBody).toContain("normalizeEmail(");
		expect(guardBody).not.toMatch(/\.toLowerCase\(\)/);
	});
});

describe("gardes DB (SSOT raw-guards.sql)", () => {
	it("le CHECK de normalisation est déclaré et idempotent", () => {
		expect(rawGuards).toContain(
			'ADD CONSTRAINT "User_email_lowercase" CHECK ("email" = lower("email"))',
		);
		expect(rawGuards).toContain('DROP CONSTRAINT IF EXISTS "User_email_lowercase"');
	});

	it("l'unicité insensible à la casse est un index d'EXPRESSION unique", () => {
		// `lower(email)` et non `email` : c'est toute la différence avec le `@unique`
		// Prisma, qui ne couvre que l'égalité binaire.
		expect(rawGuards).toContain(
			'CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower("email"))',
		);
		expect(rawGuards).toContain('DROP INDEX IF EXISTS "User_email_lower_key"');
	});

	it("les deux gardes arrivent avec leur migration (bases existantes)", () => {
		// La SSOT n'est PAS appliquée aux bases déjà déployées : sans migration, la
		// prod resterait vulnérable pendant que le test, lui, serait vert.
		const migration = readFileSync(
			join(
				REPO_ROOT,
				"prisma",
				"migrations",
				"20260730110000_add_user_email_case_insensitive_unique",
				"migration.sql",
			),
			"utf-8",
		);
		expect(migration).toContain('CREATE UNIQUE INDEX "User_email_lower_key"');
		expect(migration).toContain('ADD CONSTRAINT "User_email_lowercase"');
		// Le UPDATE de normalisation doit précéder les deux gardes, sinon la migration
		// échoue sur une base contenant une ligne en casse mixte.
		expect(migration.indexOf('UPDATE "User" SET "email" = lower("email")')).toBeLessThan(
			migration.indexOf('CREATE UNIQUE INDEX "User_email_lower_key"'),
		);
	});
});
