"use client";

import { useTransition } from "react";

import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import type { ActionState } from "@/shared/types/server-action";

import type { TaxonomyConfig } from "../types/taxonomy.types";

type TaxonomyAction = (
	prevState: ActionState | undefined,
	formData: FormData,
) => Promise<ActionState>;

/**
 * Hooks de mutation partagés par les taxonomies (couleurs, matériaux, types).
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
 *
 * ⚠️ **Ce fichier n'accueille que ce qui AJOUTE du comportement.** Il a porté
 * un `useTaxonomyRefresh(action, options)` dont le corps entier était
 * `useRefreshAction(action, options)` — un maillon d'identité entre le hook du
 * module et le hook partagé, soit trois étages pour zéro effet. Les hooks
 * `use*Refresh` des trois modules appellent `useRefreshAction` directement.
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
// DUPLICATION
// ============================================================================

export interface TaxonomyDuplicateSuccessData {
	id: string;
	displayName: string;
}

/**
 * Les actions de duplication renvoient `{ id, name }`. On normalise ici.
 *
 * ⚠️ Un `data` hors contrat ne lève PAS : il rend `null`, et le `onSuccess` de
 * `useTaxonomyDuplicate` ne se déclenche alors jamais — la duplication réussit
 * en base mais l'UI ne fait rien après « Duplication en cours… ». Le risque est
 * réel : `duplicateProductType` doit déjà mapper `label → name` à la main pour
 * s'y conformer. D'où l'export : les deux bouts du fil — ce que les trois
 * actions renvoient et ce que ce lecteur accepte — sont tenus ensemble par
 * `test/contract/taxonomy-duplicate-payload.contract.test.ts`.
 */
export function readDuplicateData(value: unknown): TaxonomyDuplicateSuccessData | null {
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
	const [isTransitionPending, startTransition] = useTransition();

	// La plomberie toast vit dans `useActionWithToast` (règle du préambule : ce
	// fichier n'accueille que ce qui AJOUTE du comportement) ; ce hook n'ajoute
	// que la normalisation `{ id, name }` et l'envoi par id via le registre.
	const { action: formAction, isPending } = useActionWithToast(action, {
		toastOptions: { loadingMessage: "Duplication en cours…", showSuccessToast: false },
		onSuccess: (result) => {
			const data = readDuplicateData(result.data);
			if (typeof result.message === "string" && data) {
				options?.onSuccess?.(result.message, data);
			}
		},
		onError: (result) => {
			if (result.message) options?.onError?.(result.message);
		},
	});

	const duplicate = (id: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append(config.formFields.duplicateId, id);
			formAction(formData);
		});
	};

	return { duplicate, isPending: isPending || isTransitionPending };
}
