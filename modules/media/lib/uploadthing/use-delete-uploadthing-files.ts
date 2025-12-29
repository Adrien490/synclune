"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { deleteUploadThingFiles } from "@/modules/media/actions/delete-uploadthing-files";

interface UseDeleteUploadThingFilesOptions {
	onSuccess?: (message: string) => void;
}

export const useDeleteUploadThingFiles = (
	options?: UseDeleteUploadThingFilesOptions
) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteUploadThingFiles,
			createToastCallbacks({
				showSuccessToast: false,
				showErrorToast: false,
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
			})
		),
		undefined
	);

	// Helper function pour les composants qui ne peuvent pas utiliser <form> (nested forms)
	const deleteFiles = (fileUrls: string | string[]) => {
		const urls = Array.isArray(fileUrls) ? fileUrls : [fileUrls];
		const formData = new FormData();
		formData.append("fileUrls", JSON.stringify(urls));
		action(formData);
	};

	return {
		state,
		action,
		isPending,
		deleteFiles,
	};
};
