import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * @regression DISC-USAGE-002
 *
 * Tout chemin de libération d'un usage promo doit passer par
 * `releaseOrderDiscountUsageTx`, dont le décrément est gardé par
 * `usageCount > 0`.
 *
 * Bug d'origine : 4 chemins (annulation admin, annulation client, annulation en
 * lot, cron `cleanup-pending-orders`) décrémentaient `Discount.usageCount` avec
 * un `update`/`updateMany` direct, sans borne basse. La DB n'avait qu'une borne
 * HAUTE (`Discount_usageCount_within_limit`). Combiné à `resetDiscountCounter`
 * (remet le compteur à 0 en CONSERVANT l'historique `DiscountUsage`),
 * l'annulation d'une commande antérieure faisait passer `usageCount` en négatif
 * → le code devenait redeemable AU-DELÀ de `maxUsageCount`, chaque annulation
 * creusant l'écart.
 *
 * Ce test est un garde-fou STATIQUE : il interdit tout décrément relatif de
 * `usageCount` écrit hors du service canonique. La borne basse en DB
 * (`Discount_usageCount_non_negative`) est le second filet.
 *
 * Toute modification de ce fichier requiert une review explicite.
 */

const REPO_ROOT = process.cwd();

/** Seul fichier autorisé à décrémenter `usageCount`. */
const CANONICAL_RELEASE_SERVICE =
	"modules/discounts/services/release-order-discount-usage.service.ts";

/**
 * Allowlist. `order-creation.service.ts` INCRÉMENTE via un `$executeRaw`
 * conditionnel (`WHERE usageCount < maxUsageCount`) — compteur qui monte, hors
 * périmètre. `reset-discount-counter.ts` pose une valeur ABSOLUE (0), pas un
 * décrément relatif : aucun risque de passage sous zéro.
 */
const ALLOWLIST = new Set<string>([
	CANONICAL_RELEASE_SERVICE,
	"modules/payments/services/order-creation.service.ts",
	"modules/discounts/actions/reset-discount-counter.ts",
	"prisma/seed.ts",
]);

const SCAN_DIRS = ["modules", "app", "shared", "prisma"];

function walkTs(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (
			entry === "node_modules" ||
			entry === ".next" ||
			entry === "dist" ||
			entry === "generated" ||
			entry === "migrations" ||
			entry.startsWith(".")
		) {
			continue;
		}
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			walkTs(full, out);
		} else if (
			(entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
			!entry.endsWith(".test.ts") &&
			!entry.endsWith(".test.tsx") &&
			!entry.endsWith(".d.ts") &&
			!full.includes("/__tests__/") &&
			!full.includes("/__mocks__/")
		) {
			out.push(full);
		}
	}
	return out;
}

function sourceFiles(): string[] {
	const files: string[] = [];
	for (const dir of SCAN_DIRS) {
		const abs = join(REPO_ROOT, dir);
		try {
			if (statSync(abs).isDirectory()) walkTs(abs, files);
		} catch {
			// Répertoire absent — rien à scanner.
		}
	}
	return files;
}

describe("@regression DISC-USAGE-002 — usageCount jamais décrémenté hors du service canonique", () => {
	it("aucun fichier hors allowlist ne décrémente Discount.usageCount", () => {
		const offenders: string[] = [];

		for (const absPath of sourceFiles()) {
			const relPath = relative(REPO_ROOT, absPath);
			if (ALLOWLIST.has(relPath)) continue;

			const source = readFileSync(absPath, "utf8");
			if (!source.includes("usageCount")) continue;

			// Pattern Prisma du décrément relatif, tolérant au formatage Prettier
			// (propriété et objet possiblement sur plusieurs lignes).
			if (/usageCount\s*:\s*\{\s*decrement\s*:/.test(source.replace(/\s+/g, " "))) {
				offenders.push(relPath);
			}
		}

		expect(
			offenders,
			"Ces fichiers décrémentent Discount.usageCount à la main. Utiliser " +
				"releaseOrderDiscountUsageTx (décrément gardé par usageCount > 0) — sinon " +
				"le compteur peut passer négatif et le code promo devient redeemable " +
				"au-delà de maxUsageCount.",
		).toEqual([]);
	});

	it("le service canonique garde bien son décrément par usageCount > 0", () => {
		const source = readFileSync(join(REPO_ROOT, CANONICAL_RELEASE_SERVICE), "utf8").replace(
			/\s+/g,
			" ",
		);

		expect(source).toMatch(/usageCount\s*:\s*\{\s*gt\s*:\s*0\s*\}/);
		expect(source).toMatch(/usageCount\s*:\s*\{\s*decrement\s*:\s*1\s*\}/);
	});

	it("la borne basse DB existe dans une migration", () => {
		const migrationsRoot = join(REPO_ROOT, "prisma/migrations");
		const found = readdirSync(migrationsRoot).some((entry) => {
			const file = join(migrationsRoot, entry, "migration.sql");
			try {
				return readFileSync(file, "utf8").includes("Discount_usageCount_non_negative");
			} catch {
				return false;
			}
		});

		expect(found).toBe(true);
	});
});
