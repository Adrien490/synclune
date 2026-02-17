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
	BETTER_AUTH_SECRET: z
		.string()
		.min(32, "BETTER_AUTH_SECRET doit avoir au moins 32 caractères"),
	NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url(),

	// Google OAuth (optionnel)
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),

	// ========================================
	// Email (Resend)
	// ========================================
	RESEND_API_KEY: z
		.string()
		.startsWith("re_", "RESEND_API_KEY doit commencer par 're_'"),
	RESEND_CONTACT_EMAIL: z
		.string()
		.email("RESEND_CONTACT_EMAIL doit être un email valide"),
	CONTACT_ADRIEN_EMAIL: z
		.string()
		.email("CONTACT_ADRIEN_EMAIL doit être un email valide"),

	// ========================================
	// Stripe (Paiement)
	// ========================================
	STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
	STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
	NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),

	// Shipping Rates (requis pour le checkout)
	STRIPE_SHIPPING_RATE_FRANCE: z
		.string()
		.startsWith("shr_", "STRIPE_SHIPPING_RATE_FRANCE doit être un ID Stripe valide (shr_xxx)"),
	STRIPE_SHIPPING_RATE_CORSE: z
		.string()
		.startsWith("shr_", "STRIPE_SHIPPING_RATE_CORSE doit être un ID Stripe valide (shr_xxx)"),
	STRIPE_SHIPPING_RATE_EUROPE: z
		.string()
		.startsWith("shr_", "STRIPE_SHIPPING_RATE_EUROPE doit être un ID Stripe valide (shr_xxx)"),

	// ========================================
	// Upload (UploadThing)
	// ========================================
	UPLOADTHING_TOKEN: z.string().min(1, "UPLOADTHING_TOKEN est requis"),

	// ========================================
	// Rate Limiting (Arcjet - optionnel)
	// ========================================
	ARCJET_KEY: z.string().optional(),

	// ========================================
	// Rate Limiting (Upstash Redis - optionnel en dev)
	// ========================================
	UPSTASH_REDIS_REST_URL: z.string().url().optional(),
	UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

	// ========================================
	// Node
	// ========================================
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
});

/**
 * Type inféré des variables d'environnement validées
 */
export type Env = z.infer<typeof envSchema>;
