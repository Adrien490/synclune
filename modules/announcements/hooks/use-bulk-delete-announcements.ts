"use client";

import { useActionState, useTransition } from "react";

import { bulkDeleteAnnouncements } from "@/modules/announcements/actions/bulk-delete-announcements";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

interface UseBulkDeleteAnnouncementsOptions {
	onSuccess?: (message: string) => void;
}

export const useBulkDeleteAnnouncements = (options?: UseBulkDeleteAnnouncementsOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			bulkDeleteAnnouncements,
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

	const handle = (announcementIds: string[]) => {
		const formData = new FormData();
		announcementIds.forEach((id) => formData.append("ids", id));
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
