"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { addOrderNote } from "@/modules/orders/actions/add-order-note";
import { deleteOrderNote } from "@/modules/orders/actions/delete-order-note";
import { ActionStatus } from "@/shared/types/server-action";

export function useOrderNotes() {
	const [isPendingAdd, startAddTransition] = useTransition();
	const [isPendingDelete, startDeleteTransition] = useTransition();

	const add = (orderId: string, content: string, onSuccess?: () => void) => {
		startAddTransition(async () => {
			const result = await addOrderNote(orderId, content);

			if (result.status === ActionStatus.SUCCESS) {
				toast.success(result.message);
				onSuccess?.();
			} else {
				toast.error(result.message);
			}
		});
	};

	const remove = (noteId: string, onSuccess?: () => void) => {
		startDeleteTransition(async () => {
			const result = await deleteOrderNote(noteId);

			if (result.status === ActionStatus.SUCCESS) {
				toast.success(result.message);
				onSuccess?.();
			} else {
				toast.error(result.message);
			}
		});
	};

	return {
		add,
		remove,
		isPendingAdd,
		isPendingDelete,
		isPending: isPendingAdd || isPendingDelete,
	};
}
