import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression refund-no-invoice-mutation
 *
 * Invariant CLAUDE.md §"Facturation électronique — invariants" #1 :
 * "Aucune Server Action ne doit écrire `invoiceNumber` ou `creditNoteNumber`."
 *
 * Ce test est le pendant **côté module refunds/** de la garde principale
 * (`modules/orders/services/__tests__/no-manual-invoice-creation.regression.test.ts`).
 * Il vérifie qu'aucun fichier sous `modules/refunds/` (actions, hooks, services,
 * composants, etc.) ne mute les champs facture/avoir sur **Order** via un
 * `prisma.order.update/create/upsert` ou un `tx.order.update/create/upsert`.
 *
 * Seul `modules/refunds/services/issue-credit-note.service.ts` est autorisé à
 * écrire `Refund.creditNoteNumber` (Art. 272-I CGI, advisory lock partagé
 * 2_000_000+year). Aucun fichier refund ne doit toucher Order.invoice* —
 * c'est `modules/orders/services/void-invoice.service.ts` qui fait ça, hors
 * du module refunds.
 *
 * Risque si la garde saute : un dev pourrait écrire un Refund action qui mute
 * `Order.invoiceStatus = "VOIDED"` ou `Order.creditNoteNumber = ...` sans
 * passer par voidInvoice/issueCreditNoteForRefund → violation séquentialité
 * (Art. 286 CGI) + corruption advisory lock + facture stale.
 */

const REPO_ROOT = process.cwd();
const REFUNDS_ROOT = join(REPO_ROOT, "modules", "refunds");

