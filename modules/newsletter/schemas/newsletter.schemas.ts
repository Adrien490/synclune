import { z } from "zod";

// ============================================================================
// SUBSCRIBE TO NEWSLETTER SCHEMA
// ============================================================================

/**
 * Liste des domaines d'emails jetables/temporaires à bloquer (fallback)
 * Ces services sont souvent utilisés pour du spam ou des inscriptions frauduleuses
 *
 * Note : Arcjet maintient une base de données beaucoup plus complète,
 * cette liste sert de fallback si Arcjet n'est pas disponible.
 */
const DISPOSABLE_EMAIL_DOMAINS = [
	"10minutemail.com",
	"guerrillamail.com",
	"yopmail.com",
	"tempmail.com",
	"mailinator.com",
	"throwaway.email",
	"temp-mail.org",
	"getairmail.com",
	"trashmail.com",
	"maildrop.cc",
];

/**
 * Corrections automatiques des typos courantes dans les domaines email
 * Améliore l'expérience utilisateur en corrigeant les erreurs de frappe
 */
const COMMON_TYPO_CORRECTIONS: Record<string, string> = {
	"gmial.com": "gmail.com",
	"gmai.com": "gmail.com",
	"gmil.com": "gmail.com",
	"yahooo.com": "yahoo.com",
	"yaho.com": "yahoo.com",
	"hotmial.com": "hotmail.com",
	"hotmail.fr": "hotmail.fr", // Valide, pas de correction
	"outloook.com": "outlook.com",
	"outlok.com": "outlook.com",
};

export const subscribeToNewsletterSchema = z.object({
	email: z
		.email("Vérifiez le format de votre email (ex: nom@domaine.com)")
		.transform((email) => {
			// Auto-correction des typos courantes
			const [localPart, domain] = email.split("@");
			if (!domain) return email; // Email invalide, sera rejeté par z.email()

			const correctedDomain =
				COMMON_TYPO_CORRECTIONS[domain.toLowerCase()] || domain;
			return `${localPart}@${correctedDomain}`;
		})
		.refine(
			(email) => {
				// Vérifier que le domaine n'est pas jetable
				// Note : Arcjet valide également les emails jetables au niveau du server action
				const domain = email.split("@")[1]?.toLowerCase();
				return !DISPOSABLE_EMAIL_DOMAINS.includes(domain || "");
			},
			{
				message:
					"Les adresses email temporaires ne sont pas acceptées. Merci d'utiliser votre email principal 💝",
			}
		),
	consent: z
		.boolean()
		.refine((val) => val === true, {
			message: "Vous devez accepter de recevoir la newsletter",
		}),
});

export type SubscribeToNewsletterInput = z.infer<
	typeof subscribeToNewsletterSchema
>;

// ============================================================================
// UNSUBSCRIBE FROM NEWSLETTER SCHEMA
// ============================================================================

export const unsubscribeFromNewsletterSchema = z.object({
	email: z
		.string()
		.min(1, "L'email est requis")
		.email("Vérifiez le format de votre email (ex: nom@domaine.com)"),
	token: z.string().optional(),
});

export type UnsubscribeFromNewsletterInput = z.infer<
	typeof unsubscribeFromNewsletterSchema
>;

// ============================================================================
// CONFIRMATION TOKEN SCHEMA
// ============================================================================

/**
 * Regex UUID v4 strict pour valider les tokens de confirmation
 * randomUUID() génère des UUIDs v4 qui suivent ce format
 */
const UUID_V4_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const confirmationTokenSchema = z.object({
	token: z
		.string({ message: "Token de confirmation manquant" })
		.min(1, "Token de confirmation manquant")
		.refine((val) => UUID_V4_REGEX.test(val), {
			message: "Token de confirmation invalide",
		}),
});

export type ConfirmationTokenInput = z.infer<typeof confirmationTokenSchema>;

// ============================================================================
// UNSUBSCRIBE TOKEN SCHEMA
// ============================================================================

export const unsubscribeTokenSchema = z.object({
	token: z
		.string({ message: "Token de désinscription manquant" })
		.min(1, "Token de désinscription manquant")
		.refine((val) => UUID_V4_REGEX.test(val), {
			message: "Token de désinscription invalide",
		}),
});

export type UnsubscribeTokenInput = z.infer<typeof unsubscribeTokenSchema>;
