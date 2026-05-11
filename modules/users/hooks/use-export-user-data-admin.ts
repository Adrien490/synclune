"use client";

import { useActionState, useTransition } from "react";
import { exportUserDataAdmin } from "@/modules/users/actions/admin/export-user-data-admin";
import type { UserDataExport } from "@/modules/users/actions/export-user-data";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";
import { downloadJSON } from "@/shared/utils/file-download";

interface UseExportUserDataAdminOptions {
	onSuccess?: (data: UserDataExport) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour exporter les données d'un utilisateur (RGPD).
 *
 * Le nom du fichier est dérivé de `data.profile.name` retourné par l'action
 * serveur (pas d'état partagé `useRef` susceptible d'être écrasé par un
 * second appel concurrent).
 */
export function useExportUserDataAdmin(options?: UseExportUserDataAdminOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction, isActionPending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				exportUserDataAdmin(formData.get("userId") as string),
			createToastCallbacks({
				loadingMessage: "Export des données en cours…",
				onSuccess: (result) => {
					if (!result.data) return;
					const data = result.data as UserDataExport;
					const rawName = data.profile.name ?? "utilisateur";
					const safeName = rawName.replace(/\s+/g, "-").toLowerCase();
					const date = new Date().toISOString().split("T")[0];
					downloadJSON(data, `synclune-donnees-${safeName}-${date}.json`);
					options?.onSuccess?.(data);
				},
				onError: (result) => {
					if (result.message) options?.onError?.(result.message);
				},
			}),
		),
		undefined,
	);

	const exportData = (userId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("userId", userId);
			formAction(formData);
		});
	};

	return {
		exportData,
		isPending: isPending || isActionPending,
	};
}
