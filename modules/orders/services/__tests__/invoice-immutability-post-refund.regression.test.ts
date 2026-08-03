import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * @regression EINV-CREDIT-007 (audit avoirs 2026-05-28)
 *
 * Verrouille l'invariant n° 5 CLAUDE.md (« PDF immuable post-paiement »).
 *
 * Aucun code de mutation de Refund / OrderHistory / cancel-order /
 * mark-as-fully-refunded / processRefund ne doit jamais écrire sur
 * `Order.invoicePdfUrl` ou `Order.invoicePdfHash`. Ces champs sont write-once
 * via `archiveInvoicePdf` (immuable Art. L102 B LPF).
 *
 * Test file-read static : grep textuel sur les fichiers refunds/orders qui
 * touchent à la facturation et qui devraient JAMAIS muter invoicePdf*.
 */

const PROJECT_ROOT = process.cwd();
const FILES_TO_AUDIT = [
	// Refunds — flux de remboursement standard
	"modules/refunds/services/issue-credit-note.service.ts",
	"modules/refunds/services/archive-credit-note-pdf.service.ts",

	// Orders — annulation / remboursement manuel
	"modules/orders/actions/cancel-order.ts",
	"modules/orders/actions/mark-as-fully-refunded.ts",
	"modules/orders/services/void-invoice.service.ts",

	// Webhooks — refund Stripe
	"modules/webhooks/handlers/refund-handlers.ts",
	"modules/webhooks/services/refund.service.ts",

	// Crons — reconcile + DLQ
	"modules/cron/services/reconcile-refunds.service.ts",
];

const FORBIDDEN_PATTERNS = [
	// invoicePdfUrl: <anything-not-null> — direct write
	/invoicePdfUrl\s*:\s*[^n]/,
	// invoicePdfHash: <anything-not-null> — direct write
	/invoicePdfHash\s*:\s*[^n]/,
];

describe("EINV-CREDIT-007 — facture PDF immuable post-refund", () => {
	for (const relPath of FILES_TO_AUDIT) {
		it(`${relPath} ne doit pas muter Order.invoicePdfUrl ni Order.invoicePdfHash`, async () => {
			const content = await readFile(join(PROJECT_ROOT, relPath), "utf-8");

			// Strip les commentaires (regex simpliste mais suffisante : on cherche
			// des writes Prisma, pas des références descriptives dans la doc).
			const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

			for (const pattern of FORBIDDEN_PATTERNS) {
				const match = stripped.match(pattern);
				if (match) {
					// Surface le match pour debug en cas d'échec
					throw new Error(
						`${relPath} contient une écriture interdite sur invoicePdfUrl/Hash : "${match[0]}". ` +
							`Ces champs sont write-once via archiveInvoicePdf (Art. L102 B LPF). ` +
							`Si nécessaire de modifier le PDF facture, suivre le cycle VOIDED + avoir (cf. void-invoice.service.ts).`,
					);
				}
			}
		});
	}

	it("archive-invoice-pdf.service.ts est le SEUL producteur autorisé", async () => {
		const path = join(PROJECT_ROOT, "modules/orders/services/archive-invoice-pdf.service.ts");
		const content = await readFile(path, "utf-8");
		// On vérifie juste que le service existe et écrit bien sur ces champs
		// (pour ne pas régresser involontairement).
		expect(content).toMatch(/invoicePdfUrl\s*:/);
		expect(content).toMatch(/invoicePdfHash\s*:/);
	});
});
