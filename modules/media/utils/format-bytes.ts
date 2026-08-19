/**
 * Formatage de tailles de fichiers, en français (Ko / Mo / Go).
 *
 * Extrait de `format-eta.ts` au Lot 5/S4.4 (SIMPLIFICATION.md, 2026-08-03) :
 * ce module mêlait deux sujets sans rapport — l'estimation de temps restant
 * d'un upload (retirée avec la file hors-ligne) et ce formateur, lui bien
 * vivant (9 call sites : messages « fichier trop volumineux », grille des
 * fichiers en attente, barre de progression).
 */

/**
 * Formate un nombre d'octets en libellé français court.
 *
 * ⚠️ Ko / Mo / Go, pas KB / MB / GB, et VIRGULE décimale, pas point : la copie
 * utilisateur est en français (cf. CLAUDE.md § Conventions) — « 1.0 Mo »
 * trahissait la typographie au milieu d'unités françaises.
 */
export function formatBytesShort(bytes: number): string {
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(0)} Ko`;
	}
	if (bytes < 1024 * 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
	}
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace(".", ",")} Go`;
}
