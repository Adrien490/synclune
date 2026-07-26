import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression order-history-no-customer-pii-2026-07-06
 *
 * `OrderHistory` est immuable 10 ans (Art. L123-22 C. com. — invariant 3
 * CLAUDE.md) et n'est PAS scrubé par `anonymize-user.service.ts` (audit trail
 * conservé délibérément). Toute PII CLIENT qui y entre survit donc à
 * l'effacement RGPD (Art. 17) — contrairement au nom d'un admin (staff),
 * légitime dans un audit trail comptable.
 *
 * Garde (RGPD-AUDIT P1-2) : un audit `source: HistorySource.CUSTOMER` ne doit
 * JAMAIS dériver `authorName` de l'utilisateur (`user.name`, `user.email`) —
 * `authorId` suffit à la traçabilité, `authorName` reste un libellé neutre
 * ("Client"). Bug historique : `cancel-order-customer.ts` écrivait `user.name`
 * et `request-return.ts` écrivait `user.name ?? user.email`.
 *
 * Garde étendue (audit rétention PII 10 ans 2026-07-09) : les VALEURS d'adresse
 * client ne doivent jamais entrer dans `OrderHistory.metadata` non plus. Bug
 * historique : `update-order-{shipping,billing}-address.ts` écrivaient
 * `previousAddress`/`newAddress` complètes (nom, adresse, téléphone) — PII à
 * durée illimitée dans une table immuable. Le contrat est désormais
 * `changedFields` (liste de noms de champs, sans valeur) ; le stock existant a
 * été purgé par la migration `20260709100000_scrub_order_history_address_pii`.
 */

const REPO_ROOT = process.cwd();

function walkTs(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (
			entry === "node_modules" ||
			entry === ".next" ||
			entry === "dist" ||
			entry === "generated" ||
			entry.startsWith(".")
		) {
			continue;
		}
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
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

const allSourceFiles = [
	...walkTs(join(REPO_ROOT, "modules")),
	...walkTs(join(REPO_ROOT, "app")),
	...walkTs(join(REPO_ROOT, "shared")),
];

function relPath(abs: string): string {
	return relative(REPO_ROOT, abs).replaceAll("\\", "/");
}

describe("OrderHistory — pas de PII client dans authorName (RGPD-AUDIT P1-2)", () => {
	it("audits HistorySource.CUSTOMER use a literal authorName (never derived from user)", () => {
		const offenders: string[] = [];

		for (const file of allSourceFiles) {
			const content = readFileSync(file, "utf-8");
			if (!content.includes("HistorySource.CUSTOMER")) continue;

			const lines = content.split("\n");
			for (let i = 0; i < lines.length; i++) {
				if (!lines[i]!.includes("HistorySource.CUSTOMER")) continue;
				// Fenêtre du call-site : authorName est déclaré à quelques lignes de source.
				const start = Math.max(0, i - 8);
				const window = lines.slice(start, i + 9);
				for (const line of window) {
					const match = /\bauthorName\s*:\s*(.+?)\s*,?\s*$/.exec(line);
					if (!match) continue;
					const value = match[1]!;
					if (!/^["'`]/.test(value)) {
						offenders.push(`${relPath(file)} → authorName: ${value}`);
					}
				}
			}
		}

		expect(offenders).toEqual([]);
	});

	it("no file assigns authorName from a bare `user.` reference (customer actions convention)", () => {
		// Les actions admin utilisent `adminUser.*` ou `auth.user.*` (staff — autorisé) ;
		// les actions client nomment leur variable `user` : toute dérivation directe
		// `authorName: user.name|email` est une régression P1-2.
		const pattern = /\bauthorName\s*:\s*user\.(?:name|email)\b/;
		const offenders = allSourceFiles
			.filter((f) => pattern.test(readFileSync(f, "utf-8")))
			.map(relPath);

		expect(offenders).toEqual([]);
	});

	it("no audit metadata carries address VALUES (previousAddress/newAddress forbidden)", () => {
		// Audit rétention PII 10 ans (2026-07-09) : OrderHistory.metadata est immuable
		// et jamais scrubé — une adresse client qui y entre survit sans limite de durée
		// (RGPD Art. 5.1.e). Le contrat des audits ADDRESS_UPDATED est `changedFields`
		// (noms de champs uniquement). Toute réintroduction d'un snapshot de valeurs
		// (`previousAddress:`/`newAddress:`) est une régression.
		const pattern = /\b(?:previousAddress|newAddress)\s*:/;
		const offenders = allSourceFiles
			.filter((f) => pattern.test(readFileSync(f, "utf-8")))
			.map(relPath);

		expect(offenders).toEqual([]);
	});
});
