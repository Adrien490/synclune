/**
 * Version du FORMAT du payload `InvoiceData` figé dans `Order.invoiceDataSnapshot`.
 *
 * ⚠️ Ce n'est pas `InvoiceData.invoiceFormat` (« PDF ») : celui-là décrit le format
 * de **rendu**, celui-ci la forme des **données**.
 *
 * Pourquoi une version (audit schéma 2026-07-30) — le snapshot EST la facture au sens
 * comptable (Art. L102 B LPF), conservée **10 ans** et restituable à l'identique. Le
 * chemin de lecture (`verifyInvoiceSnapshot`) re-hashe puis rend le JSONB relu par un
 * `as InvoiceData` : un cast, pas une validation. Sans marqueur de version, le jour où
 * un champ est ajouté, renommé ou change de sens, plus rien ne permet de savoir quelle
 * forme porte une ligne donnée — le cast rend `undefined` en silence sur les anciennes,
 * et le hash, lui, reste valide (il porte sur le JSON stocké, pas sur la forme
 * attendue). Deux changements de format sont déjà au calendrier : bascule de la mention
 * CGI → CIBS au 31/12/2027 et réécriture de l'e-reporting au go-live (sept. 2027).
 *
 * RÈGLE — incrémenter à CHAQUE changement de forme du payload (ajout, retrait,
 * renommage, changement d'unité ou de sémantique d'un champ), et gérer explicitement
 * l'ancienne version côté lecture. Un `formatVersion` absent vaut `1` : les snapshots
 * écrits avant l'introduction de ce champ en portent la forme.
 *
 * La version vit **dans le payload**, donc sous le SHA-256 : elle est aussi
 * infalsifiable que le reste de la facture. Une colonne `Order.invoiceDataVersion`
 * serait hors hash et pourrait dériver du contenu qu'elle prétend décrire — et « quelles
 * commandes sont en v1 ? » se répond par un scan de ≤ 2400 lignes JSONB, instantané.
 *
 * Entier obligatoire : l'invariant « entiers seuls » (EINV-PDF-008, cf. en-tête de
 * `types/invoice-data.ts`) tient à ce que le round-trip JSONB Postgres soit byte-stable.
 */
export const INVOICE_DATA_FORMAT_VERSION = 1;

/** Forme implicite des snapshots écrits avant l'introduction de `formatVersion`. */
export const LEGACY_INVOICE_DATA_FORMAT_VERSION = 1;

/**
 * Lit la version de format d'un snapshot relu depuis la base. Un snapshot sans le
 * champ (ou avec une valeur non entière) est traité comme la forme legacy — c'est
 * le comportement voulu : rétro-compatibilité par défaut, pas d'échec sur l'existant.
 */
export function readInvoiceDataFormatVersion(snapshot: unknown): number {
	if (snapshot === null || typeof snapshot !== "object") return LEGACY_INVOICE_DATA_FORMAT_VERSION;
	const raw = (snapshot as { formatVersion?: unknown }).formatVersion;
	if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1) {
		return LEGACY_INVOICE_DATA_FORMAT_VERSION;
	}
	return raw;
}
