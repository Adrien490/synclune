import type { ErrorSummaryField } from "@/shared/components/forms/error-summary";

/**
 * Mapping des champs du formulaire checkout vers leurs labels FR
 * et leur section parente (Contact, Livraison).
 *
 * Source unique partagée entre :
 * - `CheckoutFormBody` (ErrorSummary en tête de formulaire)
 * - `PayButton` (hint sections incomplètes)
 */
export const CHECKOUT_FIELD_LABELS: Record<string, string> = {
	email: "Adresse email",
	"shipping.fullName": "Nom complet",
	"shipping.addressLine1": "Adresse",
	"shipping.postalCode": "Code postal",
	"shipping.city": "Ville",
	"shipping.country": "Pays",
	"shipping.phoneNumber": "Téléphone",
};

const CHECKOUT_FIELD_TO_SECTION: Record<string, string> = {
	email: "Contact",
	"shipping.fullName": "Livraison",
	"shipping.addressLine1": "Livraison",
	"shipping.postalCode": "Livraison",
	"shipping.city": "Livraison",
	"shipping.country": "Livraison",
	"shipping.phoneNumber": "Livraison",
};

/**
 * Projette le `fieldMeta` de TanStack Form vers les entrées de l'`ErrorSummary`
 * en tête de formulaire : ne garde que les champs réellement en erreur et
 * traduit leur path en libellé FR (fallback sur le path si non mappé).
 *
 * Extrait du JSX pour rester testable sans monter tout `CheckoutFormBody`
 * (Stripe Elements en import dynamique, récapitulatif, sections…).
 */
export function buildCheckoutFieldErrors(
	fieldMeta: Record<string, { errors: string[] }>,
): ErrorSummaryField[] {
	return Object.entries(fieldMeta)
		.filter(([, meta]) => meta.errors.length > 0)
		.map(([name, meta]) => ({
			name,
			label: CHECKOUT_FIELD_LABELS[name] ?? name,
			message: meta.errors[0] as string,
		}));
}

/**
 * Champs REQUIS par section, pour l'état « complété » du filet d'accent.
 *
 * ⚠️ Sous-ensemble volontaire de `CHECKOUT_FIELD_TO_SECTION` : `addressLine2`
 * est optionnel et n'y figure pas — l'inclure empêcherait à jamais la section
 * Livraison d'être marquée complète.
 */
const CHECKOUT_SECTION_REQUIRED: Record<string, readonly string[]> = {
	Contact: ["email"],
	Livraison: [
		"shipping.fullName",
		"shipping.addressLine1",
		"shipping.postalCode",
		"shipping.city",
		"shipping.country",
		"shipping.phoneNumber",
	],
};

/**
 * Sections dont TOUS les champs requis sont renseignés et sans erreur.
 *
 * Fonction pure sur deux listes de paths plutôt que sur l'état du formulaire :
 * c'est ce qui la rend testable sans monter `CheckoutFormBody` (Stripe Elements
 * en import dynamique, récapitulatif, quatre sections).
 *
 * ⚠️ « Aucune erreur » ne suffit PAS : la validation est en `mode: "blur"`, donc
 * un formulaire vierge n'a aucune erreur et afficherait « complété » partout.
 * D'où la double condition — rempli ET valide.
 *
 * `isGuest: false` ⇒ la section Contact n'a aucune saisie (l'email est affiché,
 * pas demandé) : elle est complète par construction.
 */
export function getCompletedSections(
	filledPaths: readonly string[],
	invalidPaths: readonly string[],
	isGuest: boolean,
): string[] {
	const filled = new Set(filledPaths);
	const invalid = new Set(invalidPaths);

	return Object.entries(CHECKOUT_SECTION_REQUIRED)
		.filter(([section, required]) => {
			if (section === "Contact" && !isGuest) return true;
			return required.every((path) => filled.has(path) && !invalid.has(path));
		})
		.map(([section]) => section);
}

/**
 * Retourne la liste ordonnée des sections (sans doublons) à corriger
 * à partir d'une liste de paths de champs en erreur.
 */
export function getIncompleteSections(fieldPaths: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const path of fieldPaths) {
		const section = CHECKOUT_FIELD_TO_SECTION[path];
		if (section && !seen.has(section)) {
			seen.add(section);
			out.push(section);
		}
	}
	return out;
}
