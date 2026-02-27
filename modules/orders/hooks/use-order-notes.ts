"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addOrderNote } from "@/modules/orders/actions/add-order-note";
import { deleteOrderNote } from "@/modules/orders/actions/delete-order-note";
import { getOrderNotes } from "@/modules/orders/data/get-order-notes";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";
import type { OrderNoteItem } from "@/modules/orders/types/order-notes.types";

export function useOrderNotes() {
	const [notes, setNotes] = useState<OrderNoteItem[]>([]);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [isPendingFetch, startFetchTransition] = useTransition();
	const [isPendingAdd, startAddTransition] = useTransition();
	const [isPendingDelete, startDeleteTransition] = useTransition();
	const addSuccessRef = useRef<(() => void) | undefined>(undefined);
	const removeSuccessRef = useRef<(() => void) | undefined>(undefined);

	// Wrapped action refs, built in useEffect to avoid ref access during render
	const wrappedAddRef = useRef<
		(prev: ActionState | undefined, formData: FormData) => Promise<ActionState>
	>(async (_prev: ActionState | undefined, formData: FormData) =>
		addOrderNote(formData.get("orderId") as string, formData.get("content") as string),
	);
	const wrappedRemoveRef = useRef<
		(prev: ActionState | undefined, formData: FormData) => Promise<ActionState>
	>(async (_prev: ActionState | undefined, formData: FormData) =>
		deleteOrderNote(formData.get("noteId") as string),
	);
	useEffect(() => {
		wrappedAddRef.current = withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				addOrderNote(formData.get("orderId") as string, formData.get("content") as string),
			createToastCallbacks({
				onSuccess: () => {
					addSuccessRef.current?.();
				},
			}),
		);
		wrappedRemoveRef.current = withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				deleteOrderNote(formData.get("noteId") as string),
			createToastCallbacks({
				onSuccess: () => {
					removeSuccessRef.current?.();
				},
			}),
		);
	});

	const [, addFormAction, isAddActionPending] = useActionState(
		async (prev: ActionState | undefined, formData: FormData) =>
			wrappedAddRef.current(prev, formData),
		undefined,
	);

	const [, removeFormAction, isRemoveActionPending] = useActionState(
		async (prev: ActionState | undefined, formData: FormData) =>
			wrappedRemoveRef.current(prev, formData),
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

	const fetch = (orderId: string) => {
		setFetchError(null);
		startFetchTransition(async () => {
			const result = await getOrderNotes(orderId);
			if ("error" in result) {
				setFetchError(result.error);
			} else {
				setNotes(result.notes);
			}
		});
	};

	const reset = () => {
		setNotes([]);
		setFetchError(null);
	};

	return {
		notes,
		fetchError,
		fetch,
		reset,
		add,
		remove,
		isPendingFetch,
		isPendingAdd: isPendingAdd || isAddActionPending,
		isPendingDelete: isPendingDelete || isRemoveActionPending,
		isPending:
			isPendingFetch ||
			isPendingAdd ||
			isPendingDelete ||
			isAddActionPending ||
			isRemoveActionPending,
	};
}
