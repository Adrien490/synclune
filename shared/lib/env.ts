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

import { envSchema, type Env } from "@/shared/schemas/env.schema";

export type { Env };

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

