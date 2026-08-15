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
 * Hooks de mutation partagés par les taxonomies (couleurs, matériaux).
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
// DUPLICATION
// ============================================================================

export interface TaxonomyDuplicateSuccessData {
	id: string;
	displayName: string;
}

/**
 * Les actions de duplication renvoient `{ id, name }`. On normalise ici.
 */
function readDuplicateData(value: unknown): TaxonomyDuplicateSuccessData | null {
	if (value === null || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	const displayName = record.name;
	if (typeof record.id !== "string" || typeof displayName !== "string") {
		return null;
	}
	return { id: record.id, displayName };
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
