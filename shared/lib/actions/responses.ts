/**
 * Helpers de réponses pour Server Actions
 *
 * Utilitaires pour créer des ActionState de manière concise et cohérente.
 */

import { ActionStatus, type ActionState } from "@/shared/types/server-action";

/**
 * Crée un ActionState de succès
 *
 * @param message - Message de succès
 * @param data - Données optionnelles à retourner
 * @returns ActionState avec status SUCCESS
 *
 * @example
 * ```ts
 * return success("Produit créé avec succès", { productId: product.id });
 * ```
 */
export function success(message: string, data?: unknown): ActionState {
	return {
		status: ActionStatus.SUCCESS,
		message,
		data,
	};
}

/**
 * Crée un ActionState d'erreur
 *
 * @param message - Message d'erreur
 * @param status - Status spécifique (par défaut ERROR)
 * @returns ActionState avec le status et message fournis
 *
 * @example
 * ```ts
 * return error("Une erreur est survenue");
 * ```
 */
export function error(
	message: string,
	status: ActionStatus = ActionStatus.ERROR
): ActionState {
	return {
		status,
		message,
	};
}

/**
 * Crée un ActionState NOT_FOUND
 *
 * @param resource - Nom de la ressource non trouvée
 * @returns ActionState avec status NOT_FOUND
 *
 * @example
 * ```ts
 * return notFound("Produit");
 * // => "Produit non trouvé"
 * ```
 */
export function notFound(resource: string): ActionState {
	return {
		status: ActionStatus.NOT_FOUND,
		message: `${resource} non trouvé${resource.endsWith("e") ? "e" : ""}`,
	};
}

/**
 * Crée un ActionState CONFLICT
 *
 * @param message - Message de conflit
 * @returns ActionState avec status CONFLICT
 *
 * @example
 * ```ts
 * return conflict("Ce nom existe déjà");
 * ```
 */
export function conflict(message: string): ActionState {
	return {
		status: ActionStatus.CONFLICT,
		message,
	};
}

/**
 * Crée un ActionState UNAUTHORIZED
 *
 * @param message - Message optionnel (message par défaut si non fourni)
 * @returns ActionState avec status UNAUTHORIZED
 *
 * @example
 * ```ts
 * return unauthorized();
 * // => "Vous devez être connecté pour effectuer cette action"
 * ```
 */
export function unauthorized(
	message = "Vous devez être connecté pour effectuer cette action"
): ActionState {
	return {
		status: ActionStatus.UNAUTHORIZED,
		message,
	};
}

/**
 * Crée un ActionState FORBIDDEN
 *
 * @param message - Message optionnel (message par défaut si non fourni)
 * @returns ActionState avec status FORBIDDEN
 *
 * @example
 * ```ts
 * return forbidden();
 * // => "Accès non autorisé"
 * ```
 */
export function forbidden(message = "Accès non autorisé"): ActionState {
	return {
		status: ActionStatus.FORBIDDEN,
		message,
	};
}

/**
 * Crée un ActionState VALIDATION_ERROR
 *
 * @param message - Message d'erreur de validation
 * @returns ActionState avec status VALIDATION_ERROR
 *
 * @example
 * ```ts
 * return validationError("L'email est invalide");
 * ```
 */
export function validationError(message: string): ActionState {
	return {
		status: ActionStatus.VALIDATION_ERROR,
		message,
	};
}
