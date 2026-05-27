import { z } from "zod";

/**
 * Identifiants fiscaux entreprise pour facturation électronique 2026-2027
 * (Art. 286 CGI, Directive EU 2014/55).
 *
 * Les schemas valident le format CANONIQUE (chiffres uniquement, sans espaces).
 * À utiliser systématiquement avec `normalizeSiren` / `normalizeSiret` /
 * `normalizeVatNumber` côté Server Action pour absorber les saisies
 * utilisateur avec espaces ou points (formats INSEE habituels).
 */

/**
 * SIREN : 9 chiffres, format INSEE canonique.
 * Ex: "839183027". La validation de la clé de Luhn n'est PAS effectuée ici
 * (l'API Sirene la garantit déjà côté source).
 */
export const sirenSchema = z
	.string()
	.regex(/^[0-9]{9}$/, "SIREN doit contenir exactement 9 chiffres");

/**
 * SIRET : 14 chiffres = SIREN (9) + NIC établissement (5).
 * Ex: "83918302700037".
 */
export const siretSchema = z
	.string()
	.regex(/^[0-9]{14}$/, "SIRET doit contenir exactement 14 chiffres");

/**
 * Numéro TVA intra-communautaire : ISO 3166-1 alpha-2 + identifiant national.
 *
 * Format FR : `FR` + 2 caractères clé + 9 chiffres SIREN. La clé peut
 * contenir des lettres (ex: "FR3A839183027"), d'où `[A-Z0-9]{2}`.
 *
 * On accepte aussi les autres pays UE (DE12345678901, IT12345678901, etc.)
 * pour préparer le futur export intra-communautaire B2B. Si Synclune émet
 * uniquement pour des clients FR, valider en plus côté Server Action que
 * `vatNumber.startsWith("FR")`.
 */
export const vatNumberSchema = z
	.string()
	.regex(
		/^[A-Z]{2}[A-Z0-9]{2,13}$/,
		"Numéro TVA doit suivre le format intra-UE (ex: FR35839183027)",
	);

/**
 * Code APE : `NN.NNL`, format INSEE.
 * Ex: "47.91B" pour la vente à distance sur catalogue spécialisé.
 */
export const apeCodeSchema = z
	.string()
	.regex(/^[0-9]{2}\.[0-9]{2}[A-Z]$/, "Code APE doit suivre le format NN.NNL (ex: 47.91B)");

/**
 * Strip spaces and dots from a SIREN/SIRET/VAT input. Returns the canonical
 * form ready to feed into the schema and persist in DB. Returns null for
 * null/undefined/empty inputs.
 */
export function normalizeFiscalIdentifier(input: string | null | undefined): string | null {
	if (!input) return null;
	const stripped = input.replaceAll(/[\s.]/g, "").toUpperCase();
	return stripped.length === 0 ? null : stripped;
}
