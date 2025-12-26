/**
 * Attendre un delai en millisecondes
 *
 * @param ms - Duree en millisecondes
 * @returns Promise qui se resout apres le delai
 *
 * @example
 * ```ts
 * await delay(1000); // Attend 1 seconde
 * ```
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
