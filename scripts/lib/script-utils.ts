/**
 * Utilitaires partagés pour les scripts de migration
 *
 * Ces utilitaires sont utilisés par:
 * - scripts/generate-blur-placeholders.ts
 * - scripts/generate-video-thumbnails.ts
 *
 * @module scripts/lib/script-utils
 */

import type { StructuredLog } from "../../modules/media/types/script.types";

// ============================================================================
// DÉLAI & RETRY
// ============================================================================

/**
 * Attendre un délai
 *
 * @param ms - Délai en millisecondes
 * @returns Promise qui se résout après le délai
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Détermine si une erreur est temporaire et mérite un retry
 *
 * @param error - Erreur à analyser
 * @returns true si l'erreur est potentiellement temporaire
 */
export function isRetryableError(error: unknown): boolean {
	if (!(error instanceof Error)) return true;
	const message = error.message.toLowerCase();

	// Timeout ou abort -> retry
	if (error.name === "AbortError" || message.includes("timeout")) return true;

	// Erreurs HTTP: 4xx permanentes (sauf 408, 429)
	const httpMatch = message.match(/http\s*(\d{3})/i);
	if (httpMatch) {
		const code = parseInt(httpMatch[1], 10);
		if (code >= 400 && code < 500 && code !== 408 && code !== 429) return false;
		return true;
	}

	// Erreurs réseau -> retry
	if (message.includes("network") || message.includes("econn")) return true;

	return true;
}

/**
 * Options pour la fonction withRetry
 */
export interface WithRetryOptions {
	/** Nombre maximum de tentatives (défaut: 3) */
	maxRetries?: number;
	/** Délai de base en ms pour backoff exponentiel (défaut: 1000) */
	baseDelay?: number;
	/** Callback appelé à chaque retry */
	onRetry?: (attempt: number, maxRetries: number, waitTime: number) => void;
}

/**
 * Exécuter une fonction avec retry et backoff exponentiel
 *
 * @param fn - Fonction à exécuter
 * @param options - Options de retry
 * @returns Résultat de la fonction
 * @throws Dernière erreur si tous les retries échouent
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: WithRetryOptions = {}
): Promise<T> {
	const { maxRetries = 3, baseDelay = 1000, onRetry } = options;
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (!isRetryableError(error)) {
				throw lastError;
			}

			if (attempt < maxRetries - 1) {
				const waitTime = baseDelay * Math.pow(2, attempt);
				onRetry?.(attempt + 1, maxRetries - 1, waitTime);
				await delay(waitTime);
			}
		}
	}

	throw lastError;
}

// ============================================================================
// LOGS STRUCTURÉS (Sentry-ready)
// ============================================================================

/**
 * Options pour le logger structuré
 */
export interface ScriptLoggerOptions {
	/** Activer les logs JSON (sinon console standard) */
	jsonEnabled: boolean;
}

/**
 * Crée un logger structuré pour les scripts
 *
 * @param options - Options du logger
 * @returns Fonctions de logging
 *
 * @example
 * ```ts
 * const { logInfo, logWarn, logError, logSuccess } = createScriptLogger({
 *   jsonEnabled: process.argv.includes("--json")
 * });
 *
 * logInfo("script_started", { parallelCount: 5 });
 * logSuccess("image_processed", { mediaId: "abc123" });
 * logError("processing_failed", { error: "..." });
 * ```
 */
export function createScriptLogger(options: ScriptLoggerOptions) {
	const { jsonEnabled } = options;

	function logStructured(log: StructuredLog): void {
		if (jsonEnabled) {
			console.log(JSON.stringify(log));
		}
	}

	function logInfo(event: string, data?: Record<string, unknown>): void {
		logStructured({
			timestamp: new Date().toISOString(),
			level: "info",
			event,
			data,
		});
	}

	function logSuccess(event: string, data?: Record<string, unknown>): void {
		logInfo(event, data);
	}

	function logWarn(event: string, data?: Record<string, unknown>): void {
		logStructured({
			timestamp: new Date().toISOString(),
			level: "warn",
			event,
			data,
		});
		// Aussi afficher en console pour visibilité
		if (!jsonEnabled && data) {
			console.warn(`    [WARN] ${event}:`, JSON.stringify(data));
		}
	}

	function logError(event: string, data?: Record<string, unknown>): void {
		logStructured({
			timestamp: new Date().toISOString(),
			level: "error",
			event,
			data,
		});
	}

	return {
		logStructured,
		logInfo,
		logSuccess,
		logWarn,
		logError,
	};
}

// ============================================================================
// ARGUMENTS CLI
// ============================================================================

/**
 * Parse les arguments CLI communs
 *
 * @returns Arguments CLI parsés
 */
export function parseCommonCliArgs() {
	const args = process.argv;

	return {
		/** Mode dry-run (simulation sans modification) */
		dryRun: args.includes("--dry-run"),
		/** Logs JSON activés */
		jsonLogs: args.includes("--json"),
		/** Nombre de traitements parallèles */
		parallelCount: parseParallelArg(args, 5),
	};
}

/**
 * Parse l'argument --parallel=N
 *
 * @param args - Arguments CLI
 * @param defaultValue - Valeur par défaut
 * @returns Nombre de traitements parallèles
 */
function parseParallelArg(args: string[], defaultValue: number): number {
	const parallelArg = args.find((arg) => arg.startsWith("--parallel="));
	if (!parallelArg) return defaultValue;

	const value = parseInt(parallelArg.split("=")[1], 10);
	return isNaN(value) || value < 1 ? defaultValue : value;
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Options pour le traitement par batch
 */
export interface BatchProcessingOptions<T, R> {
	/** Éléments à traiter */
	items: T[];
	/** Taille des batches */
	batchSize: number;
	/** Fonction de traitement d'un élément */
	processItem: (item: T, index: number, total: number) => Promise<R>;
	/** Délai entre les batches en ms (défaut: 1000) */
	batchDelay?: number;
	/** Callback appelé au début de chaque batch */
	onBatchStart?: (batchNumber: number, totalBatches: number, batchSize: number) => void;
}

/**
 * Traite des éléments par batch avec parallélisation
 *
 * @param options - Options de traitement
 * @returns Résultats de tous les traitements
 */
export async function processInBatches<T, R>(
	options: BatchProcessingOptions<T, R>
): Promise<R[]> {
	const { items, batchSize, processItem, batchDelay = 1000, onBatchStart } = options;
	const results: R[] = [];
	const totalBatches = Math.ceil(items.length / batchSize);

	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		const batchNumber = Math.floor(i / batchSize) + 1;

		onBatchStart?.(batchNumber, totalBatches, batch.length);

		const batchResults = await Promise.all(
			batch.map((item, batchIndex) =>
				processItem(item, i + batchIndex, items.length)
			)
		);

		results.push(...batchResults);

		// Pause entre les batches pour éviter de surcharger
		if (i + batchSize < items.length) {
			await delay(batchDelay);
		}
	}

	return results;
}
