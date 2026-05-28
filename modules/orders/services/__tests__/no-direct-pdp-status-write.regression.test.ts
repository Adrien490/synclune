import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression no-direct-pdp-status-write-2026-05-28
 *
 * Garantit qu'aucune Server Action, route API arbitraire ou composant admin
 * ne mute directement `Order.pdpStatus` / `pdpProviderRef` / etc. en dehors
 * du service centralisé `persist-pdp-transmission.service.ts` (qui pose
 * également l'audit trail OrderHistory + InvoiceTransmissionLog).
 *
 * Exceptions allowlist :
 *  - persist-pdp-transmission.service.ts : SSOT
 *  - retry-invoice-transmissions.service.ts : seul cron habilité à poser ABANDONED
 *  - reconcile-invoice-statuses.service.ts : utilise persistPdpTransmission, mais
 *    accède au champ via la `pdpProviderRef` lecture (allowed côté lecture).
 *
 * Référence : audit Phase 5 EINV-PROVIDER-001 + invariant SSOT.
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
].filter((f) => !f.includes("/app/generated/"));

function relPath(abs: string): string {
	return relative(REPO_ROOT, abs).replaceAll("\\", "/");
}

const PDP_STATUS_WRITE_PATTERN =
	/\bpdpStatus\s*:\s*(?:PdpTransmissionStatus\.|\")(?:PENDING|SENT|ACCEPTED|REJECTED|RETRYING|CANCELLED|ABANDONED)/;

describe("Order.pdpStatus — no direct write outside SSOT", () => {
	it("only authorized services mutate pdpStatus", () => {
		const writers = allSourceFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
				return PDP_STATUS_WRITE_PATTERN.test(stripped);
			})
			.map(relPath)
			.sort();

		// Allowlist :
		//  - persist-pdp-transmission.service.ts : SSOT mutations (audit trail garanti)
		//  - retry-invoice-transmissions.service.ts : seul cron habilité à poser ABANDONED
		//  - reconcile-invoice-statuses.service.ts : autorisé en lecture (WHERE pdpStatus)
		//    — il mute uniquement via persistPdpTransmission, mais le regex matche aussi
		//    les WHERE clauses, d'où la présence ici.
		//  - data/get-invoicing-overview.ts : autorisé en lecture (groupBy + findMany)
		const allowed = [
			"modules/orders/services/persist-pdp-transmission.service.ts",
			"modules/cron/services/retry-invoice-transmissions.service.ts",
			"modules/cron/services/reconcile-invoice-statuses.service.ts",
			"modules/invoices/data/get-invoicing-overview.ts",
		];
		for (const writer of writers) {
			expect(allowed).toContain(writer);
		}
	});

	it("no Server Action under modules/*/actions/ writes pdp* fields directly", () => {
		const actionFiles = allSourceFiles.filter((f) => {
			const rel = relPath(f);
			return /^modules\/[^/]+\/actions\//.test(rel) || /^app\/admin\/.*\/actions\//.test(rel);
		});
		const offenders = actionFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
				// data: { ..., pdpStatus: ..., ... } ou data: { ..., pdpProviderRef: ... }
				return /\b(?:pdpStatus|pdpProviderRef|pdpTransmittedAt|pdpAcceptedAt|pdpRejectedAt)\s*:/.test(
					stripped,
				);
			})
			.map(relPath)
			.sort();

		expect(offenders).toEqual([]);
	});
});
