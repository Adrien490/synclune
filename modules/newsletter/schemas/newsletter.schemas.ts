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
		.email("Format d'email invalide")
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
		.email("Format d'email invalide"),
	token: z.string().optional(),
});

export type UnsubscribeFromNewsletterInput = z.infer<
	typeof unsubscribeFromNewsletterSchema
>;

// ============================================================================
// EXPORT SUBSCRIBERS SCHEMA
// ============================================================================

/**
 * Schema de validation pour l'export des abonnés newsletter
 *
 * Permet de spécifier des filtres optionnels pour l'export
 */
export const exportSubscribersSchema = z.object({
	/**
	 * Filtrer par statut
	 * - "active" : Seulement les abonnés actifs
	 * - "inactive" : Seulement les désabonnés
	 * - undefined : Tous les abonnés (défaut)
	 */
	status: z.enum(["active", "inactive", "all"]).optional().default("all"),

	/**
	 * Format d'export
	 * - "csv" : Format CSV (défaut)
	 */
	format: z.enum(["csv"]).optional().default("csv"),
});

export type ExportSubscribersInput = z.infer<typeof exportSubscribersSchema>;

// ============================================================================
// SEND NEWSLETTER EMAIL SCHEMA
// ============================================================================

export const sendNewsletterEmailSchema = z.object({
	subject: z
		.string()
		.min(1, "Le sujet est requis")
		.max(200, "Le sujet ne doit pas dépasser 200 caractères")
		// Validation CRLF pour éviter injection header email
		.refine((s) => !s.includes("\n") && !s.includes("\r"), {
			message: "Le sujet ne peut pas contenir de sauts de ligne",
		}),
	content: z
		.string()
		.min(10, "Le contenu doit contenir au moins 10 caractères")
		.max(5000, "Le contenu ne doit pas dépasser 5000 caractères"),
});

export type SendNewsletterEmailInput = z.infer<
	typeof sendNewsletterEmailSchema
>;

