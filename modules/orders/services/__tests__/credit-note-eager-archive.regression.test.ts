import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression credit-note-eager-archive-2026-07-09
 *
 * EINV-CREDIT-020 — verrouille le câblage de l'archivage EAGER des avoirs.
 *
 * Contexte : contrairement à la facture (snapshot `invoiceDataSnapshot` figé à
 * l'émission + archivage eager au webhook), l'avoir n'a pas de snapshot de
 * données — son contenu est reconstruit depuis les colonnes Order/Refund à
 * chaque rendu. Bug d'origine (audit facturation légale 2026-07-09) : un avoir
 * émis mais jamais téléchargé, puis anonymisation RGPD du compte → le premier
 * rendu reconstruisait le document depuis des colonnes scrubées (« Client
 * supprimé ») et CE document sans identité client (Art. 289 CGI) devenait la
 * référence archivée immuable (Art. L102 B LPF).
 *
 * Le correctif tient en 4 câblages, chacun verrouillé ici par scan de source
 * (le comportement unitaire est couvert par les suites ensure-credit-note-
 * archived + verify-pdf-archive-integrity) :
 *  1. voidInvoice archive eagerly l'avoir full-void à l'émission ;
 *  2. issueCreditNoteForRefund archive eagerly l'avoir partiel à l'émission ;
 *  3. les DEUX chemins d'anonymisation (cron + action admin immédiate) sont
 *     gatés par ensureUserCreditNotesArchived AVANT le scrub ;
 *  4. reconcile-invoices rattrape les avoirs non archivés (sélection directe
 *     `creditNoteNumber` + `creditNotePdfUrl NULL` côté Order + sweep Refund).
 */

const REPO_ROOT = process.cwd();

function read(rel: string): string {
	return readFileSync(join(REPO_ROOT, rel), "utf-8");
}

describe("EINV-CREDIT-020 — archivage eager des avoirs", () => {
	it("voidInvoice archives the full-void credit note eagerly at issuance", () => {
		const source = read("modules/orders/services/void-invoice.service.ts");
		expect(source).toContain("ensureOrderCreditNoteArchived");
	});

	it("issueCreditNoteForRefund archives the partial credit note eagerly at issuance", () => {
		const source = read("modules/refunds/services/issue-credit-note.service.ts");
		expect(source).toContain("ensureRefundCreditNoteArchived");
	});

	it("both anonymization paths are gated by ensureUserCreditNotesArchived BEFORE the scrub", () => {
		const cron = read("modules/cron/services/process-account-deletions.service.ts");
		const adminAction = read("modules/users/actions/admin/anonymize-user-immediately.ts");
		for (const source of [cron, adminAction]) {
			expect(source).toContain("ensureUserCreditNotesArchived");
			// La garde doit précéder l'appel au scrub dans le flux du fichier.
			expect(source.indexOf("ensureUserCreditNotesArchived(")).toBeGreaterThan(-1);
			expect(source.indexOf("ensureUserCreditNotesArchived(")).toBeLessThan(
				source.indexOf("anonymizeUserInTransaction("),
			);
		}
	});

	it("reconcile-invoices selects unarchived Order credit notes directly (not only via the DLQ flag)", () => {
		const source = read("modules/cron/services/reconcile-invoices.service.ts");
		expect(source).toMatch(
			/creditNoteNumber:\s*\{\s*not:\s*null\s*\},?\s*\n\s*creditNotePdfUrl:\s*null/,
		);
		expect(source).toContain("ensureOrderCreditNoteArchived");
		expect(source).toContain("runRefundCreditNotePdfSweep");
		expect(source).toContain("ensureRefundCreditNoteArchived");
	});

	it("credit note rendering goes through the shared SSOT in every path (routes + eager + cron)", () => {
		// Un rendu divergent entre chemins casserait la vérification de hash
		// (EINV-PDF-002/006) : toutes les surfaces doivent consommer le même
		// renderer. Les routes ne doivent plus construire l'avoir localement.
		const orderRoute = read("app/api/orders/[orderNumber]/credit-note/route.ts");
		const refundRoute = read("app/api/orders/[orderNumber]/credit-note/[refundId]/route.ts");
		expect(orderRoute).toContain("renderOrderCreditNotePdf");
		expect(orderRoute).not.toContain("buildInvoiceData(");
		expect(refundRoute).toContain("renderRefundCreditNotePdf");
		expect(refundRoute).not.toContain("buildCreditNoteData(");
	});
});