function walkTs(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (entry === "node_modules" || entry.startsWith(".")) continue;
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

const refundSourceFiles = walkTs(REFUNDS_ROOT);

function relPath(abs: string): string {
	return relative(REPO_ROOT, abs).replaceAll("\\", "/");
}

describe("@regression refund-no-invoice-mutation", () => {
	it("aucun fichier sous modules/refunds/ ne fait prisma.order.update/create/upsert ni tx.order.update/...", () => {
		// On bloque toute Order mutation depuis le module refunds — ces opérations
		// ne doivent passer que par modules/orders/* (cancel-order, mark-as-fully-
		// refunded, void-invoice).
		const orderWritePattern =
			/\b(?:prisma|tx)\.order\.(?:update|updateMany|create|upsert|delete)\s*\(/;
		const offenders = refundSourceFiles
			.filter((f) => orderWritePattern.test(readFileSync(f, "utf-8")))
			.map(relPath);

		// process-refund.ts:340-349 fait `tx.order.update({data:{paymentStatus}})` —
		// c'est légitime (PARTIALLY_REFUNDED / REFUNDED), pas une mutation facture.
		// On l'allowliste explicitement avec justification.
		expect(offenders.sort()).toEqual(
			[
				// Légitime : update paymentStatus PARTIALLY_REFUNDED / REFUNDED après
				// finalisation refund (Step 3 SAGA). Ne touche PAS invoice*/creditNote*.
				"modules/refunds/actions/process-refund.ts",
				// Légitime : même update paymentStatus, chemin asynchrone partagé
				// webhook refund.updated + cron DLQ (P1-C audit 2026-08-01). Les
				// écritures invoice*/creditNote* passent par voidInvoice/issueCreditNote,
				// jamais en direct.
				"modules/refunds/services/finalize-refund.service.ts",
			].sort(),
		);
	});

	it("aucun fichier sous modules/refunds/ ne passe invoice*/creditNote* dans un data block d'un prisma.order.update", () => {
		// Précis : on cible UNIQUEMENT les data blocks qui suivent un
		// `prisma|tx.order.(update|create|upsert)(`. Les metadata d'audit trail
		// (createOrderAuditTx avec metadata.invoiceNumber pour traçabilité) sont
		// hors scope — elles n'écrivent pas sur le modèle Order.
		const orderFieldPattern =
			/\b(?:invoiceNumber|invoiceStatus|invoiceGeneratedAt|invoiceVoidedAt|invoicePdfUrl|invoicePdfHash|invoiceDataSnapshot|invoiceDataHash|invoiceArchivedAt|invoiceXmlUrl|invoiceXmlHash|invoiceXmlFormat|invoiceXmlArchivedAt|creditNoteNumber|creditNoteGeneratedAt|creditNotePdfUrl|creditNotePdfHash)\s*:\s*(?!true\b|false\b)/;
		const orderWritePattern = /\b(?:prisma|tx)\.order\.(?:update|updateMany|create|upsert)\s*\(/;
		const offenders = refundSourceFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				if (!orderWritePattern.test(content)) return false;
				const lines = content.split("\n");
				for (let i = 0; i < lines.length; i++) {
					if (!orderWritePattern.test(lines[i]!)) continue;
					// Scan 40 lignes après le order.update — y cherche un data block
					// qui contient un champ facture/avoir.
					const block = lines.slice(i, i + 40).join("\n");
					if (/\bdata\s*:\s*\{/.test(block) && orderFieldPattern.test(block)) {
						return true;
					}
				}
				return false;
			})
			.map(relPath);

		// Aucun fichier autorisé : le module refunds n'a JAMAIS de raison de toucher
		// Order.invoice*/creditNote* — c'est void-invoice.service.ts qui fait ça.
		expect(offenders).toEqual([]);
	});

	it("seul issue-credit-note.service.ts écrit Refund.creditNote* (Refund) via Prisma write block", () => {
		const refundWritePattern = /\b(?:prisma|tx)\.refund\.(?:update|updateMany|create|upsert)\s*\(/;
		const refundFieldPattern =
			/\b(?:creditNoteNumber|creditNoteGeneratedAt|creditNotePdfUrl|creditNotePdfHash)\s*:\s*(?!true\b|false\b)/;
		const writers = refundSourceFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				if (!refundWritePattern.test(content)) return false;
				const lines = content.split("\n");
				for (let i = 0; i < lines.length; i++) {
					if (!/\bdata\s*:\s*\{/.test(lines[i]!)) continue;
					const block = lines.slice(i, i + 40).join("\n");
					if (refundFieldPattern.test(block)) return true;
				}
				return false;
			})
			.map(relPath);

		expect(writers.sort()).toEqual(
			[
				// Génération séquentielle A-YYYY-NNNNN (Art. 272-I CGI). Le SEUL service
				// du module refunds autorisé à écrire creditNoteNumber/creditNoteGeneratedAt
				// sur Refund. Advisory lock partagé 2_000_000+year + UNION SQL.
				"modules/refunds/services/issue-credit-note.service.ts",
				// Archivage PDF avoir UploadThing + SHA-256 (Art. L102 B LPF). Écrit
				// uniquement creditNotePdfUrl + creditNotePdfHash (jamais le numéro).
				"modules/refunds/services/archive-credit-note-pdf.service.ts",
				// ORD-STRIPE-005 (2026-05-28) : faux positif heuristique — fait
				// `prisma.refund.updateMany({ data: { confirmationEmailSentAt } })`,
				// puis 40 lignes plus loin passe `creditNoteNumber` en argument à
				// `sendRefundConfirmationEmail` (pas en write DB). Le test scan
				// 40 lignes après `data:{`, donc inclus ici comme allow-list.
				"modules/refunds/services/send-refund-confirmation.service.ts",
			].sort(),
		);
	});

	it("aucun fichier sous modules/refunds/ n'émet un template A-YYYY-NNNNN (séquence centralisée dans invoices/credit-note-sequence.service.ts)", () => {
		// Filet de sécurité côté refunds — la garde principale est dans
		// modules/orders/services/__tests__/no-manual-invoice-creation.regression.test.ts,
		// ce test verrouille la slice refunds/ pour éviter les drifts.
		//
		// EINV-PRISMA-001 : la génération du template `A-YYYY-NNNNN` est centralisée
		// dans le helper SSOT `modules/invoices/services/credit-note-sequence.service.ts`
		// (`nextCreditNoteNumberTx`, advisory lock 2_000_000+year + lookup UNION).
		// `issue-credit-note.service.ts` délègue à ce helper et ne construit donc
		// PLUS le template lui-même → aucun fichier de refunds/ ne l'émet.
		const pattern = /`A-\$\{[^}]*\}-/;
		const writers = refundSourceFiles
			.filter((f) => pattern.test(readFileSync(f, "utf-8")))
			.map(relPath);

		expect(writers.sort()).toEqual([]);
	});
});
