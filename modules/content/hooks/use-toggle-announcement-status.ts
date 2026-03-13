"use client";

import { useActionState } from "react";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { toggleAnnouncementStatus } from "../actions/toggle-announcement-status";

interface UseToggleAnnouncementStatusOptions {
	onSuccess?: (message: string) => void;
	onError?: () => void;
}

export const useToggleAnnouncementStatus = (options?: UseToggleAnnouncementStatusOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			toggleAnnouncementStatus,
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
				onError: () => {
					options?.onError?.();
				},
			}),
		),
		undefined,
	);

	const toggleStatus = (announcementId: string, isActive: boolean) => {
		const formData = new FormData();
		formData.append("id", announcementId);
		formData.append("isActive", isActive.toString());
		action(formData);
	};

	return {
		state,
		action,
		isPending,
		toggleStatus,
	};
};
