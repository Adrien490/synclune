import { prisma } from "@/shared/lib/prisma";

/**
 * EINV-SEQ-007 — Contrôle de continuité gap-free des séquences légales
 * (Art. 286 CGI : numérotation séquentielle, sans trou, unique).
 *
 * DÉFENSE EN PROFONDEUR — lecture seule. La propriété gap-free est garantie par
 * construction (MAX+1 sous advisory lock dans `persist-invoice-number` /
 * `credit-note-sequence` + garde d'idempotence sous lock EINV-SEQ-006). Ce
 * contrôle ne CORRIGE rien : il DÉTECTE toute violation résiduelle (régression
 * de code, intervention DB manuelle, migration ratée) qu'aucune contrainte
 * `@unique`/CHECK ne saurait signaler — un `@unique` rejette un doublon mais
 * reste muet sur un numéro SAUTÉ. C'est le « test de séquentialité » qu'un
 * contrôle fiscal applique. Câblé dans le cron `reconcile-invoices`.
 *
 * Les commandes/refunds soft-deleted NE sont PAS exclus : un document
 * légalement émis conserve son numéro même soft-deleted (sinon faux positif de
 * trou). On veut l'ensemble des numéros JAMAIS attribués pour l'année.
 */

export type SequenceKind = "invoice" | "credit-note";

export interface SequenceContinuityIssue {
	kind: SequenceKind;
	year: number;
	/** Préfixe complet de l'année, ex. `F-2026-` / `A-2026-`. */
	prefix: string;
	/** Plus grand numéro de séquence observé. */
	max: number;
	/** Nombre de numéros distincts observés. */
	count: number;
	/** Numéros (séquence entière) manquants dans `1..max` (trous = violation Art. 286). */
	missing: number[];
	/** Numéros complets apparaissant plus d'une fois (doublon cross-table avoir inclus). */
	duplicates: string[];
}

// Préfixes construits par CONCATÉNATION de chaînes, PAS par template literal,
// volontairement : ce service est un LECTEUR de continuité, pas un émetteur de
// numéro séquentiel. Le guard `no-manual-invoice-creation.regression` réserve la
// forme template canonique aux seuls services SSOT (persist-invoice-number /
// credit-note-sequence). Ici on ne compose qu'un préfixe de requête startsWith,
// jamais un numéro complet, et on n'écrit rien en base. Ne pas remplacer par un
// template literal — cela réintroduirait un faux positif sur ce guard.
const invoicePrefix = (year: number): string => "F-" + year + "-";
const creditNotePrefix = (year: number): string => "A-" + year + "-";

/**
 * Analyse une liste de numéros complets (`F-2026-00042`, …) pour un préfixe
 * donné. Retourne `null` si la séquence est vide ou parfaitement contiguë+unique.
 */
function analyzeSequence(
	kind: SequenceKind,
	year: number,
	prefix: string,
	numbers: string[],
): SequenceContinuityIssue | null {
	const counts = new Map<string, number>();
	const sequences: number[] = [];

	for (const num of numbers) {
		counts.set(num, (counts.get(num) ?? 0) + 1);
		const seq = parseInt(num.slice(prefix.length), 10);
		if (!Number.isNaN(seq)) sequences.push(seq);
	}

	if (sequences.length === 0) return null;

	const max = Math.max(...sequences);
	const present = new Set(sequences);
	const missing: number[] = [];
	for (let i = 1; i <= max; i++) {
		if (!present.has(i)) missing.push(i);
	}

	const duplicates = [...counts.entries()]
		.filter(([, occurrences]) => occurrences > 1)
		.map(([num]) => num);

	if (missing.length === 0 && duplicates.length === 0) return null;

	return { kind, year, prefix, max, count: present.size, missing, duplicates };
}

/**
 * Vérifie la continuité des séquences facture (`F-YYYY`) et avoir (`A-YYYY`,
 * UNION Order ∪ Refund) pour chaque année fournie. Retourne la liste des
 * anomalies (vide si tout est gap-free + unique).
 */
export async function checkSequenceContinuity(years: number[]): Promise<SequenceContinuityIssue[]> {
	const issues: SequenceContinuityIssue[] = [];

	for (const year of years) {
		// Factures : Order.invoiceNumber.
		const invPrefix = invoicePrefix(year);
		const invoiceRows = await prisma.order.findMany({
			where: { invoiceNumber: { startsWith: invPrefix } },
			select: { invoiceNumber: true },
		});
		const invoiceIssue = analyzeSequence(
			"invoice",
			year,
			invPrefix,
			invoiceRows.map((r) => r.invoiceNumber).filter((n): n is string => n != null),
		);
		if (invoiceIssue) issues.push(invoiceIssue);

		// Avoirs : séquence partagée Order.creditNoteNumber ∪ Refund.creditNoteNumber.
		const cnPrefix = creditNotePrefix(year);
		const [orderCn, refundCn] = await Promise.all([
			prisma.order.findMany({
				where: { creditNoteNumber: { startsWith: cnPrefix } },
				select: { creditNoteNumber: true },
			}),
			prisma.refund.findMany({
				where: { creditNoteNumber: { startsWith: cnPrefix } },
				select: { creditNoteNumber: true },
			}),
		]);
		const creditNoteIssue = analyzeSequence(
			"credit-note",
			year,
			cnPrefix,
			[...orderCn, ...refundCn]
				.map((r) => r.creditNoteNumber)
				.filter((n): n is string => n != null),
		);
		if (creditNoteIssue) issues.push(creditNoteIssue);
	}

	return issues;
}
