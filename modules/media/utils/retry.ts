import { THUMBNAIL_CONFIG } from "../constants/media.constants";

/**
 * Erreur CORS spécifique pour la génération de thumbnails
 */
export class CORSError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CORSError";
	}
}

/**
 * Options pour la fonction withRetry
 */
export interface RetryOptions {
	/** Nombre maximum de tentatives (défaut: THUMBNAIL_CONFIG.maxRetries) */
	maxRetries?: number;
	/** Délai de base en ms pour le backoff (défaut: THUMBNAIL_CONFIG.retryBaseDelay) */
	baseDelay?: number;
	/** Fonction pour déterminer si l'erreur est récupérable */
	shouldRetry?: (error: Error) => boolean;
	/** Callback appelé à chaque tentative échouée */
	onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Par défaut, ne pas retenter sur les erreurs CORS (elles échoueront toujours)
 */
function defaultShouldRetry(error: Error): boolean {
	// Ne pas retenter sur erreur CORS
	if (error instanceof CORSError || error.name === "SecurityError") {
		return false;
	}
	return true;
}

/**
 * Exécute une fonction asynchrone avec retry et backoff exponentiel
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetchData(),
 *   {
 *     maxRetries: 3,
 *     onRetry: (attempt, error) => console.log(`Tentative ${attempt} échouée: ${error.message}`)
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {}
): Promise<T> {
	const {
		maxRetries = THUMBNAIL_CONFIG.maxRetries,
		baseDelay = THUMBNAIL_CONFIG.retryBaseDelay,
		shouldRetry = defaultShouldRetry,
		onRetry,
	} = options;

	let lastError: Error = new Error("Unknown error");

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Si l'erreur n'est pas récupérable, arrêter immédiatement
			if (!shouldRetry(lastError)) {
				throw lastError;
			}

			// Si c'était la dernière tentative, propager l'erreur
			if (attempt === maxRetries) {
				throw lastError;
			}

			// Callback de retry
			onRetry?.(attempt, lastError);

			// Backoff exponentiel: 1s, 2s, 4s...
			const delay = baseDelay * Math.pow(2, attempt - 1);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError;
}
