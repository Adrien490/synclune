/**
 * @regression cron-services-have-callers — un service cron sans appelant est un filet qui n'existe pas
 *
 * ## Le défaut corrigé (audit « Admin commandes » 2026-08-01, P1-D)
 *
 * `reconcile-voided-invoices.service.ts` était complet, commenté (EINV-PDF-007)
 * et testé — et n'avait AUCUN appelant : ni entrée `vercel.json`, ni route
 * `app/api/cron/`, ni import d'une autre passe. C'était pourtant le seul filet
 * contre « commande CANCELLED/REFUNDED avec facture restée GENERATED sans que
 * voidInvoice ait jamais été invoqué » (webhook charge.refunded perdu) : la
 * Passe 3 de `reconcile-invoices` ne sélectionne que les candidats
 * `invoiceRetryDeferred`, flag posé uniquement quand voidInvoice a été TENTÉ.
 * Non-conformité Art. 272-I CGI silencieuse, pendant que le test unitaire du
 * service donnait une fausse assurance.
 *
 * ## L'invariant
 *
 * Toute fonction exportée d'un `modules/cron/services/*.service.ts` doit avoir
 * au moins un appelant hors tests (route cron, autre service, action). Un
 * service de rattrapage qu'on écrit sans le brancher est pire que son absence :
 * il documente un risque comme couvert.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const SERVICES_DIR = join(REPO_ROOT, "modules", "cron", "services");
const SEARCH_ROOTS = ["app", "modules", "shared"] as const;

const EXPORTED_FN = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g;

function collectSourceFiles(absDir: string, acc: string[] = []): string[] {
	for (const entry of readdirSync(absDir)) {
		if (entry === "__tests__" || entry === "node_modules") continue;
		const abs = join(absDir, entry);
		if (statSync(abs).isDirectory()) {
			collectSourceFiles(abs, acc);
			continue;
		}
		if (!/\.(ts|tsx)$/.test(entry)) continue;
		if (/\.test\.(ts|tsx)$/.test(entry)) continue;
		acc.push(abs);
	}
	return acc;
}

describe("@regression cron-services-have-callers", () => {
	const serviceFiles = readdirSync(SERVICES_DIR).filter((f) => f.endsWith(".service.ts"));
	const searchFiles = SEARCH_ROOTS.flatMap((root) => collectSourceFiles(join(REPO_ROOT, root)));

	// Garde-fou du garde-fou : un glob cassé qui ne détecte rien rendrait ce test
	// vert pour rien (leçon audit admin commandes 2026-07-26).
	it("détecte bien les services et le corpus de recherche", () => {
		expect(serviceFiles.length).toBeGreaterThanOrEqual(10);
		expect(searchFiles.length).toBeGreaterThan(500);
	});

	for (const serviceFile of serviceFiles) {
		const absService = join(SERVICES_DIR, serviceFile);
		const source = readFileSync(absService, "utf8");
		const exportedFns = [...source.matchAll(EXPORTED_FN)].map((m) => m[1]!);

		it(`${serviceFile} : chaque fonction exportée a un appelant hors tests`, () => {
			expect(exportedFns.length).toBeGreaterThan(0);

			const orphans = exportedFns.filter((fn) => {
				const callPattern = new RegExp(`\\b${fn}\\b`);
				return !searchFiles.some((file) => {
					if (file === absService) return false;
					return callPattern.test(readFileSync(file, "utf8"));
				});
			});

			expect(
				orphans,
				`Fonction(s) exportée(s) sans appelant dans ${relative(REPO_ROOT, absService)
					.split(sep)
					.join("/")} — brancher (route cron, passe d'une route existante) ou supprimer`,
			).toEqual([]);
		});
	}
});
