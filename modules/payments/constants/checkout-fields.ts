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
