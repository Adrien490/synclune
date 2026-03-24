/**
 * Validates that required environment variables are defined for CLI scripts.
 *
 * @param keys - Array of required env var names
 * @param scriptName - Script name for error messages
 * @returns Typed object with all required env vars as non-empty strings
 *
 * @example
 * ```ts
 * const env = requireScriptEnvVars(["DATABASE_URL", "UPLOADTHING_TOKEN"] as const, "my-script");
 * // env.DATABASE_URL: string (guaranteed non-empty)
 * ```
 */
export function requireScriptEnvVars<T extends readonly string[]>(
	keys: T,
	scriptName: string,
): Record<T[number], string> {
	const missing: string[] = [];

	for (const key of keys) {
		if (!process.env[key]) {
			missing.push(key);
		}
	}

	if (missing.length > 0) {
		console.error(`\n[${scriptName}] Variables d'environnement manquantes:`);
		for (const key of missing) {
			console.error(`  - ${key}`);
		}
		console.error(`\nAssurez-vous que ces variables sont definies dans .env\n`);
		process.exit(1);
	}

	const result = {} as Record<string, string>;
	for (const key of keys) {
		result[key] = process.env[key]!;
	}

	return result as Record<T[number], string>;
}
