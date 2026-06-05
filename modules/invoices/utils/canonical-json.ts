/**
 * Sérialise un payload JSON avec un ordre canonique des clés (tri lexicographique
 * récursif), permettant un SHA-256 stable indépendant de l'ordre d'insertion.
 *
 * Usage : empreinte du snapshot `InvoiceData` figé en DB (Art. L102 B LPF).
 * Deux objets sémantiquement identiques produisent la même string et donc le
 * même hash, même si les clés ont été insérées dans un ordre différent (cas
 * fréquent quand Prisma sérialise un Order vs quand le test construit un objet
 * littéral).
 *
 * Spec : RFC 8785 simplifié — UTF-8, escape standard JSON, tri lexicographique
 * Unicode code-point. Pas de gestion des nombres flottants spéciaux (NaN, Infinity)
 * car interdits en JSON et absents de `InvoiceData`.
 *
 * ⚠️ Stabilité du hash (EINV-PDF-008) : l'égalité `hash(persist) === hash(relecture)`
 * suppose que le round-trip JSONB Postgres ne réécrit pas les valeurs. Vrai pour
 * entiers/strings/bool/null/arrays — FAUX pour les flottants (Postgres peut
 * recanonicaliser `5.50`→`5.5`). Le payload `InvoiceData` est donc contraint à des
 * entiers seuls (cf. invariant en tête de `types/invoice-data.ts`).
 */
export function canonicalJsonStringify(value: unknown): string {
	return JSON.stringify(toCanonical(value));
}

function toCanonical(value: unknown): unknown {
	if (value === null || typeof value !== "object") return value;
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(toCanonical);

	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value as Record<string, unknown>).sort()) {
		sorted[key] = toCanonical((value as Record<string, unknown>)[key]);
	}
	return sorted;
}
