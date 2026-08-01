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
	schema: z.ZodType<T>,
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

/**
 * Parse a FormData JSON array field (typically "ids" for bulk operations).
 *
 * Distinguishes:
 * - Missing/empty field → returns empty array (schema validation decides if allowed)
 * - Invalid JSON → returns an ActionState validation error ("Format des IDs invalide.")
 *
 * Used by bulk actions to avoid duplicating try/catch parsing logic.
 */
export function parseFormIds(
	formData: FormData,
	key = "ids",
): { ids: unknown[] } | { error: ActionState } {
	const raw = safeFormGet(formData, key);
	if (!raw) return { ids: [] };
	try {
		const parsed: unknown = JSON.parse(raw);
		return { ids: Array.isArray(parsed) ? parsed : [] };
	} catch {
		return {
			error: {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format des IDs invalide.",
			},
		};
	}
}
