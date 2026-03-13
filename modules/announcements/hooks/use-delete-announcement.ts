"use client";

import { useActionState, useTransition } from "react";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { deleteAnnouncement } from "../actions/delete-announcement";

interface UseDeleteAnnouncementOptions {
	onSuccess?: (message: string) => void;
}

export const useDeleteAnnouncement = (options?: UseDeleteAnnouncementOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			deleteAnnouncement,
			createToastCallbacks({
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
			}),
		),
		undefined,
	);

	const [isTransitionPending, startTransition] = useTransition();

	const handle = (announcementId: string) => {
		const formData = new FormData();
		formData.append("id", announcementId);
		startTransition(() => {
			formAction(formData);
		});
	};

	return {
		state,
		action: formAction,
		isPending: isFormPending || isTransitionPending,
		handle,
	};
};
