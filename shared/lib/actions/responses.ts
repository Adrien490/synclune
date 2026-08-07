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
export function success(
	message: string,
	data?: unknown,
): ActionState & { status: ActionStatus.SUCCESS } {
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
export function error(message: string): ActionState & { status: ActionStatus.ERROR } {
	return {
		status: ActionStatus.ERROR,
		message,
	};
}

/**
 * Crée un ActionState NOT_FOUND
 *
 * ⚠️ Le genre est DÉCLARÉ, jamais deviné. La version précédente accordait sur
 * `resource.endsWith("e")` — une heuristique qui se trompait dans les deux sens :
 * « Collection », « Couleur » et « Variante de produit » rendaient « non trouvé »
 * (masculin sur un nom féminin), et « Le produit source » rendait « non trouvée »
 * parce que le `e` final appartenait à l'ÉPITHÈTE, pas au nom. Le suffixe se
 * concaténant sans condition, deux sites qui passaient déjà une phrase complète
 * produisaient « Produit non trouvé non trouvé ».
 *
 * @param resource - Nom de la ressource, au SINGULIER et sans article
 * @param genre - Genre grammatical du nom ("m" par défaut)
 *
 * @example
 * ```ts
 * return notFound("Produit");            // "Produit non trouvé"
 * return notFound("Collection", "f");    // "Collection non trouvée"
 * ```
 */
export function notFound(
	resource: string,
	genre: "m" | "f" = "m",
): ActionState & { status: ActionStatus.NOT_FOUND } {
	return {
		status: ActionStatus.NOT_FOUND,
		message: `${resource} non trouvé${genre === "f" ? "e" : ""}`,
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
 * // => "Connecte-toi pour effectuer cette action."
 * ```
 */
export function unauthorized(
	message = "Connecte-toi pour effectuer cette action.",
): ActionState & { status: ActionStatus.UNAUTHORIZED } {
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
export function forbidden(
	message = "Accès non autorisé",
): ActionState & { status: ActionStatus.FORBIDDEN } {
	return {
		status: ActionStatus.FORBIDDEN,
		message,
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
 * return conflict("Cet email est déjà utilisé");
 * ```
 */
export function conflict(message: string): ActionState & { status: ActionStatus.CONFLICT } {
	return {
		status: ActionStatus.CONFLICT,
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
export function validationError(
	message: string,
): ActionState & { status: ActionStatus.VALIDATION_ERROR } {
	return {
		status: ActionStatus.VALIDATION_ERROR,
		message,
	};
}
