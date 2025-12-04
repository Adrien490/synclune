"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { deleteUploadThingFile } from "./delete-uploadthing-file";

interface UseDeleteUploadThingFileOptions {
	onSuccess?: (message: string) => void;
}

export const useDeleteUploadThingFile = (
	options?: UseDeleteUploadThingFileOptions
) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteUploadThingFile,
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

	return {
		state,
		action,
		isPending,
	};
};
