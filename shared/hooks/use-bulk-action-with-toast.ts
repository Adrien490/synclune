"use client";

import { useActionState, useEffect, useRef } from "react";

import { useBulkSelectionContext } from "@/shared/components/data-table";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { toast } from "@/shared/utils/toast";

type ServerAction = (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;

interface BulkUndoConfig<TSnapshot> {
	/** Build the inverse FormData payload from the saved snapshot. */
	buildUndoFormData: (snapshot: TSnapshot) => FormData;
	/** Action to invert. Defaults to the same `serverAction` passed to the hook. */
	undoAction?: ServerAction;
	/** Toast button label. Default: "Annuler". */
	label?: string;
	/** Toast duration in ms. Default: 6000. */
	duration?: number;
	/** Success message after undo runs. Default: "Action annulée". */
	successMessage?: string;
}

interface UseBulkActionWithToastOptions<TSnapshot> {
	/** Enables the "Annuler" button on the success toast. */
	undo?: BulkUndoConfig<TSnapshot>;
	/** Extra side-effect on success (after toast, before clear). */
	onSuccess?: (result: ActionState) => void;
}

interface UseBulkActionWithToastReturn<TSnapshot> {
	state: ActionState | undefined;
	isPending: boolean;
	/**
	 * Submit a bulk action. Pass a `snapshot` to enable the optional undo button
	 * on the success toast — `buildUndoFormData(snapshot)` runs only if the user
	 * taps "Annuler".
	 */
	submit: (formData: FormData, snapshot?: TSnapshot) => void;
}

/**
 * Generic hook for admin bulk-actions bars. Replaces the duplicated pattern
 * `useState pendingAction + useActionState + useEffect toast + useRef snapshot`
 * found in 11 admin lists.
 *
 * Responsibilities :
 * - Wraps `useActionState` with the server action
 * - Toasts success/error via the sanitised `toast.*` wrapper
 * - Calls `clear()` from the bulk-selection context on success
 * - Optional snapshot-based undo button on the success toast
 *
 * UI state for opening the AlertDialog (e.g. `pendingAction`) stays in the
 * caller — that's legitimate local UI state, not action lifecycle.
 *
 * @example
 * ```tsx
 * const { submit, isPending } = useBulkActionWithToast<LastSubmission>(
 *   bulkArchiveProducts,
 *   {
 *     undo: {
 *       buildUndoFormData: (s) => {
 *         const fd = new FormData();
 *         fd.set("productIds", JSON.stringify(s.ids));
 *         fd.set("targetStatus", s.targetStatus === "ARCHIVED" ? "PUBLIC" : "ARCHIVED");
 *         return fd;
 *       },
 *     },
 *   },
 * );
 * submit(formData, { ids, targetStatus });
 * ```
 */
export function useBulkActionWithToast<TSnapshot = void>(
	serverAction: ServerAction,
	options?: UseBulkActionWithToastOptions<TSnapshot>,
): UseBulkActionWithToastReturn<TSnapshot> {
	const { clear } = useBulkSelectionContext();
	const lastSnapshotRef = useRef<TSnapshot | null>(null);

	// Stash latest options + clear in refs so the action reducer always reads
	// the freshest closures without re-creating itself on every render. Refs
	// are written in an effect (React 19 forbids ref writes during render).
	const optionsRef = useRef(options);
	const clearRef = useRef(clear);
	useEffect(() => {
		optionsRef.current = options;
		clearRef.current = clear;
	});

	const [state, action, isPending] = useActionState(
		async (prev: ActionState | undefined, formData: FormData): Promise<ActionState> => {
			const result = await serverAction(prev, formData);
			const opts = optionsRef.current;

			if (result.status === ActionStatus.SUCCESS) {
				const undo = opts?.undo;
				const snapshot = lastSnapshotRef.current;

				if (undo && snapshot !== null) {
					const undoActionFn = undo.undoAction ?? serverAction;
					toast.success(result.message, {
						duration: undo.duration ?? 6000,
						action: {
							label: undo.label ?? "Annuler",
							onClick: () => {
								void (async () => {
									// Build the inverse FormData lazily — only if the user actually taps Annuler.
									const undoFormData = undo.buildUndoFormData(snapshot);
									const undoResult = await undoActionFn(undefined, undoFormData);
									if (undoResult.status === ActionStatus.SUCCESS) {
										toast.success(undo.successMessage ?? "Action annulée");
									} else {
										toast.error(undoResult.message);
									}
								})();
							},
						},
					});
				} else {
					toast.success(result.message);
				}

				lastSnapshotRef.current = null;
				opts?.onSuccess?.(result);
				// Clear silencieux : pas de haptic post-success (déjà couvert par
				// le toast). Évite la vibration parasite après confirmation visuelle.
				clearRef.current({ silent: true });
			} else {
				toast.error(result.message);
			}

			return result;
		},
		undefined,
	);

	const submit = (formData: FormData, snapshot?: TSnapshot) => {
		lastSnapshotRef.current = snapshot ?? null;
		action(formData);
	};

	return { state, isPending, submit };
}
