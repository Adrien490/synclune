/**
 * @regression einv-prisma-001
 *
 * Verrouille le correctif EINV-PRISMA-001 (audit Prisma 2026-05-28) : la séquence
 * d'avoir `A-YYYY-NNNNN` DOIT être tirée d'un lookup `MAX` sur l'UNION
 * (Order ∪ Refund), pas d'une seule table. `void-invoice` lisait jadis
 * `MAX(Order)` seul tandis que `issue-credit-note` lisait l'UNION — les deux
 * colonnes vivant dans des tables distinctes, une UNIQUE par table ne détecte
 * pas une collision croisée → deux avoirs pouvaient porter le même numéro
 * (violation Art. 286 CGI). Ce test garde le helper SSOT ET vérifie que les deux
 * services consomment bien ce helper (pas de retour à un lookup table-local).
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma } from "@/app/generated/prisma/client";
import { BusinessError } from "@/shared/lib/actions/business-error";
import {
	nextCreditNoteNumberTx,
	creditNoteAdvisoryLockKey,
	MAX_CREDIT_NOTE_SEQUENCE_PER_YEAR,
} from "../credit-note-sequence.service";

type FakeTx = {
	$executeRaw: ReturnType<typeof vi.fn>;
	$queryRaw: ReturnType<typeof vi.fn>;
};

function makeTx(queryResult: Array<{ cn: string | null }>): FakeTx {
	return {
		$executeRaw: vi.fn().mockResolvedValue(1),
		$queryRaw: vi.fn().mockResolvedValue(queryResult),
	};
}

/** Le helper n'utilise que `$executeRaw`/`$queryRaw` du tx — cast ciblé. */
function asTx(tx: FakeTx): Prisma.TransactionClient {
	return tx as unknown as Prisma.TransactionClient;
}

/** Prisma.Sql expose `.strings` (parties littérales statiques) — concat pour inspection. */
function sqlText(sqlArg: unknown): string {
	const s = sqlArg as { strings?: string[] };
	return Array.isArray(s.strings) ? s.strings.join(" ") : String(sqlArg);
}

function sqlValues(sqlArg: unknown): unknown[] {
	const s = sqlArg as { values?: unknown[] };
	return Array.isArray(s.values) ? s.values : [];
}

describe("nextCreditNoteNumberTx — séquence avoir partagée Order ∪ Refund", () => {
	const year = new Date().getFullYear();

	it("clé advisory lock = offset 2_000_000 + année (partagée void-invoice/issue-credit-note)", () => {
		expect(creditNoteAdvisoryLockKey(2026)).toBe(2_002_026);
		expect(creditNoteAdvisoryLockKey(year)).toBe(2_000_000 + year);
	});

	it("acquiert l'advisory lock AVANT le lookup", async () => {
		const tx = makeTx([{ cn: null }]);
		await nextCreditNoteNumberTx(asTx(tx), year);

		expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
		const lockSql = tx.$executeRaw.mock.calls[0]![0];
		expect(sqlText(lockSql)).toContain("pg_advisory_xact_lock");
		expect(sqlValues(lockSql)).toContain(2_000_000 + year);

		// invocationCallOrder garantit que le lock précède le SELECT MAX.
		expect(tx.$executeRaw.mock.invocationCallOrder[0]!).toBeLessThan(
			tx.$queryRaw.mock.invocationCallOrder[0]!,
		);
	});

	it("le lookup MAX porte sur l'UNION des DEUX tables (Order + Refund) — cœur EINV-PRISMA-001", async () => {
		const tx = makeTx([{ cn: null }]);
		await nextCreditNoteNumberTx(asTx(tx), year);

		const lookupSql = sqlText(tx.$queryRaw.mock.calls[0]![0]);
		expect(lookupSql).toContain('"Order"');
		expect(lookupSql).toContain('"Refund"');
		expect(lookupSql).toMatch(/UNION/i);
		expect(lookupSql).toContain("creditNoteNumber");
	});

	it("premier avoir de l'année → A-YYYY-00001", async () => {
		const tx = makeTx([{ cn: null }]);
		const result = await nextCreditNoteNumberTx(asTx(tx), year);
		expect(result).toBe(`A-${year}-00001`);
	});

	it("incrémente depuis le MAX cross-table existant", async () => {
		const tx = makeTx([{ cn: `A-${year}-00041` }]);
		const result = await nextCreditNoteNumberTx(asTx(tx), year);
		expect(result).toBe(`A-${year}-00042`);
	});

	it("formate sur 5 chiffres (padStart)", async () => {
		const tx = makeTx([{ cn: `A-${year}-00009` }]);
		const result = await nextCreditNoteNumberTx(asTx(tx), year);
		expect(result).toMatch(/^A-\d{4}-\d{5}$/);
		expect(result).toBe(`A-${year}-00010`);
	});

	it("dépassement de séquence → BusinessError CREDIT_NOTE_SEQUENCE_OVERFLOW", async () => {
		const tx = makeTx([
			{ cn: `A-${year}-${String(MAX_CREDIT_NOTE_SEQUENCE_PER_YEAR).padStart(5, "0")}` },
		]);
		await expect(nextCreditNoteNumberTx(asTx(tx), year)).rejects.toMatchObject({
			code: "CREDIT_NOTE_SEQUENCE_OVERFLOW",
		});
		await expect(nextCreditNoteNumberTx(asTx(tx), year)).rejects.toBeInstanceOf(BusinessError);
	});
});

describe("câblage SSOT — les deux services consomment le helper partagé", () => {
	const root = join(__dirname, "..", "..", "..", "..");
	const voidSrc = readFileSync(
		join(root, "modules/orders/services/void-invoice.service.ts"),
		"utf8",
	);
	const issueSrc = readFileSync(
		join(root, "modules/refunds/services/issue-credit-note.service.ts"),
		"utf8",
	);

	it("void-invoice.service.ts appelle nextCreditNoteNumberTx", () => {
		expect(voidSrc).toContain("nextCreditNoteNumberTx");
	});

	it("issue-credit-note.service.ts appelle nextCreditNoteNumberTx", () => {
		expect(issueSrc).toContain("nextCreditNoteNumberTx");
	});

	it("aucun service ne réintroduit un lookup table-local du creditNoteNumber", () => {
		// Anti-régression : un SELECT FROM "Order" sur creditNoteNumber hors UNION
		// ferait reprendre la divergence. Le helper est le seul à requêter la séquence.
		for (const src of [voidSrc, issueSrc]) {
			expect(src).not.toMatch(/FROM "Order"\s+WHERE "creditNoteNumber"/);
			expect(src).not.toContain("pg_advisory_xact_lock");
		}
	});
});
