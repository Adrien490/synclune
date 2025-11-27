"use client";

import { useEffect, useState } from "react";

/**
 * Interface pour les informations de rate limit côté client
 */
export interface RateLimitInfo {
	retryAfter?: number; // secondes
	reset?: number; // timestamp
}

/**
 * Hook React pour gérer un timer de retry après un rate limit
 *
 * @param retryAfter - Nombre de secondes avant de pouvoir réessayer
 * @returns Nombre de secondes restantes (0 si terminé)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [state, formAction] = useActionState(addToCart, undefined);
 *   const secondsRemaining = useRateLimitTimer(state?.retryAfter);
 *
 *   return (
 *     <div>
 *       {secondsRemaining > 0 ? (
 *         <p>Veuillez patienter {secondsRemaining} secondes...</p>
 *       ) : (
 *         <button formAction={formAction}>Ajouter au panier</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRateLimitTimer(retryAfter?: number): number {
	const [secondsRemaining, setSecondsRemaining] = useState(retryAfter ?? 0);

	useEffect(() => {
		if (!retryAfter || retryAfter <= 0) {
			setSecondsRemaining(0);
			return;
		}

		setSecondsRemaining(retryAfter);

		const interval = setInterval(() => {
			setSecondsRemaining((prev) => {
				if (prev <= 1) {
					clearInterval(interval);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, [retryAfter]);

	return secondsRemaining;
}

/**
 * Formatte un nombre de secondes en texte lisible
 *
 * @param seconds - Nombre de secondes
 * @returns Texte formaté (ex: "42 secondes", "2 minutes")
 *
 * @example
 * ```ts
 * formatRetryTime(30) // "30 secondes"
 * formatRetryTime(90) // "2 minutes"
 * formatRetryTime(3600) // "60 minutes"
 * ```
 */
export function formatRetryTime(seconds: number): string {
	if (seconds < 60) {
		return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
	}
	const minutes = Math.ceil(seconds / 60);
	if (minutes < 60) {
		return `${minutes} minute${minutes > 1 ? "s" : ""}`;
	}
	const hours = Math.floor(minutes / 60);
	return `${hours} heure${hours > 1 ? "s" : ""}`;
}

/**
 * Détecte si un message d'erreur est lié à un rate limit
 *
 * @param errorMessage - Message d'erreur retourné par la server action
 * @returns true si l'erreur est un rate limit
 *
 * @example
 * ```ts
 * isRateLimitError("Trop de requêtes. Veuillez réessayer...") // true
 * isRateLimitError("Produit indisponible") // false
 * ```
 */
export function isRateLimitError(errorMessage?: string): boolean {
	if (!errorMessage) return false;
	const rateLimitKeywords = [
		"trop de requêtes",
		"trop de tentatives",
		"rate limit",
		"veuillez réessayer dans",
		"veuillez patienter",
	];
	const lowerMessage = errorMessage.toLowerCase();
	return rateLimitKeywords.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * Extrait le nombre de secondes d'un message d'erreur de rate limit
 *
 * @param errorMessage - Message d'erreur
 * @returns Nombre de secondes, ou null si non trouvé
 *
 * @example
 * ```ts
 * extractRetryAfter("Veuillez réessayer dans 42 secondes") // 42
 * extractRetryAfter("Veuillez réessayer dans 2 minutes") // 120
 * ```
 */
export function extractRetryAfter(errorMessage?: string): number | null {
	if (!errorMessage) return null;

	// Chercher "X seconde(s)"
	const secondsMatch = errorMessage.match(/(\d+)\s+seconde/i);
	if (secondsMatch) {
		return parseInt(secondsMatch[1], 10);
	}

	// Chercher "X minute(s)"
	const minutesMatch = errorMessage.match(/(\d+)\s+minute/i);
	if (minutesMatch) {
		return parseInt(minutesMatch[1], 10) * 60;
	}

	// Chercher "X heure(s)"
	const hoursMatch = errorMessage.match(/(\d+)\s+heure/i);
	if (hoursMatch) {
		return parseInt(hoursMatch[1], 10) * 3600;
	}

	return null;
}

/**
 * Hook combiné pour gérer automatiquement le timer et le message
 *
 * @param errorMessage - Message d'erreur retourné par la server action
 * @param retryAfter - Nombre de secondes avant retry (optionnel)
 * @returns Objet avec état du rate limit et message formaté
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const [state, formAction] = useActionState(addToCart, undefined);
 *   const { isBlocked, secondsRemaining, message } = useRateLimitStatus(
 *     state?.message,
 *     state?.retryAfter
 *   );
 *
 *   return (
 *     <div>
 *       {isBlocked && <Alert>{message}</Alert>}
 *       <button disabled={isBlocked} formAction={formAction}>
 *         {isBlocked ? `Patientez (${secondsRemaining}s)` : "Ajouter"}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRateLimitStatus(
	errorMessage?: string,
	retryAfter?: number
): {
	isBlocked: boolean;
	secondsRemaining: number;
	message: string;
} {
	const isRateLimited = isRateLimitError(errorMessage);
	const extractedRetryAfter = retryAfter ?? extractRetryAfter(errorMessage);
	const secondsRemaining = useRateLimitTimer(extractedRetryAfter ?? undefined);

	const isBlocked = isRateLimited && secondsRemaining > 0;

	const message = isBlocked
		? `Trop de requêtes. Veuillez patienter ${formatRetryTime(secondsRemaining)}.`
		: errorMessage ?? "";

	return {
		isBlocked,
		secondsRemaining,
		message,
	};
}
