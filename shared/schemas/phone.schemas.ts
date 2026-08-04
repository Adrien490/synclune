import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";
import { z } from "zod";

// ============================================================================
// PHONE SCHEMAS
// ============================================================================

/**
 * Messages d'erreur pour les validations telephone
 */
export const PHONE_ERROR_MESSAGES = {
	REQUIRED: "Le numéro de téléphone est requis",
	INVALID: "Numéro de téléphone invalide",
} as const;

/**
 * Longueur maximale — alignée sur `Order.shippingPhone`, `VarChar(20)`. C'est
 * depuis le 2026-08-04 la seule colonne de téléphone du modèle Order.
 *
 * L'E.164 plafonne à 15 chiffres + `+`, soit 16 caractères : la marge est confortable
 * **une fois la normalisation appliquée**. C'est bien la normalisation qui compte,
 * pas la borne — cf. ci-dessous.
 */
export const PHONE_MAX_LENGTH = 20;

/**
 * Schema telephone avec validation internationale et normalisation E.164.
 *
 * Utilise libphonenumber-js (SSR-compatible) pour valider ET reformater.
 *
 * ⚠️ Le `.transform()` n'est pas cosmétique — c'est lui qui rend la borne tenable.
 * `isValidPhoneNumber` est un simple prédicat : la valeur écrite en base était la
 * chaîne BRUTE saisie. Sur le tunnel checkout le risque restait masqué par
 * `PhoneField` (react-phone-number-input émet déjà de l'E.164), mais deux chemins y
 * échappaient :
 *  - l'édition client admin (`edit-customer-info-form`), un `<input type="tel">` nu
 *    où `+33 (0)6 12 34 56 78` fait pile 20 caractères — un séparateur de plus
 *    débordait la colonne ;
 *  - `confirmCheckout`, action publique, où `"+33612345678 ext. 1234"` (22
 *    caractères) passe `isValidPhoneNumber` — libphonenumber accepte les extensions.
 *
 * Normaliser à la frontière donne en prime une forme unique en base, donc des
 * comparaisons et un affichage cohérents entre checkout, admin et emails.
 */
export const phoneSchema = z
	.string()
	.trim()
	.min(1, PHONE_ERROR_MESSAGES.REQUIRED)
	.refine(isValidPhoneNumber, { message: PHONE_ERROR_MESSAGES.INVALID })
	.transform((value) => {
		// `isValidPhoneNumber` vient de passer, mais `parsePhoneNumber` throw sur les
		// entrées qu'il ne sait pas découper : on retombe sur la valeur d'origine
		// plutôt que de faire échouer une saisie déjà jugée valide.
		try {
			return parsePhoneNumber(value).format("E.164");
		} catch {
			return value;
		}
	})
	// Filet APRÈS normalisation : garantit la colonne `VarChar(20)` même si le
	// fallback ci-dessus a laissé passer la chaîne brute.
	//
	// `.pipe(z.string().max(…))` plutôt qu'un `.refine(v => v.length <= …)` : les deux
	// rejettent la même chose, mais seul le premier expose la borne à
	// l'introspection — un `refine` est une fonction opaque, et
	// `zod-prisma-length-parity.contract.test.ts` ne pourrait pas la comparer à la
	// colonne `VarChar(20)`.
	.pipe(z.string().max(PHONE_MAX_LENGTH, { message: PHONE_ERROR_MESSAGES.INVALID }));

/**
 * Type infere du schema telephone
 */
type PhoneInput = z.infer<typeof phoneSchema>;
