"use client";

import { useEffect, useEffectEvent } from "react";

import { ActionStatus, type ActionState } from "@/shared/types/server-action";

/**
 * Format path-préfixé émis par certaines Server Actions (skus create/update) :
 * `"${path}: ${message}"` — cf. CLAUDE.md § Validation patterns.
 */
const SERVER_FIELD_ERROR_PATTERN = /^([\w.]+):\s+(.+)$/s;

export interface ParsedServerFieldError<TFieldName extends string> {
	field: TFieldName;
	message: string;
}

/**
 * Extrait le champ ciblé d'un message serveur path-préfixé (`"size: Trop long"`).
 * Retourne null si le message n'a pas de préfixe ou si le path ne correspond
 * à aucun champ connu du formulaire (le message reste alors global).
 */
export function parseServerFieldError<TFieldName extends string>(
	message: string,
	fieldNames: readonly TFieldName[],
): ParsedServerFieldError<TFieldName> | null {
	const match = SERVER_FIELD_ERROR_PATTERN.exec(message);
	const path = match?.[1];
	const fieldMessage = match?.[2];
	if (!path || !fieldMessage) return null;
	// Path Zod potentiellement imbriqué ("media.0.url") → on cible le champ racine
	const root = path.split(".")[0] as TFieldName;
	if (!fieldNames.includes(root)) return null;
	return { field: root, message: fieldMessage };
}

interface UseServerFieldErrorsOptions<TFieldName extends string> {
	/** State retourné par useActionState */
	state: ActionState | undefined;
	/** Champs du formulaire pouvant recevoir une erreur serveur path-préfixée (omis → tout est global) */
	fieldNames?: readonly TFieldName[];
	/** Applique l'erreur au champ — typiquement `form.setFieldMeta(field, (prev) => ({ ...prev, errors: [message] }))` */
	setFieldError?: (field: TFieldName, message: string) => void;
	/** Appelé après application (typiquement focusFirstInvalid, dans un rAF) */
	onFieldError?: () => void;
}

/**
 * Route les VALIDATION_ERROR serveur vers le formulaire :
 * - message path-préfixé (`"size: Trop long"`) dont le path matche un champ →
 *   erreur inline sur le champ (via setFieldError) + onFieldError (focus) ;
 * - sinon → retourné comme erreur globale à afficher (ex. `FormServerErrorAlert`).
 *
 * Ne traite QUE le statut VALIDATION_ERROR : les autres statuts d'erreur passent
 * déjà par le toast (`createToastCallbacks` supprime VALIDATION_ERROR du toast
 * en supposant un affichage inline — ce hook rend cette hypothèse vraie).
 */
export function useServerFieldErrors<TFieldName extends string>({
	state,
	fieldNames = [],
	setFieldError,
	onFieldError,
}: UseServerFieldErrorsOptions<TFieldName>): string[] {
	const validationMessage =
		state?.status === ActionStatus.VALIDATION_ERROR &&
		typeof state.message === "string" &&
		state.message.length > 0
			? state.message
			: null;

	const applyFieldError = useEffectEvent((message: string) => {
		const parsed = parseServerFieldError(message, fieldNames);
		if (!parsed) return;
		setFieldError?.(parsed.field, parsed.message);
		onFieldError?.();
	});

	useEffect(() => {
		if (!validationMessage) return;
		applyFieldError(validationMessage);
	}, [state, validationMessage]);

	if (!validationMessage) return [];
	return parseServerFieldError(validationMessage, fieldNames) ? [] : [validationMessage];
}
