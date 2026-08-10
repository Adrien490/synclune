/**
 * @regression omnibus-no-unreferenced-discount
 *
 * **Aucune surface CLIENT ne rend d'annonce de réduction de prix** — ni prix
 * barré (`line-through`), ni lecture de `compareAtPrice` — tant que rien en
 * base ne trace le prix le plus bas des 30 derniers jours.
 *
 * Art. L. 112-1-1 C. conso (directive Omnibus) : toute annonce de réduction
 * doit référencer le prix LE PLUS BAS pratiqué dans les 30 jours précédents.
 * `ProductSku.compareAtPrice` est une valeur libre saisie par l'admin, sans
 * historique — l'afficher barré avec une pastille « -X % » est une annonce de
 * réduction sans référence, sanctionnable (audit 2026-08-08 : 8 surfaces la
 * rendaient — carte produit, PDP, barre collante, quick-search, panier…).
 *
 * ## Ce qui rouvre l'affichage (lot A2, déclenché par la première promo réelle)
 *
 * 1. Une table `SkuPriceHistory` + un plancher dénormalisé `lowestPriceLast30d`
 *    alimentés par TOUS les écrivains de prix, laissés se peupler 30 jours ;
 * 2. un affichage écrêté `min(compareAtPrice, lowestPriceLast30d)` accompagné
 *    de la mention du prix de référence.
 * La réouverture étend alors les allowlists ci-dessous, site par site, avec le
 * motif écrit — jamais en supprimant ce test.
 *
 * ## Portée
 *
 * Surfaces CLIENT uniquement. L'admin est exclu du scan : `compareAtPrice` y
 * est un champ ÉDITÉ (formulaires SKU, cartes de pricing), pas une annonce
 * faite à un consommateur — et ce sont ces écrans qui prépareront A2.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const SCAN_DIRS = ["app", "modules", "shared"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__tests__", "__snapshots__"]);

/**
 * `line-through` autorisés, avec motif. Un ajout sans motif écrit est un refus
 * de review.
 */
const LINE_THROUGH_ALLOWLIST = new Map<string, string>([
	[
		"modules/cart/components/cart-price-change-alert.tsx",
		"Correction factuelle du prix témoin du cookie vers le prix courant en base " +
			"(qui peut monter comme descendre) — une information de changement de prix, " +
			"pas une annonce de réduction au sens de l'art. L. 112-1-1.",
	],
]);

/** Lectures de `compareAtPrice` autorisées côté client. Vide par construction. */
const COMPARE_AT_PRICE_ALLOWLIST = new Map<string, string>([]);

function isAdminPath(relPath: string): boolean {
	return relPath.split(sep).includes("admin");
}

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (entry.endsWith(".tsx")) out.push(full);
	}
	return out;
}

/** Neutralise les commentaires sans changer le nombre de lignes. */
function stripComments(source: string): string {
	return source
		.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, (match) => "\n".repeat((match.match(/\n/g) ?? []).length))
		.replace(/^[ \t]*\/\/.*$/gm, "");
}

function clientComponentFiles(): Array<{ relPath: string; source: string }> {
	return SCAN_DIRS.flatMap((dir) => walk(join(REPO_ROOT, dir)))
		.map((full) => relative(REPO_ROOT, full))
		.filter((relPath) => !isAdminPath(relPath))
		.map((relPath) => ({
			relPath,
			source: stripComments(readFileSync(join(REPO_ROOT, relPath), "utf8")),
		}));
}

describe("@regression omnibus-no-unreferenced-discount", () => {
	const files = clientComponentFiles();

	it("aucune surface client ne rend de prix barré hors allowlist motivée", () => {
		const offenders = files
			.filter(({ source }) => source.includes("line-through"))
			.map(({ relPath }) => relPath)
			.filter((relPath) => !LINE_THROUGH_ALLOWLIST.has(relPath));

		expect(
			offenders,
			"Un prix barré côté client est une annonce de réduction : sans référence " +
				"au prix le plus bas 30 j (art. L. 112-1-1), il ne doit pas exister. " +
				"Cf. le JSDoc de ce test pour les conditions de réouverture (lot A2).",
		).toEqual([]);
	});

	it("aucune surface client ne lit compareAtPrice hors allowlist motivée", () => {
		const offenders = files
			.filter(({ source }) => source.includes("compareAtPrice"))
			.map(({ relPath }) => relPath)
			.filter((relPath) => !COMPARE_AT_PRICE_ALLOWLIST.has(relPath));

		expect(
			offenders,
			"`compareAtPrice` est une valeur libre sans historique : toute dérivation " +
				"client (barré, -X %, économies) est une annonce de réduction sans référence.",
		).toEqual([]);
	});

	it("les entrées d'allowlist pointent des fichiers existants (pas de fossiles)", () => {
		const known = new Set(files.map(({ relPath }) => relPath));
		const fossils = [...LINE_THROUGH_ALLOWLIST.keys(), ...COMPARE_AT_PRICE_ALLOWLIST.keys()].filter(
			(relPath) => !known.has(relPath),
		);

		expect(fossils, "retirer les entrées d'allowlist des fichiers supprimés").toEqual([]);
	});
});
