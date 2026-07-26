"use client";

import { useActionState, useTransition } from "react";

import { useActionWithToast, useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import type { ActionState } from "@/shared/types/server-action";

import type { TaxonomyConfig } from "../types/taxonomy.types";

type TaxonomyAction = (
	prevState: ActionState | undefined,
	formData: FormData,
) => Promise<ActionState>;

/**
 * Hooks de mutation partagés par les trois taxonomies.
 *
 * Chaque hook prend la Server Action concrète en paramètre : la frontière
 * typée reste côté module, seule la mécanique React est mutualisée.
 *
 * Ces hooks corrigent une dérive réelle. La suppression, par exemple, existait
 * en deux versions : `useDeleteColor` (18 lignes, `useActionWithToast`) et
 * `useDeleteMaterial` (58 lignes, `useActionState` + `withCallbacks` + un
 * `useTransition` maison). Même intention, deux comportements — notamment sur
 * le toast de chargement, présent d'un côté seulement. La version retenue ici
 * est la plus récente et la plus simple.
 */

// ============================================================================
// SUPPRESSION
// ============================================================================

interface UseTaxonomyDeleteOptions {
	onSuccess?: (message: string) => void;
}

export function useTaxonomyDelete(action: TaxonomyAction, options?: UseTaxonomyDeleteOptions) {
	return useActionWithToast(action, {
		onSuccess: (result) => {
			if (result.message) options?.onSuccess?.(result.message);
		},
	});
}

// ============================================================================
// RAFRAÎCHISSEMENT
// ============================================================================

export function useTaxonomyRefresh(action: TaxonomyAction, options?: { onSuccess?: () => void }) {
	return useRefreshAction(action, { onSuccess: options?.onSuccess });
}

// ============================================================================
// BASCULE DE STATUT
// ============================================================================

interface UseTaxonomyToggleStatusOptions {
	onSuccess?: (message: string) => void;
	onError?: () => void;
}

export function useTaxonomyToggleStatus(
	action: TaxonomyAction,
	config: TaxonomyConfig,
	options?: UseTaxonomyToggleStatusOptions,
) {
	const [state, formAction, isPending] = useActionState(
		withCallbacks(
			action,
			createToastCallbacks({
				loadingMessage: "Mise à jour du statut…",
				onSuccess: (result) => {
					if (typeof result.message === "string") options?.onSuccess?.(result.message);
				},
				onError: () => options?.onError?.(),
			}),
		),
		undefined,
	);

	// Pas de `startTransition` ici : les appelants (les bascules « Actif »)
	// l'enveloppent eux-mêmes avec leur `useOptimistic`, pour que l'état
	// optimiste survive jusqu'à la résolution de l'action.
	const toggleStatus = (id: string, isActive: boolean) => {
		const formData = new FormData();
		formData.append(config.formFields.toggleId, id);
		formData.append("isActive", String(isActive));
		formAction(formData);
	};

	return { state, action: formAction, isPending, toggleStatus };
}

// ============================================================================
// DUPLICATION
// ============================================================================

export interface TaxonomyDuplicateSuccessData {
	id: string;
	slug: string;
	/** `name` pour couleurs et matériaux, `label` pour les types de bijoux. */
	displayName: string;
}

/**
 * Les actions de duplication renvoient `{ id, slug }` plus le libellé sous une
 * clé qui dépend de l'entité (`name` ou `label`). On normalise ici.
 */
function readDuplicateData(value: unknown): TaxonomyDuplicateSuccessData | null {
	if (value === null || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	const displayName = record.name ?? record.label;
	if (
		typeof record.id !== "string" ||
		typeof record.slug !== "string" ||
		typeof displayName !== "string"
	) {
		return null;
	}
	return { id: record.id, slug: record.slug, displayName };
}

interface UseTaxonomyDuplicateOptions {
	onSuccess?: (message: string, data: TaxonomyDuplicateSuccessData) => void;
	onError?: (message: string) => void;
}

export function useTaxonomyDuplicate(
	action: TaxonomyAction,
	config: TaxonomyConfig,
	options?: UseTaxonomyDuplicateOptions,
) {
	const [isPending, startTransition] = useTransition();

	const [, formAction] = useActionState(
		withCallbacks(
			action,
			createToastCallbacks({
				loadingMessage: "Duplication en cours…",
				showSuccessToast: false,
				onSuccess: (result) => {
					const data = readDuplicateData(result.data);
					if (typeof result.message === "string" && data) {
						options?.onSuccess?.(result.message, data);
					}
				},
				onError: (result) => {
					if (result.message) options?.onError?.(result.message);
				},
			}),
		),
		undefined,
	);

	const duplicate = (id: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append(config.formFields.duplicateId, id);
			formAction(formData);
		});
	};

	return { duplicate, isPending };
}
