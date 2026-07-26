import { z } from "zod";

/**
 * F5 (audit validation Zod 2026-07-06) — booléen de formulaire/filtre sûr.
 *
 * Remplace `z.coerce.boolean()`, dont la sémantique est piégeuse : toute
 * chaîne non vide (y compris `"false"`) est coercée en `true` — un
 * `?filter_invoiceAnomaly=false` activait le filtre.
 *
 * `z.stringbool()` (Zod 4) parse les chaînes explicites ("true"/"false",
 * "1"/"0", "on"/"off", "yes"/"no", case-insensitive) et REJETTE le reste
 * (""/garbage → erreur de validation au lieu d'un true silencieux).
 * L'union accepte aussi les booléens natifs : certains producteurs
 * (extracteurs FormData avec fallback `?? true`, parseurs admin qui
 * normalisent en amont) passent déjà un boolean.
 */
export const formBooleanSchema = z.union([z.boolean(), z.stringbool()]);
