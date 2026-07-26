/**
 * @regression cursor-accepts-real-ids
 *
 * Audit « Admin commandes » 2026-07-26 (P0-1). `cursorSchema` imposait
 * `.length(25)` — la longueur d'un cuid **v1**, qui n'est généré nulle part dans ce
 * dépôt. Les curseurs réels valent 24 caractères (Prisma `@default(cuid(2))`) ou 32
 * (Better Auth `generateId()`), donc tous étaient rejetés : la validation retombait
 * sur `undefined` et le serveur renvoyait silencieusement la première page. « Page
 * suivante » était un no-op sur les 11 listes admin et les listes boutique.
 *
 * Le test unitaire d'origine verrouillait le bug (fixture `"a".repeat(25)` intitulée
 * « must be 25-char CUID »). Ce garde-fou-ci ne code donc AUCUNE longueur en dur : il
 * dérive les formats attendus des générateurs eux-mêmes —
 *   - `prisma/schema.prisma` pour les modèles applicatifs,
 *   - la signature de `generateId()` de Better Auth pour Session/Account/Verification,
 * afin qu'un changement de générateur casse ce test au lieu de casser la pagination
 * en silence.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

import { cursorSchema } from "../pagination-schema";

const SCHEMA_PRISMA = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf-8");

/** Longueur d'id produite par chaque générateur d'`@id` connu. */
const ID_GENERATORS = {
	// cuid2 : le runtime Prisma 7 embarque cuid2 avec defaultLength = 24
	"cuid(2)": { length: 24, alphabet: "abcdefghijklmnopqrstuvwxyz0123456789" },
	// cuid v1 (legacy, plus utilisé au schéma mais des lignes peuvent survivre)
	"cuid()": { length: 25, alphabet: "abcdefghijklmnopqrstuvwxyz0123456789" },
	// uuid() : 36 chars avec tirets — NON supporté comme curseur (cf. test dédié)
	"uuid()": { length: 36, alphabet: "abcdef0123456789-" },
} as const;

function sample(length: number, alphabet: string): string {
	// Déterministe : pas de Math.random (reproductibilité + interdit dans ce dépôt)
	return Array.from({ length }, (_, i) => alphabet[i % alphabet.length]).join("");
}

describe("@regression cursor-accepts-real-ids", () => {
	it("accepte tous les ids produits par les générateurs @id déclarés au schéma Prisma", () => {
		const declared = [...SCHEMA_PRISMA.matchAll(/@id[^\n]*@default\(([a-z0-9()]+)\)/g)].map(
			(m) => m[1]!,
		);

		expect(declared.length).toBeGreaterThan(0);

		const unknown = [...new Set(declared)].filter((g) => !(g in ID_GENERATORS));
		expect(
			unknown,
			`Générateur d'@id inconnu au schéma : ${unknown.join(", ")}. Ajoute-le à ID_GENERATORS ` +
				`et vérifie que cursorSchema accepte sa longueur — sinon la pagination casse en silence.`,
		).toEqual([]);

		for (const generator of new Set(declared)) {
			const { length, alphabet } = ID_GENERATORS[generator as keyof typeof ID_GENERATORS];
			const id = sample(length, alphabet);
			expect(
				cursorSchema.safeParse(id).success,
				`cursorSchema rejette un id ${generator} (${length} chars) : la pagination des listes ` +
					`utilisant ce modèle serait un no-op silencieux.`,
			).toBe(true);
		}
	});

	it("accepte un id Better Auth (Session / Account / Verification)", () => {
		// Ces 3 modèles ont `@id` SANS @default : l'id vient de Better Auth
		// `generateId()` → createRandomStringGenerator("a-z","A-Z","0-9")(32).
		// Ils sont paginés par session.schemas.ts / accounts.schemas.ts / verification.schemas.ts.
		const withoutDefault = [...SCHEMA_PRISMA.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)]
			.filter(([, , body]) => /^\s*id\s+String\s+@id\s*$/m.test(body!))
			.map(([, name]) => name!);

		expect(withoutDefault.sort()).toEqual(["Account", "Session", "Verification"]);

		const betterAuthId = sample(
			32,
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
		);
		expect(
			cursorSchema.safeParse(betterAuthId).success,
			"cursorSchema rejette un id Better Auth (32 chars, casse mixte) : la pagination des " +
				"listes sessions/comptes/vérifications serait un no-op silencieux.",
		).toBe(true);
	});

	it("rejette toujours les charges utiles qui ne sont pas des ids", () => {
		for (const bad of ["", "short", "a".repeat(41), "../../etc/passwd", "' OR 1=1 --"]) {
			expect(cursorSchema.safeParse(bad).success).toBe(false);
		}
	});
});
