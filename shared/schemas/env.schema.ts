import { z } from "zod";

/**
 * Schéma de validation des variables d'environnement
 *
 * Les variables sont groupées par domaine fonctionnel.
 */
export const envSchema = z.object({
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
	// Address Autocomplete (Geoapify - EU countries)
	// ========================================
	GEOAPIFY_API_KEY: z
		.string()
		.min(1, "GEOAPIFY_API_KEY is required for EU address autocomplete")
		.optional(),

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
	// Deployment
	// ========================================
	DEPLOY_DATE: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "DEPLOY_DATE doit être au format YYYY-MM-DD")
		.optional(),
	NEXT_PUBLIC_SITE_PUBLISHED_AT: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "NEXT_PUBLIC_SITE_PUBLISHED_AT doit être au format YYYY-MM-DD")
		.optional(),

	// ========================================
	// Facturation électronique — vendeur (Synclune)
	// ========================================
	// Si non définies, getVendorLegalInfo() (shared/lib/stripe.ts) utilise des
	// fallbacks. Toute valeur définie ici DOIT respecter le format légal pour
	// éviter qu'une faute de frappe dans .env ne se propage sur des factures
	// archivées 10 ans (Art. L102 B LPF).
	VENDOR_LEGAL_NAME: z.string().min(1).optional(),
	VENDOR_TRADE_NAME: z.string().min(1).optional(),
	VENDOR_SIREN: z
		.string()
		.regex(
			/^\d{3}\s?\d{3}\s?\d{3}$/,
			"VENDOR_SIREN doit avoir 9 chiffres (avec ou sans espaces). Ex: '839 183 027'",
		)
		.optional(),
	VENDOR_SIRET: z
		.string()
		.regex(
			/^\d{3}\s?\d{3}\s?\d{3}\s?\d{5}$/,
			"VENDOR_SIRET doit avoir 14 chiffres (avec ou sans espaces). Ex: '839 183 027 00037'",
		)
		.optional(),
	VENDOR_VAT_NUMBER: z
		.string()
		.regex(
			/^FR[A-Z0-9]{2}\d{9}$/,
			"VENDOR_VAT_NUMBER doit suivre le format FR (FR + 2 chiffres/lettres + 9 chiffres SIREN). Ex: 'FR35839183027'",
		)
		.optional(),
	VENDOR_APE_CODE: z
		.string()
		.regex(/^\d{2}\.\d{2}[A-Z]$/, "VENDOR_APE_CODE doit être au format NN.NNL. Ex: '47.91B'")
		.optional(),
	VENDOR_FULL_ADDRESS: z.string().min(1).optional(),
	VENDOR_EMAIL: z.string().email("VENDOR_EMAIL doit être un email valide").optional(),
	VENDOR_VAT_EXEMPTION_TEXT: z.string().min(1).optional(),
	VENDOR_LATE_PAYMENT_PENALTY_RATE: z.string().min(1).optional(),
	VENDOR_RECOVERY_FEE: z.string().min(1).optional(),
	VENDOR_INSURANCE_COMPANY: z.string().min(1).optional(),
	VENDOR_INSURANCE_CONTACT: z
		.string()
		.email("VENDOR_INSURANCE_CONTACT doit être un email valide")
		.optional(),
	VENDOR_INSURANCE_COVERAGE: z.string().min(1).optional(),
	VENDOR_REGISTRY: z.string().min(1).optional(),
	VENDOR_OPERATION_NATURE: z.string().min(1).optional(),

	// ========================================
	// Node
	// ========================================
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Type inféré des variables d'environnement validées
 */
export type Env = z.infer<typeof envSchema>;
