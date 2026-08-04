"use client";

import { useActionState, useRef, useTransition } from "react";
import { addOrderNote } from "@/modules/orders/actions/add-order-note";
import { deleteOrderNote } from "@/modules/orders/actions/delete-order-note";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";

/**
 * Exposes add/remove mutations for order notes. Reads are handled by the
 * consumer via Suspense + `use(getOrderNotes(orderId))` — see OrderNotesDialog.
 *
 * Callers pass `onSuccess` callbacks that typically trigger the dialog to
 * refresh its Promise (so the displayed list re-fetches post-mutation).
 */
export function useOrderNotes() {
	const [isPendingAdd, startAddTransition] = useTransition();
	const [isPendingDelete, startDeleteTransition] = useTransition();
	const addSuccessRef = useRef<(() => void) | undefined>(undefined);
	const removeSuccessRef = useRef<(() => void) | undefined>(undefined);

	const [, addFormAction, isAddActionPending] = useActionState(
		// L'arrow externe diffère la création des callbacks au submit : ils lisent
		// une ref (`addSuccessRef`), interdit pendant le rendu (react-hooks/refs).
		// Ne pas « simplifier » en passage direct de withCallbacks.
		async (_prev: ActionState | undefined, formData: FormData) =>
			withCallbacks(
				async (_p: ActionState | undefined, fd: FormData) =>
					addOrderNote(fd.get("orderId") as string, fd.get("content") as string),
				createToastCallbacks({
					loadingMessage: "Ajout de la note…",
					onSuccess: () => {
						addSuccessRef.current?.();
					},
				}),
			)(_prev, formData),
		undefined,
	);

	const [, removeFormAction, isRemoveActionPending] = useActionState(
		// Même motif que ci-dessus : `removeSuccessRef` est lue dans onSuccess.
		async (_prev: ActionState | undefined, formData: FormData) =>
			withCallbacks(
				async (_p: ActionState | undefined, fd: FormData) =>
					deleteOrderNote(fd.get("noteId") as string),
				createToastCallbacks({
					loadingMessage: "Suppression de la note…",
					onSuccess: () => {
						removeSuccessRef.current?.();
					},
				}),
			)(_prev, formData),
		undefined,
	);

	const add = (orderId: string, content: string, onSuccess?: () => void) => {
		addSuccessRef.current = onSuccess;
		startAddTransition(() => {
			const formData = new FormData();
			formData.append("orderId", orderId);
			formData.append("content", content);
			addFormAction(formData);
		});
	};

	const remove = (noteId: string, onSuccess?: () => void) => {
		removeSuccessRef.current = onSuccess;
		startDeleteTransition(() => {
			const formData = new FormData();
			formData.append("noteId", noteId);
			removeFormAction(formData);
		});
	};

	return {
		add,
		remove,
		isPendingAdd: isPendingAdd || isAddActionPending,
		isPendingDelete: isPendingDelete || isRemoveActionPending,
		isPending: isPendingAdd || isPendingDelete || isAddActionPending || isRemoveActionPending,
	};
}
