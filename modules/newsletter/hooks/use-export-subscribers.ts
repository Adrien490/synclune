"use client";

import { useActionState, useTransition } from "react";
import { exportSubscribers } from "@/modules/newsletter/actions/export-subscribers";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";
import { useFileDownload } from "@/shared/hooks";

/**
 * Hook personnalisé pour exporter les abonnés newsletter
 *
 * Gère l'état de l'action et le téléchargement automatique du CSV
 */
export function useExportSubscribers() {
	const [isPending, startTransition] = useTransition();
	const { downloadCSV } = useFileDownload();

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(
			exportSubscribers,
			createToastCallbacks({
				loadingMessage: "Export en cours...",
				onSuccess: (result) => {
					if (
						result.data &&
						typeof result.data === "object" &&
						"csv" in result.data &&
						"filename" in result.data
					) {
						const { csv, filename } = result.data as {
							csv: string;
							filename: string;
						};
						downloadCSV(csv, filename);
					}
				},
			})
		),
		undefined
	);

	/**
	 * Exporte les abonnés et déclenche le téléchargement automatique au succès
	 */
	const handleExport = (status: "all" | "active" | "inactive") => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("status", status);
			formData.append("format", "csv");
			formAction(formData);
		});
	};

	return {
		handleExport,
		isPending: isPending || isActionPending,
		state: state as ActionState | undefined,
	};
}
