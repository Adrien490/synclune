"use client";

import { useTransition, useCallback } from "react";
import { toast } from "sonner";
import { exportUserDataAdmin } from "@/modules/users/actions/admin/export-user-data-admin";
import type { UserDataExport } from "@/modules/users/actions/export-user-data";
import { ActionStatus } from "@/shared/types/server-action";

interface UseExportUserDataAdminOptions {
	onSuccess?: (data: UserDataExport) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour exporter les données d'un utilisateur (RGPD)
 */
export function useExportUserDataAdmin(options?: UseExportUserDataAdminOptions) {
	const [isPending, startTransition] = useTransition();

	const exportData = useCallback(
		(userId: string, userName: string) => {
			startTransition(async () => {
				const toastId = toast.loading("Export des données en cours...");

				try {
					const result = await exportUserDataAdmin(userId);

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
						link.download = `synclune-donnees-${userName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;
						document.body.appendChild(link);
						link.click();
						document.body.removeChild(link);
						URL.revokeObjectURL(url);

						toast.success("Données exportées avec succès");
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
		},
		[options]
	);

	return {
		exportData,
		isPending,
	};
}
