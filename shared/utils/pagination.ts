import { z } from "zod";

import {
	PAGINATION_DEFAULTS,
	PAGINATION_LIMITS,
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";

// ============================================================================
// SCHEMA FACTORIES
// ============================================================================

/**
 * Crée un schema perPage avec les limites spécifiées
 * @param defaultValue - Valeur par défaut
 * @param maxValue - Valeur maximale autorisée
 */
export function createPerPageSchema(
	defaultValue: number = PAGINATION_DEFAULTS.ADMIN,
	maxValue: number = PAGINATION_LIMITS.MAX_ADMIN
) {
	return z.coerce
		.number()
		.int()
		.min(1, { message: "Le nombre par page doit être au moins 1" })
		.max(maxValue, { message: `Le nombre par page ne peut pas dépasser ${maxValue}` })
		.default(defaultValue);
}

/**
 * Crée un schema de pagination complet réutilisable
 * @param options - Options de configuration
 */
export function createPaginationSchema(options?: {
	defaultPerPage?: number;
	maxPerPage?: number;
}) {
	const { defaultPerPage = PAGINATION_DEFAULTS.ADMIN, maxPerPage = PAGINATION_LIMITS.MAX_ADMIN } =
		options ?? {};

	return z.object({
		cursor: cursorSchema,
		direction: directionSchema,
		perPage: createPerPageSchema(defaultPerPage, maxPerPage),
	});
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Contraint une valeur perPage aux limites autorisées
 * @param value - Valeur à contraindre
 * @param defaultValue - Valeur par défaut si non fournie
 * @param maxValue - Valeur maximale autorisée
 */
export function constrainPerPage(
	value: number | undefined | null,
	defaultValue: number = PAGINATION_DEFAULTS.ADMIN,
	maxValue: number = PAGINATION_LIMITS.MAX_ADMIN
): number {
	return Math.min(Math.max(1, value ?? defaultValue), maxValue);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PerPageSchema = ReturnType<typeof createPerPageSchema>;
export type PaginationSchema = ReturnType<typeof createPaginationSchema>;
