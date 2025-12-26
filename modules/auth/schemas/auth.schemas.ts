import { z } from "zod";

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

/**
 * Schéma de validation pour les URLs de callback
 * Protège contre les Open Redirect en n'autorisant que les URLs relatives
 */
export const callbackURLSchema = z
	.string()
	.refine((url) => url.startsWith("/") && !url.startsWith("//"), {
		message: "URL de redirection invalide",
	})
	.default("/");

/**
 * Compte le nombre de types de caractères différents
 */
function countCharacterTypes(password: string): number {
	let count = 0;
	if (/[A-Z]/.test(password)) count++;
	if (/[a-z]/.test(password)) count++;
	if (/[0-9]/.test(password)) count++;
	if (/[^A-Za-z0-9]/.test(password)) count++;
	return count;
}

/**
 * Schéma de validation pour les nouveaux mots de passe
 * Simplifié selon Baymard Institute pour réduire l'abandon de 18%
 * Exige: 8 caractères + 2 types de caractères différents
 */
export const newPasswordSchema = z
	.string()
	.min(8, "Le mot de passe doit contenir au moins 8 caractères")
	.max(128, "Le mot de passe ne doit pas dépasser 128 caractères")
	.refine(
		(password) => countCharacterTypes(password) >= 2,
		"Le mot de passe doit contenir au moins 2 types de caractères (lettre, chiffre, symbole)"
	);

// ============================================================================
// CHANGE PASSWORD SCHEMA
// ============================================================================

export const changePasswordSchema = z
	.object({
		currentPassword: z
			.string()
			.min(1, "Le mot de passe actuel est requis"),
		newPassword: z
			.string()
			.min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères")
			.max(128, "Le nouveau mot de passe ne doit pas dépasser 128 caractères"),
		confirmPassword: z
			.string()
			.min(8, "Le mot de passe doit contenir au moins 8 caractères")
			.max(128, "Le mot de passe ne doit pas dépasser 128 caractères"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Les mots de passe ne correspondent pas",
		path: ["confirmPassword"],
	})
	.refine((data) => data.currentPassword !== data.newPassword, {
		message: "Le nouveau mot de passe doit être différent de l'ancien",
		path: ["newPassword"],
	});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================================================
// SIGN IN EMAIL SCHEMA
// ============================================================================

export const signInEmailSchema = z.object({
	email: z
		.string()
		.min(1, "L'email est requis")
		.email("Format d'email invalide")
		.toLowerCase()
		.trim(),
	password: z.string().min(1, { message: "Le mot de passe est requis" }),
	callbackURL: callbackURLSchema,
});

export type SignInEmailInput = z.infer<typeof signInEmailSchema>;

// ============================================================================
// SIGN IN SOCIAL SCHEMA
// ============================================================================

export const signInSocialSchema = z.object({
	provider: z.enum(["google"], {
		message: "Le provider est requis",
	}),
	callbackURL: callbackURLSchema,
});

export type SignInSocialInput = z.infer<typeof signInSocialSchema>;

// ============================================================================
// SIGN UP EMAIL SCHEMA
// ============================================================================

export const signUpEmailSchema = z
	.object({
		email: z.email({ message: "Format d'email invalide" }),
		password: newPasswordSchema,
		confirmPassword: z
			.string()
			.min(1, { message: "La confirmation du mot de passe est requise" }),
		name: z
			.string()
			.min(2, { message: "Le prénom doit contenir au moins 2 caractères" })
			.max(100, { message: "Le prénom ne doit pas dépasser 100 caractères" }),
		termsAccepted: z.literal(true, {
			message: "Tu dois accepter les conditions générales et la politique de confidentialité",
		}),
		callbackURL: callbackURLSchema.optional(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Les mots de passe ne correspondent pas",
		path: ["confirmPassword"],
	});

export type SignUpEmailInput = z.infer<typeof signUpEmailSchema>;

// ============================================================================
// REQUEST PASSWORD RESET SCHEMA
// ============================================================================

export const requestPasswordResetSchema = z.object({
	email: z
		.string()
		.min(1, "L'email est requis")
		.email("Format d'email invalide")
		.toLowerCase()
		.trim(),
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

// ============================================================================
// RESET PASSWORD SCHEMA
// ============================================================================

export const resetPasswordSchema = z
	.object({
		password: newPasswordSchema,
		confirmPassword: z
			.string()
			.min(1, "La confirmation du mot de passe est requise"),
		token: z.string().min(1, "Le token est requis"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Les mots de passe ne correspondent pas",
		path: ["confirmPassword"],
	});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// RESEND VERIFICATION EMAIL SCHEMA
// ============================================================================

export const resendVerificationEmailSchema = z.object({
	email: z
		.string()
		.min(1, "L'email est requis")
		.email("Format d'email invalide")
		.toLowerCase()
		.trim(),
});

export type ResendVerificationEmailInput = z.infer<typeof resendVerificationEmailSchema>;
