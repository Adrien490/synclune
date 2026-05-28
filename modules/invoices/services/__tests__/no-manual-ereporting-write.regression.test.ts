import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression ereporting-no-manual-write-2026-05-28
 *
 * Garantit qu'aucune Server Action, route API arbitraire ou composant admin
 * ne crée ou ne mute directement un `EReportingBatch` / `EReportingTransaction`.
 * Seuls deux services dédiés sont autorisés :
 *  - `record-ereporting.service.ts` (hook SALES + REFUND, best-effort feature-flagged)
 *  - `build-ereporting-batch.service.ts` (cron daily d'agrégation)
 *  - `transmit-ereporting-batch.service.ts` (cron transmit, futur — pré-autorisé)
 *
 * Cf. CLAUDE.md § "Facturation électronique — invariants" #9.
 *
 * Risque réglementaire si la garde saute : une Server Action admin pourrait
 * créer un batch fictif (divergence des compteurs DGFiP) ou bypasser la
 * transmission (`status: ACCEPTED` posé sans appel PA réel), cassant l'audit
 * comptable Art. L102 B LPF + l'invariant d'idempotence transmission.
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
].filter((f) => !f.includes("/app/generated/")); // Prisma generated client = autorisé par construction

function relPath(abs: string): string {
	return relative(REPO_ROOT, abs).replaceAll("\\", "/");
}

function findWriters(modelMethod: RegExp): string[] {
	return allSourceFiles
		.filter((f) => {
			const content = readFileSync(f, "utf-8");
			// Exclure commentaires inline `/* */` et `//` avant pattern matching
			const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
			return modelMethod.test(stripped);
		})
		.map(relPath)
		.sort();
}

describe("E-reporting — pas de création ni mutation manuelle des modèles", () => {
	it("only record-ereporting.service.ts calls prisma.eReportingTransaction.create", () => {
		const writers = findWriters(/\b(?:prisma|tx)\.eReportingTransaction\.create\s*\(/);
		expect(writers).toEqual(["modules/invoices/services/record-ereporting.service.ts"]);
	});

	it("only build-ereporting-batch.service.ts calls prisma.eReportingBatch.create", () => {
		const writers = findWriters(/\b(?:prisma|tx)\.eReportingBatch\.create\s*\(/);
		expect(writers).toEqual(["modules/cron/services/build-ereporting-batch.service.ts"]);
	});

	it("only cron services + submit service call prisma.eReportingTransaction.updateMany", () => {
		const writers = findWriters(/\b(?:prisma|tx)\.eReportingTransaction\.updateMany\s*\(/);
		expect(writers.sort()).toEqual(
			[
				// Batch assignment lors de l'agrégation daily
				"modules/cron/services/build-ereporting-batch.service.ts",
				// Propagation status SENT/ACCEPTED après transmission PA (logique extraite
				// du cron `transmit-ereporting-batch` vers ce service partagé pour
				// permettre replay ad-hoc d'un batch précis)
				"modules/invoices/services/submit-ereporting-batch.service.ts",
			].sort(),
		);
	});

	it("no source file calls prisma.eReportingTransaction.update (singular)", () => {
		// Verrou complémentaire à `updateMany` : un dev pourrait écrire
		// `prisma.eReportingTransaction.update({ where: { id }, data: { status: ACCEPTED } })`
		// pour forcer un status terminal sur une transaction isolée. Aucun use case
		// légitime à ce jour — le cron transmit propage via updateMany. Si un nouveau
		// service apparaît, ajouter le path à une allowlist ici.
		const writers = findWriters(/\b(?:prisma|tx)\.eReportingTransaction\.update\s*\(/);
		expect(writers).toEqual([]);
	});

	it("only allowlisted services mutate EReportingBatch.status", () => {
		// Recherche d'écriture d'un EReportingStatus dans un bloc data: { ... } typique.
		const pattern =
			/\bstatus\s*:\s*(?:EReportingStatus\.(?:PENDING|SENT|ACCEPTED|REJECTED|RETRYING|ABANDONED)|"(?:PENDING|SENT|ACCEPTED|REJECTED|RETRYING|ABANDONED)")/;
		const writers = allSourceFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				// Doit aussi contenir un appel à eReportingBatch.update|create|upsert pour
				// éliminer les faux positifs (status sur un autre model qui partage le nom).
				if (
					!/\b(?:prisma|tx)\.eReportingBatch\.(?:create|update|updateMany|upsert)\s*\(/.test(
						content,
					)
				) {
					return false;
				}
				return pattern.test(content);
			})
			.map(relPath)
			.sort();

		// Allowlist documentée :
		//  - build : initialise PENDING
		//  - submit (service partagé) : flip SENT/ACCEPTED/REJECTED/RETRYING/ABANDONED après PA
		//  - transmit (cron wrapper) : exporte également les enums mais délègue à submit
		//  - retry action : reset REJECTED/ABANDONED → PENDING (admin force retry,
		//    PAS un terminal manuel — sécurisé par le test ci-dessous)
		const allowed = [
			"modules/cron/services/build-ereporting-batch.service.ts",
			"modules/cron/services/transmit-ereporting-batch.service.ts",
			"modules/invoices/services/submit-ereporting-batch.service.ts",
			"modules/invoices/actions/retry-ereporting-batch.ts",
		];
		for (const writer of writers) {
			expect(allowed).toContain(writer);
		}
	});

	it("no Server Action writes a TERMINAL status (SENT/ACCEPTED/REJECTED/ABANDONED) on EReportingBatch", () => {
		// Invariant principal CLAUDE.md #9 : un admin ne doit jamais marquer un
		// batch comme transmis sans passage effectif par la PA. Reset → PENDING
		// est autorisé (retry forcé après correction), tout terminal est interdit.
		const terminalPattern =
			/\bstatus\s*:\s*(?:EReportingStatus\.(?:SENT|ACCEPTED|REJECTED|ABANDONED)|"(?:SENT|ACCEPTED|REJECTED|ABANDONED)")/;
		const actionFiles = allSourceFiles.filter((f) => {
			const rel = relPath(f);
			return /^modules\/[^/]+\/actions\//.test(rel) || /^app\/admin\/.*\/actions\//.test(rel);
		});

		const offenders = actionFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				if (!/\beReportingBatch\b/.test(content)) return false;
				const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
				return terminalPattern.test(stripped);
			})
			.map(relPath)
			.sort();

		expect(offenders).toEqual([]);
	});

	it("no Server Action calls eReportingTransaction.create / eReportingBatch.create directly", () => {
		const actionFiles = allSourceFiles.filter((f) => {
			const rel = relPath(f);
			return /^modules\/[^/]+\/actions\//.test(rel) || /^app\/admin\/.*\/actions\//.test(rel);
		});
		const offenders = actionFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
				return /\b(?:prisma|tx)\.(?:eReportingBatch|eReportingTransaction)\.(?:create|upsert|delete|deleteMany)\s*\(/.test(
					stripped,
				);
			})
			.map(relPath)
			.sort();

		expect(offenders).toEqual([]);
	});
});
