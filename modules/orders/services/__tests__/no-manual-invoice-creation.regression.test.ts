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
 *
 * Durcissement 2026-07-09 (audit facturation légale) :
 *  - `updateMany`/`createMany` couverts par le writePattern (un
 *    `tx.order.updateMany` échappait à l'ancienne regex `update\s*\(`) ;
 *  - `invoiceDataSnapshot`/`invoiceDataHash` ajoutés au
 *    fieldPattern (falsifier le snapshot comptable = atteinte Art. L102 B LPF) ;
 *  - les écritures `Refund.creditNote*` ont leur propre assertion (la séquence
 *    A-YYYY est partagée Order ∪ Refund — un writer rogue côté Refund casserait
 *    l'unicité cross-table sans jamais émettre le template `A-${...}-`) ;
 *  - `prisma/` (seed) est scanné et allowlisté explicitement.
 *
 * Limite connue (assumée) : un bloc `data` construit dans une variable séparée
 * ou un spread de constante (ex. `...ORDER_PII_SCRUB`/`...REFUND_PII_SCRUB` de
 * la purge 10 ans) échappe à l'heuristique — le contrat des payloads de scrub
 * est verrouillé à part par `purge-pii-scrub-contract.regression.test.ts`.
 */

const REPO_ROOT = process.cwd();

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
	// Le seed dev écrit invoiceNumber/invoiceStatus en direct (sans lock ni
	// service) — toléré UNIQUEMENT car il est doublement gardé contre la prod
	// (NODE_ENV=production refusé + refus si DATABASE_URL contient
	// "prod"/"production", cf. prisma/seed.ts:26-56). On scanne le dossier pour
	// que tout NOUVEAU script prisma/ écrivant ces champs soit détecté ici.
	...walkTs(join(REPO_ROOT, "prisma")),
];

function relPath(abs: string): string {
	return relative(REPO_ROOT, abs).replaceAll("\\", "/");
}

/**
 * Cherche `fieldPattern` à l'intérieur de chaque bloc `data: { … }` délimité
 * par comptage d'accolades (l'ancienne fenêtre fixe de 40 lignes produisait
 * des faux positifs : un payload d'email situé 20 lignes plus bas matchait).
 * Reste une approximation (cf. limite documentée en tête de fichier) : un
 * `data` construit dans une variable séparée n'est pas vu.
 */
function writesTrackedFieldInDataBlock(content: string, fieldPattern: RegExp): boolean {
	const openings = content.matchAll(/\bdata\s*:\s*\{/g);
	for (const opening of openings) {
		const start = opening.index + opening[0].length;
		let depth = 1;
		let end = start;
		while (end < content.length && depth > 0) {
			const char = content[end];
			if (char === "{") depth++;
			else if (char === "}") depth--;
			end++;
		}
		if (fieldPattern.test(content.slice(start, end))) return true;
	}
	return false;
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
				// Seed dev — jamais exécutable en prod (double garde NODE_ENV +
				// DATABASE_URL, cf. commentaire de l'allowlist walkTs ci-dessus).
				"prisma/seed.ts",
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
				// Seed dev — cf. allowlist test 1.
				"prisma/seed.ts",
			].sort(),
		);
	});

	it("only allowlisted services pass invoice* / creditNote* fields inside an Order Prisma write block", () => {
		// `updateMany`/`createMany` inclus (durcissement 2026-07-09) : un
		// `tx.order.updateMany({ data: { invoiceNumber: ... } })` échappait à
		// l'ancienne regex `update\s*\(`.
		const writePattern =
			/\b(?:prisma|tx)\.order\.(?:update|updateMany|create|createMany|upsert)\s*\(/;
		const fieldPattern =
			/\b(?:invoiceNumber|creditNoteNumber|invoiceGeneratedAt|invoiceVoidedAt|creditNoteGeneratedAt|invoicePdfUrl|invoicePdfHash|creditNotePdfUrl|creditNotePdfHash|invoiceDataSnapshot|invoiceDataHash)\s*:\s*(?!true\b|false\b)/;
		const writers = allSourceFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				if (!writePattern.test(content)) return false;
				return writesTrackedFieldInDataBlock(content, fieldPattern);
			})
			.map(relPath);

		expect(writers.sort()).toEqual(
			[
				// Génération + persistance numéro facture + snapshot figé (Art. 286 / 289-I CGI)
				"modules/orders/services/persist-invoice-number.service.ts",
				// Émission avoir + cycle VOIDED facture (Art. 272-I CGI)
				"modules/orders/services/void-invoice.service.ts",
				// Archivage PDF immuable UploadThing + SHA-256 (Art. L102 B LPF)
				"modules/orders/services/archive-invoice-pdf.service.ts",
				// Archivage PDF avoir immuable UploadThing + SHA-256 (Art. L102 B LPF,
				// symétrie facture pour Art. 272-I CGI)
				"modules/orders/services/archive-credit-note-pdf.service.ts",
				// Contrôle d'intégrité des archives PDF (Art. L102 B LPF) — ré-upload
				// d'une archive corrompue : n'écrit QUE invoicePdfUrl/creditNotePdfUrl
				// (+ pdfIntegrityCheckedAt), et UNIQUEMENT si la régénération est
				// bit-identique au hash d'origine (jamais de réécriture du hash).
				"modules/invoices/services/verify-pdf-archive-integrity.service.ts",
				// Seed dev — cf. allowlist test 1.
				"prisma/seed.ts",
			].sort(),
		);
	});

	it("only allowlisted services pass creditNote* fields inside a Refund Prisma write block (EINV-PRISMA-001)", () => {
		// La séquence A-YYYY est PARTAGÉE Order ∪ Refund : une écriture rogue de
		// `Refund.creditNoteNumber` (même sans émettre le template `A-${...}-`,
		// ex. import direct de `nextCreditNoteNumberTx`) casserait l'unicité
		// cross-table et l'immutabilité de l'archive (creditNotePdfHash).
		const writePattern =
			/\b(?:prisma|tx)\.refund\.(?:update|updateMany|create|createMany|upsert)\s*\(/;
		const fieldPattern =
			/\b(?:creditNoteNumber|creditNoteGeneratedAt|creditNotePdfUrl|creditNotePdfHash)\s*:\s*(?!true\b|false\b)/;
		const writers = allSourceFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				if (!writePattern.test(content)) return false;
				return writesTrackedFieldInDataBlock(content, fieldPattern);
			})
			.map(relPath);

		expect(writers.sort()).toEqual(
			[
				// Émission avoir partiel sous lock partagé (Art. 272-I CGI)
				"modules/refunds/services/issue-credit-note.service.ts",
				// Archivage PDF avoir Refund immuable (Art. L102 B LPF)
				"modules/refunds/services/archive-credit-note-pdf.service.ts",
				// Passe intégrité — remplacement d'URL bit-identique, cf. test Order.
				"modules/invoices/services/verify-pdf-archive-integrity.service.ts",
			].sort(),
		);
	});
});
