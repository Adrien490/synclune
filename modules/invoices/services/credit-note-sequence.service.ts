import { Prisma } from "@/app/generated/prisma/client";
import { BusinessError } from "@/shared/lib/actions/business-error";

/**
 * SSOT de la séquence avoir `A-YYYY-NNNNN`, PARTAGÉE entre
 * `Order.creditNoteNumber` (full void via `voidInvoice`) et
 * `Refund.creditNoteNumber` (refund partiel/total via `issueCreditNoteForRefund`).
 *
 * EINV-PRISMA-001 (audit Prisma 2026-05-28) : `void-invoice` lisait jadis
 * `MAX(Order)` seul tandis que `issue-credit-note` lisait `MAX(Order ∪ Refund)`.
 * Les deux `creditNoteNumber` vivant dans des tables distinctes, une contrainte
 * UNIQUE *par table* ne détecte PAS une collision croisée → deux avoirs
 * pouvaient porter le même numéro (violation séquentialité gap-free unique,
 * Art. 286 CGI). Ce helper centralise l'advisory lock + le lookup UNION pour que
 * les deux chemins partagent réellement la séquence et restent strictement
 * croissants/uniques sur l'ensemble des deux tables.
 */

/**
 * Limite imposée par le CHECK DB `^A-[0-9]{4}-[0-9]{5}$` (99 999 avoirs/an).
 * Miroir de `MAX_SEQUENCE_PER_YEAR` côté factures
 * (`persist-invoice-number.service.ts`).
 */
export const MAX_CREDIT_NOTE_SEQUENCE_PER_YEAR = 99_999;

/**
 * Clé Postgres advisory lock dédiée aux avoirs (offset `2_000_000`, distinct de
 * la facture `1_000_000` pour ne pas sérialiser facture + avoir mutuellement).
 * PARTAGÉE par `voidInvoice` et `issueCreditNoteForRefund` → sérialisation
 * totale de la séquence `A-YYYY` sur les deux tables.
 */
export function creditNoteAdvisoryLockKey(year: number): number {
	return 2_000_000 + year;
}

/**
 * Acquiert l'advisory lock avoir puis calcule le prochain numéro
 * `A-YYYY-NNNNN` en lisant le `MAX` sur l'**UNION (Order ∪ Refund)**.
 * À appeler DANS une transaction Prisma (le lock est `xact`-scopé).
 *
 * @throws BusinessError `CREDIT_NOTE_SEQUENCE_OVERFLOW` si > 99 999/an.
 */
export async function nextCreditNoteNumberTx(
	tx: Prisma.TransactionClient,
	year: number,
): Promise<string> {
	const prefix = `A-${year}-`;

	await tx.$executeRaw(
		Prisma.sql`SELECT pg_advisory_xact_lock(${creditNoteAdvisoryLockKey(year)})`,
	);

	// Lookup MAX(A-YYYY-NNNNN) sur les DEUX tables (Order + Refund) — la séquence
	// est partagée pour garantir l'unicité globale cross-table (EINV-PRISMA-001).
	const lastRow = await tx.$queryRaw<Array<{ cn: string | null }>>(
		Prisma.sql`
			SELECT MAX(cn) AS cn FROM (
				SELECT "creditNoteNumber" AS cn FROM "Order"
					WHERE "creditNoteNumber" LIKE ${prefix + "%"}
				UNION ALL
				SELECT "creditNoteNumber" AS cn FROM "Refund"
					WHERE "creditNoteNumber" LIKE ${prefix + "%"}
			) t
		`,
	);

	let nextSequence = 1;
	const lastNumber = lastRow[0]?.cn;
	if (lastNumber) {
		const parsed = parseInt(lastNumber.slice(prefix.length), 10);
		if (!isNaN(parsed)) {
			nextSequence = parsed + 1;
		}
	}

	if (nextSequence > MAX_CREDIT_NOTE_SEQUENCE_PER_YEAR) {
		throw new BusinessError(
			`Séquence avoir saturée pour l'année ${year} (limite ${MAX_CREDIT_NOTE_SEQUENCE_PER_YEAR}). ` +
				`Étendre la regex CHECK DB à 6 chiffres avant nouvelle émission.`,
			"CREDIT_NOTE_SEQUENCE_OVERFLOW",
		);
	}

	return `${prefix}${String(nextSequence).padStart(5, "0")}`;
}
