"use client";

import { useActionState, useTransition } from "react";
import {
	exportUserData,
	type UserDataExport,
} from "@/modules/users/actions/export-user-data";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";
import { useFileDownload } from "@/shared/hooks";

interface UseExportUserDataOptions {
	onSuccess?: (data: UserDataExport) => void;
	onError?: (message: string) => void;
}

/**
 * Hook pour exporter les données utilisateur (RGPD - Droit à la portabilité)
 *
 * @example
 * ```tsx
 * const { exportData, isPending } = useExportUserData({
 *   onSuccess: (data) => {
 *     // Télécharger le fichier JSON
 *   },
 * });
 *
 * return (
 *   <button onClick={exportData} disabled={isPending}>
 *     Exporter mes données
 *   </button>
 * );
 * ```
 */
export function useExportUserData(options?: UseExportUserDataOptions) {
	const [isPending, startTransition] = useTransition();
	const { downloadJSON } = useFileDownload();

	const [, formAction, isActionPending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, _formData: FormData) =>
				exportUserData(),
			createToastCallbacks({
				loadingMessage: "Export des données en cours...",
				onSuccess: (result) => {
					if (result.data) {
						const data = result.data as UserDataExport;
						downloadJSON(
							data,
							`synclune-mes-donnees-${new Date().toISOString().split("T")[0]}.json`
						);
						options?.onSuccess?.(data);
					}
				},
				onError: (result) => {
					if (result.message) {
						options?.onError?.(result.message);
					}
				},
			})
		),
		undefined
	);

	const exportData = () => {
		startTransition(() => {
			formAction(new FormData());
		});
	};

	return {
		exportData,
		isPending: isPending || isActionPending,
	};
}
