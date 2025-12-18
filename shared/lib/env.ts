/**
 * Validation centralisée des variables d'environnement
 *
 * Ce fichier valide toutes les variables d'environnement au démarrage de l'application.
 * Si une variable requise est manquante ou invalide, une erreur est levée immédiatement.
 *
 * Avantages :
 * - Détection précoce des erreurs de configuration
 * - Type-safety sur toutes les variables d'environnement
 * - Documentation centralisée des variables requises
 */

import { z } from "zod";

/**
 * Schéma de validation des variables d'environnement
 *
 * Les variables sont groupées par domaine fonctionnel.
 */
const envSchema = z.object({
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

/**
 * Valide les variables d'environnement au runtime
 *
 * Cette fonction est appelée une seule fois au démarrage.
 * Si la validation échoue, une erreur détaillée est affichée dans la console.
 */
function validateEnv(): Env {
	const parsed = envSchema.safeParse(process.env);

	if (!parsed.success) {
		// Afficher les erreurs de manière lisible
		console.error("❌ Variables d'environnement invalides:");
		console.error("");

		const errors = parsed.error.flatten().fieldErrors;
		for (const [key, messages] of Object.entries(errors)) {
			console.error(`  ${key}:`);
			messages?.forEach((msg) => console.error(`    - ${msg}`));
		}

		console.error("");
		console.error("Vérifiez votre fichier .env ou vos variables d'environnement.");

		throw new Error(
			"Configuration invalide. Consultez les logs pour plus de détails."
		);
	}

	return parsed.data;
}

/**
 * Variables d'environnement validées
 *
 * Singleton - validé une seule fois au démarrage.
 * Utiliser `env.VARIABLE_NAME` au lieu de `process.env.VARIABLE_NAME`.
 *
 * @example
 * ```ts
 * import { env } from "@/shared/lib/env";
 *
 * // Type-safe et garanti d'exister
 * const apiKey = env.RESEND_API_KEY;
 * ```
 */
export const env = validateEnv();

/**
 * Helper pour accéder à une variable d'environnement avec validation
 *
 * Utile quand vous avez besoin d'une variable qui n'est pas dans le schéma principal.
 *
 * @param key - Le nom de la variable d'environnement
 * @param context - Description du contexte (pour le message d'erreur)
 * @returns La valeur de la variable
 * @throws Si la variable n'existe pas
 *
 * @example
 * ```ts
 * const customVar = getEnvOrThrow("MY_CUSTOM_VAR", "Module X");
 * ```
 */
export function getEnvOrThrow(key: string, context: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Variable d'environnement manquante: ${key} (${context})`);
	}
	return value;
}

/**
 * Helper pour accéder à une variable d'environnement optionnelle
 *
 * @param key - Le nom de la variable d'environnement
 * @param defaultValue - Valeur par défaut si la variable n'existe pas
 * @returns La valeur de la variable ou la valeur par défaut
 */
export function getEnvOrDefault(key: string, defaultValue: string): string {
	return process.env[key] || defaultValue;
}
