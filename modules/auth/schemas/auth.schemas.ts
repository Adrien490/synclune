import { z } from "zod";
import { emailSchema } from "@/shared/schemas/email.schemas";

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
 * Schéma de validation pour les nouveaux mots de passe
 * Aligned with AUTH_PASSWORD_CONFIG.minLength (8 chars)
 */
export const newPasswordSchema = z
	.string()
	.min(8, "Le mot de passe doit contenir au moins 8 caractères")
	.max(128, "Le mot de passe ne doit pas dépasser 128 caractères");

// ============================================================================
// CHANGE PASSWORD SCHEMA
// ============================================================================

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
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

// ============================================================================
// SIGN IN EMAIL SCHEMA
// ============================================================================

export const signInEmailSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, { message: "Le mot de passe est requis" }),
	callbackURL: callbackURLSchema,
});

// ============================================================================
// SIGN IN SOCIAL SCHEMA
// ============================================================================

export const signInSocialSchema = z.object({
	provider: z.enum(["google", "apple"], {
		message: "Le provider est requis",
	}),
	callbackURL: callbackURLSchema,
});

// ============================================================================
// SIGN UP EMAIL SCHEMA
// ============================================================================

export const signUpEmailSchema = z.object({
	// SSOT partagé (F8) : même message INVALID_FORMAT + lowercase/trim
	email: emailSchema,
	password: newPasswordSchema,
	name: z
		.string()
		.min(2, { message: "Le prénom doit contenir au moins 2 caractères" })
		.max(100, { message: "Le prénom ne doit pas dépasser 100 caractères" }),
	acceptTerms: z.string().refine((v) => v === "true", {
		message: "Vous devez accepter les CGV et la politique de confidentialité",
	}),
	callbackURL: callbackURLSchema.optional(),
});

/**
 * F7 (audit validation Zod 2026-07-06) — validator TanStack Form du sign-up,
 * dérivé champ-à-champ du schéma serveur `signUpEmailSchema` (SSOT : plus de
 * validators inline dupliqués avec regex email divergente dans le composant).
 *
 * Seule différence : `acceptTerms` — le form state est un boolean (checkbox)
 * alors que le serveur reçoit la string FormData `"true"`.
 */
export const signUpEmailClientSchema = z.object({
	email: signUpEmailSchema.shape.email,
	password: signUpEmailSchema.shape.password,
	name: signUpEmailSchema.shape.name,
	acceptTerms: z.literal(true, {
		message: "Vous devez accepter les CGV et la politique de confidentialité",
	}),
});

// ============================================================================
// REQUEST PASSWORD RESET SCHEMA
// ============================================================================

export const requestPasswordResetSchema = z.object({
	email: emailSchema,
});

// ============================================================================
// RESET PASSWORD SCHEMA
// ============================================================================

export const resetPasswordSchema = z
	.object({
		password: newPasswordSchema,
		confirmPassword: z.string().min(1, "La confirmation du mot de passe est requise"),
		token: z.string().min(1, "Le token est requis"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Les mots de passe ne correspondent pas",
		path: ["confirmPassword"],
	});

// ============================================================================
// RESEND VERIFICATION EMAIL SCHEMA
// ============================================================================

export const resendVerificationEmailSchema = z.object({
	email: emailSchema,
});
