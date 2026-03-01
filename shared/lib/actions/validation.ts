/**
 * Helpers de validation pour Server Actions
 *
 * Wrappers autour de Zod qui retournent des ActionState
 * pour simplifier la validation dans les actions.
 */

import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import type { z } from "zod";

/**
 * Valide des données avec un schéma Zod
 *
 * @param schema - Le schéma Zod à utiliser
 * @param data - Les données à valider
 * @returns Les données validées ou une erreur ActionState
 *
 * @example
 * ```ts
 * const validated = validateInput(createProductSchema, rawData);
 * if ("error" in validated) return validated.error;
 *
 * const data = validated.data;
 * // ... utiliser data (typé et validé)
 * ```
 */
export function validateInput<T>(
	schema: z.ZodSchema<T>,
	data: unknown,
): { data: T } | { error: ActionState } {
	const result = schema.safeParse(data);

	if (!result.success) {
		const firstError = result.error.issues[0];
		return {
			error: {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError?.message ?? "Données invalides",
			},
		};
	}

	return { data: result.data };
}

/**
 * Extrait et valide des données de FormData
 *
 * @param formData - Le FormData à extraire
 * @param extractor - Fonction qui extrait les champs du FormData
 * @param schema - Le schéma Zod à utiliser
 * @returns Les données validées ou une erreur ActionState
 *
 * @example
 * ```ts
 * const validated = validateFormData(
 *   formData,
 *   (fd) => ({
 *     name: fd.get("name") as string,
 *     email: fd.get("email") as string,
 *   }),
 *   userSchema
 * );
 * if ("error" in validated) return validated.error;
 * ```
 */
export function validateFormData<T>(
	formData: FormData,
	extractor: (formData: FormData) => unknown,
	schema: z.ZodSchema<T>,
): { data: T } | { error: ActionState } {
	const rawData = extractor(formData);
	return validateInput(schema, rawData);
}

/**
 * Extract a string value from FormData with explicit null handling
 *
 * Replaces the unsafe `formData.get("key") as string` pattern.
 * Returns null if the field is missing or not a string (e.g. File).
 */
export function safeFormGet(formData: FormData, key: string): string | null {
	const value = formData.get(key);
	return typeof value === "string" ? value : null;
}

/**
 * Extract and parse a JSON value from FormData
 *
 * Used for fields that contain serialized JSON (e.g. arrays, objects).
 * Returns null if the field is missing, not a string, or invalid JSON.
 */
export function safeFormGetJSON<T>(formData: FormData, key: string): T | null {
	const raw = safeFormGet(formData, key);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}
