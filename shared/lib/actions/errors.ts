/**
 * Helpers de gestion d'erreurs pour Server Actions
 *
 * Utilitaires pour convertir des erreurs en ActionState
 * et gérer les erreurs de manière cohérente.
 */

import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { ZodError } from "zod";
import { isRedirectError } from "next/dist/client/components/redirect-error";

/**
 * Erreur metier affichable a l'utilisateur
 *
 * Utiliser cette classe pour les erreurs dont le message
 * peut etre affiche directement a l'utilisateur (ex: stock insuffisant,
 * produit indisponible, code promo invalide).
 *
 * Les erreurs techniques (Prisma, Stripe, etc.) ne doivent PAS
 * utiliser cette classe pour eviter l'exposition de details sensibles.
 *
 * @example
 * ```ts
 * throw new BusinessError("Stock insuffisant pour ce produit");
 * ```
 */
export class BusinessError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BusinessError";
	}
}

/**
 * Convertit une erreur en ActionState
 *
 * SECURITE: Seules les BusinessError exposent leur message.
 * Les autres erreurs (Prisma, Stripe, etc.) utilisent le defaultMessage
 * pour eviter l'exposition de details techniques sensibles.
 *
 * @param error - L'erreur à convertir
 * @param defaultMessage - Message par défaut pour les erreurs techniques
 * @returns ActionState avec le status et message appropriés
 *
 * @example
 * ```ts
 * try {
 *   await prisma.user.create({ ... });
 * } catch (error) {
 *   return handleActionError(error, "Échec de création de l'utilisateur");
 * }
 * ```
 */
export function handleActionError(error: unknown, defaultMessage?: string): ActionState {
	// Redirect errors doivent être re-thrown (Next.js)
	if (isRedirectError(error)) {
		throw error;
	}

	// Erreurs de validation Zod
	if (error instanceof ZodError) {
		const firstError = error.issues[0];
		return {
			status: ActionStatus.VALIDATION_ERROR,
			message: firstError?.message || "Données invalides",
		};
	}

	// Erreurs metier (affichables a l'utilisateur)
	if (error instanceof BusinessError) {
		return {
			status: ActionStatus.ERROR,
			message: error.message,
		};
	}

	// Erreurs techniques (message masque pour securite)
	// Log server-side pour debug (le message original reste dans les logs serveur)
	if (error instanceof Error) {
		console.error(`[handleActionError] ${error.name}: ${error.message}`);
	}

	return {
		status: ActionStatus.ERROR,
		message: defaultMessage || "Une erreur est survenue",
	};
}

