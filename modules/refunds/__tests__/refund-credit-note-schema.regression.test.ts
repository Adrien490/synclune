import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression refund-credit-note-fields-2026-05-27
 *
 * Verrouille la présence des champs avoir sur le modèle `Refund`
 * (Phase 2A — EINV-AUDIT-010). Permet d'émettre un avoir distinct
 * par remboursement partiel (Art. 272-I CGI).
 *
 * Les champs équivalents sur `Order` (`creditNoteNumber` /
 * `creditNoteGeneratedAt`) restent en place pendant le cycle de
 * dépréciation — voidInvoice() continue à les populer pour le path
 * "full void" (cancel-order, mark-as-fully-refunded) jusqu'à la
 * migration du service.
 */
describe("Refund model — credit note fields (Phase 2A)", () => {
	const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
	const schema = readFileSync(schemaPath, "utf-8");

	function extractModel(name: string): string {
		const match = schema.match(new RegExp(`model\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
		if (!match) throw new Error(`Model ${name} not found`);
		return match[1]!;
	}

	const refund = extractModel("Refund");

	it("Refund.creditNoteNumber is nullable + unique + VarChar(30)", () => {
		expect(refund).toMatch(/^\s*creditNoteNumber\s+String\?\s+@unique\s+@db\.VarChar\(30\)/m);
	});

	it("Refund.creditNoteGeneratedAt is nullable DateTime", () => {
		expect(refund).toMatch(/^\s*creditNoteGeneratedAt\s+DateTime\?/m);
	});

	it("Refund.creditNotePdfUrl is nullable VarChar(2048)", () => {
		expect(refund).toMatch(/^\s*creditNotePdfUrl\s+String\?\s+@db\.VarChar\(2048\)/m);
	});

	it("Refund.creditNotePdfHash is nullable VarChar(64) (SHA-256)", () => {
		expect(refund).toMatch(/^\s*creditNotePdfHash\s+String\?\s+@db\.VarChar\(64\)/m);
	});

	it("Order keeps creditNoteNumber during deprecation cycle (dual write)", () => {
		// On vérifie que la colonne est toujours là — la suppression viendra
		// dans une migration de drop dédiée, après que voidInvoice() ait été
		// migré vers Refund (Phase 2B+).
		const order = extractModel("Order");
		expect(order).toMatch(/^\s*creditNoteNumber\s+String\?\s+@unique/m);
	});
});
