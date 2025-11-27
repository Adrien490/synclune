import { z } from "zod";

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
	email: z.string(),
	password: z.string().min(1, { message: "Le mot de passe est requis" }),
	callbackURL: z.string(),
});

export type SignInEmailInput = z.infer<typeof signInEmailSchema>;

// ============================================================================
// SIGN IN SOCIAL SCHEMA
// ============================================================================

export const signInSocialSchema = z.object({
	provider: z.enum(["google"], {
		message: "Le provider est requis",
	}),
	callbackURL: z.string().default("/"),
});

export type SignInSocialInput = z.infer<typeof signInSocialSchema>;

// ============================================================================
// SIGN UP EMAIL SCHEMA
// ============================================================================

export const signUpEmailSchema = z
	.object({
		email: z.string().email({ message: "Format d'email invalide" }),
		password: z
			.string()
			.min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
			.max(128, {
				message: "Le mot de passe ne doit pas dépasser 128 caractères",
			}),
		confirmPassword: z
			.string()
			.min(1, { message: "La confirmation du mot de passe est requise" }),
		name: z
			.string()
			.min(2, { message: "Le prénom doit contenir au moins 2 caractères" })
			.max(100, { message: "Le prénom ne doit pas dépasser 100 caractères" }),
		callbackURL: z.string().optional(),
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
		.email("Format d'email invalide"),
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

// ============================================================================
// RESET PASSWORD SCHEMA
// ============================================================================

export const resetPasswordSchema = z
	.object({
		password: z
			.string()
			.min(8, "Le mot de passe doit contenir au moins 8 caractères")
			.max(128, "Le mot de passe ne doit pas dépasser 128 caractères"),
		confirmPassword: z
			.string()
			.min(8, "Le mot de passe doit contenir au moins 8 caractères")
			.max(128, "Le mot de passe ne doit pas dépasser 128 caractères"),
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
