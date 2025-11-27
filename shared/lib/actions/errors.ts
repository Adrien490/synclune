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
 * Convertit une erreur en ActionState
 *
 * @param error - L'erreur à convertir
 * @param defaultMessage - Message par défaut si l'erreur est inconnue
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

	// Erreurs standard JavaScript
	if (error instanceof Error) {
		return {
			status: ActionStatus.ERROR,
			message: error.message,
		};
	}

	// Erreur inconnue
	return {
		status: ActionStatus.ERROR,
		message: defaultMessage || "Une erreur est survenue",
	};
}

/**
 * Wrapper pour exécuter une action avec gestion d'erreurs automatique
 *
 * @param action - La fonction action à exécuter
 * @param defaultErrorMessage - Message d'erreur par défaut
 * @returns Le résultat de l'action ou une erreur ActionState
 *
 * @example
 * ```ts
 * export async function createProduct(
 *   _: ActionState | undefined,
 *   formData: FormData
 * ): Promise<ActionState> {
 *   return withErrorHandling(async () => {
 *     // ... logique métier
 *     return { status: ActionStatus.SUCCESS, message: "Créé" };
 *   }, "Échec de création du produit");
 * }
 * ```
 */
export async function withErrorHandling(
	action: () => Promise<ActionState>,
	defaultErrorMessage?: string
): Promise<ActionState> {
	try {
		return await action();
	} catch (error) {
		return handleActionError(error, defaultErrorMessage);
	}
}
