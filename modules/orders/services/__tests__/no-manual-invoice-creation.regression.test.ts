import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression invoice-no-manual-creation-2026-05-27
 *
 * Garantit que la création d'une facture (`invoiceNumber` `F-YYYY-NNNNN`) et
 * d'un avoir (`creditNoteNumber` `A-YYYY-NNNNN`) ne passe JAMAIS par une
 * Server Action, une route API arbitraire ou un composant admin. Seuls trois
 * services dédiés peuvent générer ces numéros, sous advisory lock Postgres
 * sérialisé par année :
 *  - `persist-invoice-number.service.ts` (Art. 286 / 289-I CGI)
 *  - `void-invoice.service.ts` (Art. 272-I CGI — full void Order)
 *  - `issue-credit-note.service.ts` (Art. 272-I CGI — avoir partiel ou total
 *    rattaché à un Refund. Séquence A-YYYY-NNNNN partagée via UNION SQL.)
 *
 * Cf. CLAUDE.md § "Facturation électronique — invariants" #1 et #2.
 *
 * Risque réglementaire si la garde saute : une Server Action admin pourrait
 * créer une facture sans webhook Stripe → violation Art. 289-I (émission à
 * l'encaissement) + risque assimilation à un "logiciel de caisse" non
 * conforme NF 525.
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

describe("Facturation — pas de création manuelle de facture ou d'avoir", () => {
	it("only persist-invoice-number.service.ts emits F-YYYY-NNNNN templates", () => {
		const pattern = /`F-\$\{[^}]*\}-/;
		const writers = allSourceFiles
			.filter((f) => pattern.test(readFileSync(f, "utf-8")))
			.map(relPath);
		expect(writers.sort()).toEqual(
			[
				// Émetteur unique du template F-YYYY-NNNNN sous advisory lock (Art. 286 CGI).
				// L'ancien `invoice-number.service.ts` (générateur orphelin sans lock, 0
				// consumer) a été supprimé — audit séquences 2026-05-30 (fail-unsafe si câblé).
				"modules/orders/services/persist-invoice-number.service.ts",
			].sort(),
		);
	});

	it("only credit-note-sequence.service.ts emits the A-YYYY-NNNNN template (SSOT, EINV-PRISMA-001)", () => {
		const pattern = /`A-\$\{[^}]*\}-/;
		const writers = allSourceFiles
			.filter((f) => pattern.test(readFileSync(f, "utf-8")))
			.map(relPath);
		expect(writers.sort()).toEqual(
			[
				// SSOT de la séquence avoir A-YYYY-NNNNN (advisory lock 2_000_000+year +
				// lookup UNION Order∪Refund). void-invoice.service.ts (full void Order)
				// ET issue-credit-note.service.ts (avoir Refund) délèguent tous deux à
				// `nextCreditNoteNumberTx` ici → un seul émetteur du template, unicité
				// cross-table garantie (EINV-PRISMA-001, audit séquences 2026-05-28).
				"modules/invoices/services/credit-note-sequence.service.ts",
			].sort(),
		);
	});

	it("only allowed call-sites assign a concrete invoiceStatus value", () => {
		// Concrete write : `invoiceStatus: "GENERATED"` / `: "VOIDED"` / `: "PENDING"`
		// ou `: InvoiceStatus.GENERATED|VOIDED|PENDING`. Exclut `: true` (select clause).
		const pattern =
			/\binvoiceStatus\s*:\s*(?:InvoiceStatus\.(?:GENERATED|VOIDED|PENDING)|"(?:GENERATED|VOIDED|PENDING)")/;
		const writers = allSourceFiles
			.filter((f) => pattern.test(readFileSync(f, "utf-8")))
			.map(relPath);
		expect(writers.sort()).toEqual(
			[
				"modules/orders/services/persist-invoice-number.service.ts",
				"modules/orders/services/void-invoice.service.ts",
				// In-memory object refinement after persistInvoiceNumber returned, NOT a DB write.
				"app/api/orders/[orderNumber]/invoice/route.ts",
				// Cron de réconciliation : restaure GENERATED quand une commande VOIDED
				// a été remise PAID après rollback Stripe (idempotent + audit).
				"modules/cron/services/reconcile-voided-invoices.service.ts",
			].sort(),
		);
	});

	it("only allowlisted services pass invoice* / creditNote* fields inside a Prisma write block", () => {
		const writePattern = /\b(?:prisma|tx)\.order\.(?:update|create|upsert)\s*\(/;
		const fieldPattern =
			/\b(?:invoiceNumber|creditNoteNumber|invoiceGeneratedAt|invoiceVoidedAt|creditNoteGeneratedAt|invoicePdfUrl|invoicePdfHash|creditNotePdfUrl|creditNotePdfHash)\s*:\s*(?!true\b|false\b)/;
		const writers = allSourceFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				if (!writePattern.test(content)) return false;
				// Look for write-field-pattern within `data: {` blocks. Approximation:
				// scan all `data: {` openings and verify a few lines below.
				const lines = content.split("\n");
				for (let i = 0; i < lines.length; i++) {
					if (!/\bdata\s*:\s*\{/.test(lines[i]!)) continue;
					const block = lines.slice(i, i + 40).join("\n");
					if (fieldPattern.test(block)) return true;
				}
				return false;
			})
			.map(relPath);

		expect(writers.sort()).toEqual(
			[
				// Génération + persistance numéro facture (Art. 286 / 289-I CGI)
				"modules/orders/services/persist-invoice-number.service.ts",
				// Émission avoir + cycle VOIDED facture (Art. 272-I CGI)
				"modules/orders/services/void-invoice.service.ts",
				// Archivage PDF immuable UploadThing + SHA-256 (Art. L102 B LPF)
				"modules/orders/services/archive-invoice-pdf.service.ts",
				// Archivage PDF avoir immuable UploadThing + SHA-256 (Art. L102 B LPF,
				// symétrie facture pour Art. 272-I CGI)
				"modules/orders/services/archive-credit-note-pdf.service.ts",
			].sort(),
		);
	});
});
