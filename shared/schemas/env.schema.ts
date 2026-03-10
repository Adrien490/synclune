import { z } from "zod";

/**
 * Schéma de validation des variables d'environnement
 *
 * Les variables sont groupées par domaine fonctionnel.
 */
export const envSchema = z
	.object({
		// ========================================
		// Base de données
		// ========================================
		DATABASE_URL: z.string().url("DATABASE_URL doit être une URL valide"),

		// ========================================
		// Authentification (Better Auth)
		// ========================================
		BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET doit avoir au moins 32 caractères"),
		BETTER_AUTH_URL: z.string().url(),

		// Google OAuth (optionnel)
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),

		// ========================================
		// Email (Resend)
		// ========================================
		RESEND_API_KEY: z.string().startsWith("re_", "RESEND_API_KEY doit commencer par 're_'"),
		RESEND_CONTACT_EMAIL: z.string().email("RESEND_CONTACT_EMAIL doit être un email valide"),

		// ========================================
		// Stripe (Paiement)
		// ========================================
		STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
		STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),

		// ========================================
		// Upload (UploadThing)
		// ========================================
		UPLOADTHING_TOKEN: z.string().min(1, "UPLOADTHING_TOKEN est requis"),

		// ========================================
		// Rate Limiting (Arcjet - required in production)
		// ========================================
		ARCJET_KEY: z.string().optional(),

		// ========================================
		// Cron Jobs
		// ========================================
		CRON_SECRET: z.string().min(32, "CRON_SECRET doit avoir au moins 32 caractères"),

		// ========================================
		// SEO & Verification (optionnel)
		// ========================================
		NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
		GOOGLE_SITE_VERIFICATION: z.string().optional(),
		BING_SITE_VERIFICATION: z.string().optional(),

		// ========================================
		// Rate Limiting — Listes IP (optionnel, comma-separated)
		// ========================================
		RATE_LIMIT_WHITELIST: z.string().optional(),
		RATE_LIMIT_BLACKLIST: z.string().optional(),

		// ========================================
		// Observability (Sentry)
		// ========================================
		NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
		SENTRY_ORG: z.string().optional(),
		SENTRY_PROJECT: z.string().optional(),

		// ========================================
		// Node
		// ========================================
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	})
	.superRefine((data, ctx) => {
		if (data.NODE_ENV === "production") {
			if (!data.ARCJET_KEY) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "ARCJET_KEY est requis en production",
					path: ["ARCJET_KEY"],
				});
			}
		}
	});

/**
 * Type inféré des variables d'environnement validées
 */
export type Env = z.infer<typeof envSchema>;
