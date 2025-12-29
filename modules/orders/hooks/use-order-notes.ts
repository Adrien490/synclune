"use client";

import { useActionState, useRef, useTransition } from "react";
import { addOrderNote } from "@/modules/orders/actions/add-order-note";
import { deleteOrderNote } from "@/modules/orders/actions/delete-order-note";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";

export function useOrderNotes() {
	const [isPendingAdd, startAddTransition] = useTransition();
	const [isPendingDelete, startDeleteTransition] = useTransition();
	const addSuccessRef = useRef<(() => void) | undefined>(undefined);
	const removeSuccessRef = useRef<(() => void) | undefined>(undefined);

	const [, addFormAction, isAddActionPending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				addOrderNote(
					formData.get("orderId") as string,
					formData.get("content") as string
				),
			createToastCallbacks({
				onSuccess: () => {
					addSuccessRef.current?.();
				},
			})
		),
		undefined
	);

	const [, removeFormAction, isRemoveActionPending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				deleteOrderNote(formData.get("noteId") as string),
			createToastCallbacks({
				onSuccess: () => {
					removeSuccessRef.current?.();
				},
			})
		),
		undefined
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
		isPending:
			isPendingAdd ||
			isPendingDelete ||
			isAddActionPending ||
			isRemoveActionPending,
	};
}
