"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
	exportUserData,
	type UserDataExport,
} from "@/modules/users/actions/export-user-data";
import { ActionStatus } from "@/shared/types/server-action";

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

	const exportData = () => {
		startTransition(async () => {
			const toastId = toast.loading("Export des données en cours...");

			try {
				const result = await exportUserData();

				toast.dismiss(toastId);

				if (result.status === ActionStatus.SUCCESS && result.data) {
					const data = result.data as UserDataExport;

					// Créer et télécharger le fichier JSON
					const blob = new Blob([JSON.stringify(data, null, 2)], {
						type: "application/json",
					});
					const url = URL.createObjectURL(blob);
					const link = document.createElement("a");
					link.href = url;
					link.download = `synclune-mes-donnees-${new Date().toISOString().split("T")[0]}.json`;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					URL.revokeObjectURL(url);

					toast.success("Vos données ont été exportées");
					options?.onSuccess?.(data);
				} else {
					toast.error(result.message);
					options?.onError?.(result.message);
				}
			} catch (error) {
				toast.dismiss(toastId);
				const message =
					error instanceof Error ? error.message : "Erreur lors de l'export";
				toast.error(message);
				options?.onError?.(message);
			}
		});
	};

	return {
		exportData,
		isPending,
	};
}
