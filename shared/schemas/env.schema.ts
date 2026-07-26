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
	DATABASE_URL: z.url("DATABASE_URL doit être une URL valide"),
	// Direct (unpooled) Neon endpoint utilisé exclusivement par `prisma migrate
	// deploy` — PgBouncer (pooler) rejette les prepared statements DDL.
	DATABASE_URL_UNPOOLED: z.url().optional(),

	// ========================================
	// Authentification (Better Auth)
	// ========================================
	BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET doit avoir au moins 32 caractères"),
	BETTER_AUTH_URL: z.url(),

	// Google OAuth (optionnel)
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),

	// ========================================
	// Email (Resend)
	// ========================================
	RESEND_API_KEY: z.string().startsWith("re_", "RESEND_API_KEY doit commencer par 're_'"),
	RESEND_CONTACT_EMAIL: z.email("RESEND_CONTACT_EMAIL doit être un email valide"),
	// Adresse BCC ajoutée automatiquement aux alertes admin (refund failed,
	// invoice sequence overflow, dispute, etc.). Permet d'éviter un single
	// point of failure sur l'unique boîte admin. Optionnel.
	EMAIL_ADMIN_BCC: z.email("EMAIL_ADMIN_BCC doit être un email valide").optional(),

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
	/**
	 * Active le dry-run cron (OPS-AUDIT-006) — chaque cron logue ce qu'il
	 * aurait fait mais retourne `skipped` sans muter la DB. Utilisé en staging
	 * pour valider une nouvelle version de cron sans risquer prod.
	 *
	 * Pour activer : `CRON_DRY_RUN=true` côté Vercel Preview.
	 */
	CRON_DRY_RUN: z.enum(["true", "false"]).optional(),

	// ========================================
	// SEO & Verification (optionnel)
	// ========================================
	NEXT_PUBLIC_SITE_URL: z.url().optional(),
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
	NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
	SENTRY_ORG: z.string().optional(),
	SENTRY_PROJECT: z.string().optional(),
	// Token utilisé par le plugin Sentry Webpack pour uploader les sourcemaps
	// au build. Build-time uniquement, jamais exposé runtime.
	SENTRY_AUTH_TOKEN: z.string().optional(),

	// ========================================
	// Healthcheck (sondes externes type UptimeRobot/Better Stack)
	// ========================================
	// Si défini, `/api/health?token=<value>` renvoie le statut détaillé
	// (DB + Stripe + Resend + latences) sans nécessiter une session admin.
	// Doit être ≥32 chars pour limiter le brute-force.
	HEALTHCHECK_TOKEN: z
		.string()
		.min(32, "HEALTHCHECK_TOKEN doit avoir au moins 32 caractères")
		.optional(),

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
	VENDOR_EMAIL: z.email("VENDOR_EMAIL doit être un email valide").optional(),
	VENDOR_VAT_EXEMPTION_TEXT: z.string().min(1).optional(),
	VENDOR_LATE_PAYMENT_PENALTY_RATE: z.string().min(1).optional(),
	VENDOR_RECOVERY_FEE: z.string().min(1).optional(),
	VENDOR_INSURANCE_COMPANY: z.string().min(1).optional(),
	VENDOR_INSURANCE_CONTACT: z
		.email("VENDOR_INSURANCE_CONTACT doit être un email valide")
		.optional(),
	VENDOR_INSURANCE_COVERAGE: z.string().min(1).optional(),
	VENDOR_REGISTRY: z.string().min(1).optional(),
	VENDOR_OPERATION_NATURE: z.string().min(1).optional(),
	// Réforme facturation 2026-2027 — métadonnées Factur-X / UBL / annuaire DGFiP
	VENDOR_LEGAL_FORM: z.string().min(1).optional(),
	VENDOR_VAT_REGIME: z.enum(["FRANCHISE_BASE", "NORMAL", "SIMPLIFIE"]).optional(),
	VENDOR_EINVOICING_PLATFORM_ID: z.string().min(1).optional(),
	VENDOR_EINVOICING_ADDRESS: z.string().min(1).optional(),
	VENDOR_BANK_IBAN: z
		.string()
		.regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/, "VENDOR_BANK_IBAN doit être un IBAN valide")
		.optional(),
	VENDOR_BANK_BIC: z
		.string()
		.regex(
			/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
			"VENDOR_BANK_BIC doit être un BIC valide (8 ou 11 caractères)",
		)
		.optional(),

	// ========================================
	// Node
	// ========================================
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Type inféré des variables d'environnement validées
 */
export type Env = z.infer<typeof envSchema>;
