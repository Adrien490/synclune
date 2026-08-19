/**
 * Helpers de gestion d'erreurs pour Server Actions
 *
 * Utilitaires pour convertir des erreurs en ActionState
 * et gérer les erreurs de manière cohérente.
 */

import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { ZodError } from "zod";
import { unstable_rethrow } from "next/navigation";
import { Prisma } from "@/app/generated/prisma/client";
import { logger, type LogContext } from "@/shared/lib/logger";
import { BusinessError } from "./business-error";

export { BusinessError };

/**
 * L'erreur est-elle une violation de contrainte d'unicité Prisma (P2002) ?
 *
 * ⚠️ `instanceof`, jamais un duck-typing `"code" in e && e.code === "P2002"` :
 * trois actions VARIANT le faisaient, ce qui accepte n'importe quelle erreur
 * portant un champ `code` (une erreur Node, une erreur d'un SDK tiers) et
 * renvoie alors un message d'unicité pour un incident sans rapport. C'est aussi
 * la contrepartie de la convention de test du dépôt : une erreur Prisma mockée
 * DOIT être une vraie instance de la classe.
 *
 * Utile quand une action veut un message d'unicité CONTEXTUALISÉ ; sans cela,
 * `handleActionError` répond déjà « Cette valeur existe déjà. ».
 */
export function isUniqueConstraintError(error: unknown): boolean {
	return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
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
export function handleActionError(
	error: unknown,
	defaultMessage?: string,
	context?: LogContext,
): ActionState {
	// Signaux framework (redirect, notFound, forbidden…) : re-throw vers Next
	unstable_rethrow(error);

	// Erreurs de validation Zod
	if (error instanceof ZodError) {
		const firstError = error.issues[0];
		return {
			status: ActionStatus.VALIDATION_ERROR,
			message: firstError?.message ?? "Données invalides",
		};
	}

	// Erreurs metier (affichables a l'utilisateur)
	if (error instanceof BusinessError) {
		return {
			status: ActionStatus.ERROR,
			message: error.message,
		};
	}

	// Erreurs Prisma connues — messages contextualisés sans fuite de schéma
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		logger.error(`[handleActionError] Prisma ${error.code}: ${error.message}`, error, context);

		if (error.code === "P2002") {
			return {
				status: ActionStatus.ERROR,
				message: "Cette valeur existe déjà.",
			};
		}
		if (error.code === "P2025") {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Ressource introuvable.",
			};
		}
		if (error.code === "P2034") {
			return {
				status: ActionStatus.ERROR,
				message: "Conflit détecté, veuillez réessayer.",
			};
		}
	}

	// Erreurs techniques (message masque pour securite)
	// Log server-side pour debug (le message original reste dans les logs serveur)
	if (error instanceof Error) {
		logger.error(`[handleActionError] ${error.name}: ${error.message}`, error, context);
	}

	return {
		status: ActionStatus.ERROR,
		message: defaultMessage ?? "Une erreur est survenue",
	};
}
