"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";

import { exportProductTypes } from "@/modules/product-types/actions/export-product-types";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

type ExportFormat = "csv" | "json";

interface ExportPayload {
	filename: string;
	mimeType: string;
	content: string;
}

function downloadBlob(payload: ExportPayload) {
	const blob = new Blob([payload.content], { type: payload.mimeType });
	const url = URL.createObjectURL(blob);
	try {
		const link = document.createElement("a");
		link.href = url;
		link.download = payload.filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	} finally {
		URL.revokeObjectURL(url);
	}
}

export const useExportProductTypes = () => {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			exportProductTypes,
			createToastCallbacks({
				loadingMessage: "Export en cours...",
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"data" in result &&
						result.data &&
						typeof result.data === "object" &&
						"filename" in result.data &&
						"mimeType" in result.data &&
						"content" in result.data
					) {
						try {
							downloadBlob(result.data as ExportPayload);
						} catch {
							toast.error("Impossible de télécharger le fichier");
						}
					}
				},
			}),
		),
		undefined,
	);

	const runExport = (format: ExportFormat) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("format", format);
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		exportProductTypes: runExport,
	};
};
