/**
 * Helper pour valider les variables d'environnement dans les scripts CLI
 *
 * Contrairement à shared/lib/env.ts qui valide TOUTES les variables Next.js,
 * ce helper permet de valider uniquement les variables nécessaires pour un script.
 *
 * @example
 * ```ts
 * import { getScriptEnvVar, requireScriptEnvVars } from "@/shared/utils/script-env";
 *
 * // Validation unique
 * const dbUrl = getScriptEnvVar("DATABASE_URL", "generate-blur-placeholders");
 *
 * // Validation multiple au démarrage
 * requireScriptEnvVars(["DATABASE_URL", "UPLOADTHING_TOKEN"], "generate-video-thumbnails");
 * ```
 */

/**
 * Récupère une variable d'environnement ou lance une erreur avec contexte
 *
 * @param key - Nom de la variable d'environnement
 * @param scriptName - Nom du script (pour le message d'erreur)
 * @returns Valeur de la variable
 * @throws {Error} Si la variable n'est pas définie
 */
export function getScriptEnvVar(key: string, scriptName: string): string {
	const value = process.env[key];
	if (!value) {
		console.error(`❌ [${scriptName}] Variable d'environnement manquante: ${key}`);
		console.error(`   Vérifiez votre fichier .env ou vos variables d'environnement.`);
		process.exit(1);
	}
	return value;
}

/**
 * Valide plusieurs variables d'environnement au démarrage du script
 *
 * @param keys - Liste des variables requises
 * @param scriptName - Nom du script (pour le message d'erreur)
 * @returns Record des variables validées
 */
export function requireScriptEnvVars<K extends string>(
	keys: readonly K[],
	scriptName: string
): Record<K, string> {
	const missing: string[] = [];
	const result = {} as Record<K, string>;

	for (const key of keys) {
		const value = process.env[key];
		if (!value) {
			missing.push(key);
		} else {
			result[key] = value;
		}
	}

	if (missing.length > 0) {
		console.error(`❌ [${scriptName}] Variables d'environnement manquantes:`);
		for (const key of missing) {
			console.error(`   - ${key}`);
		}
		console.error(`\n   Vérifiez votre fichier .env ou vos variables d'environnement.`);
		process.exit(1);
	}

	return result;
}
