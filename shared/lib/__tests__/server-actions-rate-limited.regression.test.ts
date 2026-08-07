/**
 * @regression server-actions-rate-limited-2026-07-31
 *
 * Tout fichier `"use server"` doit appliquer un rate limit, ou figurer dans
 * l'allowlist ci-dessous avec sa raison.
 *
 * Pourquoi un scan et pas une revue : `"use server"` publie un **endpoint RPC**
 * atteignable sans passer par l'UI. Trois d'entre eux vivaient sans aucun plafond
 * — `logout` (une écriture DB `auth.api.signOut()` par appel, non authentifiée),
 * `setFabVisibility` et `toggleFabVisibility` (écriture de cookie illimitée) — et
 * aucun outil ne les signalait : knip considère `"use server"` comme un point
 * d'entrée, donc une action non appelée n'est jamais « morte ».
 *
 * Cousin de `update-tag-server-action-only.regression.test.ts` et de
 * `no-raw-session-role-trust.regression.test.ts`, même idiome de scan de sources.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = process.cwd();

/** Helpers dont l'appel vaut « cette action est plafonnée ». */
const RATE_LIMIT_CALLS = [
	"enforceRateLimit",
	"enforceRateLimitForCurrentUser",
	"checkRateLimit",
	"checkCartRateLimit",
];

/**
 * Fichiers `"use server"` sans rate limit propre, et pourquoi c'est acceptable.
 *
 * ⚠️ Toute nouvelle entrée exige une justification écrite. « L'action est admin »
 * n'en est PAS une à elle seule : `requireAdmin()` borne QUI appelle, pas COMBIEN
 * de fois — c'est bien pour ça que les ~85 autres actions admin du repo sont
 * plafonnées.
 */
const ALLOWLIST: Record<string, string> = {
	"modules/products/data/get-product-collections.ts":
		"Lectures admin (`isAdmin()`), sans effet de bord ni envoi : le coût est une requête " +
		"indexée. Documenté plutôt que plafonné pour ne pas gêner les formulaires produit.",
};

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
		} else if (
			(entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
			!entry.endsWith(".test.ts") &&
			!entry.endsWith(".test.tsx")
		) {
			acc.push(full);
		}
	}
	return acc;
}

/**
 * Retire les commentaires AVANT de chercher la directive.
 *
 * Indispensable : `shared/lib/cache.ts` et `modules/skus/data/get-skus-list.ts`
 * évoquent tous deux `"use server"` en JSDoc (le second pour expliquer qu'il n'en
 * porte justement PAS). Un `grep` naïf les compte comme Server Actions et les fait
 * atterrir dans l'allowlist — c'est-à-dire qu'on documente une exception pour un
 * fichier qui n'a jamais eu besoin d'en être une.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** `"use server"` en tête de fichier — la directive qui publie l'endpoint RPC. */
function hasUseServerDirective(source: string): boolean {
	return /^\s*["']use server["'];/m.test(stripComments(source));
}

function collectAllSourceFiles(): string[] {
	const files: string[] = [];
	for (const root of ["modules", "shared", "app"]) {
		collectSourceFiles(join(REPO_ROOT, root), files);
	}
	return files.map((full) => relative(REPO_ROOT, full)).sort();
}

const ALL_SOURCE_FILES = collectAllSourceFiles();

const SERVER_ACTION_FILES = ALL_SOURCE_FILES.filter((rel) =>
	hasUseServerDirective(readFileSync(join(REPO_ROOT, rel), "utf8")),
);

describe("Server Actions — couverture rate limit", () => {
	// Garde-fou du garde-fou : un renommage de dossier racine ou une regex cassée
	// rendrait le scan silencieusement vide, et l'assertion principale passerait
	// sur un ensemble nul — le pire des faux verts.
	it("le scan trouve bien les Server Actions du repo", () => {
		// Plancher 100 → 90 au retrait des codes promo (2026-08-05) :
		// `modules/discounts` portait 10 Server Actions.
		// Plancher 90 → 85 au retrait des 4 actions sans déclencheur UI (audit
		// schéma V4, 2026-08-05) : 96 → 92 fichiers, la marge tombait à 2 — assez
		// pour que le prochain retrait légitime fasse rougir ce garde-fou, qui n'a
		// rien à dire sur le sujet.
		expect(SERVER_ACTION_FILES.length).toBeGreaterThan(85);
	});

	// Next autorise aussi `"use server"` DANS un corps de fonction, ce que le scan
	// ci-dessus (directive en tête de fichier) ne verrait pas. Le repo n'en utilise
	// aucun aujourd'hui ; si cela change, il faudra étendre la détection plutôt que
	// laisser ces endpoints hors du filet.
	it("aucune directive `use server` inline (non couverte par le scan)", () => {
		const inline = ALL_SOURCE_FILES.filter((rel) => {
			const src = stripComments(readFileSync(join(REPO_ROOT, rel), "utf8"));
			return !/^\s*["']use server["'];/m.test(src) && /["']use server["'];/.test(src);
		});

		expect(inline).toEqual([]);
	});

	it("chaque fichier `use server` applique un rate limit, ou est allowlisté", () => {
		const nonProteges = SERVER_ACTION_FILES.filter((rel) => {
			if (rel in ALLOWLIST) return false;
			// ⚠️ `stripComments` AVANT le `includes` : la version d'origine cherchait dans
			// la source BRUTE, donc une simple MENTION de `checkRateLimit` en JSDoc
			// suffisait à déclarer un fichier plafonné. Le même piège que celui déjà
			// documenté au-dessus pour la détection de la directive — `shared/lib/cache.ts`
			// et `modules/skus/data/get-skus-list.ts` en parlent tous deux en prose —,
			// mais du côté de l'assertion PRINCIPALE, là où il vaut un faux vert.
			const src = stripComments(readFileSync(join(REPO_ROOT, rel), "utf8"));
			return !RATE_LIMIT_CALLS.some((call) => src.includes(call));
		});

		expect(nonProteges).toEqual([]);
	});

	it("une mention en commentaire ne vaut PAS un rate limit", () => {
		// Garde-fou du garde-fou, prouvé sur une source synthétique : sans le
		// `stripComments` ci-dessus, ce fichier passerait pour plafonné.
		const faussementProtege = `"use server";
			/** Cette action n'appelle PAS checkRateLimit — voir l'allowlist. */
			export async function danger(id: string) { return id; }`;

		const stripped = stripComments(faussementProtege);
		expect(RATE_LIMIT_CALLS.some((call) => stripped.includes(call))).toBe(false);
		expect(RATE_LIMIT_CALLS.some((call) => faussementProtege.includes(call))).toBe(true);
	});

	it("l'allowlist ne contient aucune entrée périmée", () => {
		// Un fichier supprimé ou renommé qui resterait listé ferait passer en silence
		// un futur homonyme non plafonné.
		const perimees = Object.keys(ALLOWLIST).filter((rel) => !SERVER_ACTION_FILES.includes(rel));
		expect(perimees).toEqual([]);
	});

	it("chaque entrée d'allowlist porte une justification substantielle", () => {
		const sansRaison = Object.entries(ALLOWLIST)
			.filter(([, reason]) => reason.trim().length < 40)
			.map(([rel]) => rel);

		expect(sansRaison).toEqual([]);
	});
});
