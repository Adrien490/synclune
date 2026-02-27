"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
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
 * Hook admin pour exporter les données d'un utilisateur (RGPD)
 */
export function useExportUserDataAdmin(options?: UseExportUserDataAdminOptions) {
	const [isPending, startTransition] = useTransition();
	const userNameRef = useRef("");

	// Wrapped action ref, built in useEffect to avoid ref access during render
	const wrappedActionRef = useRef<
		(prev: ActionState | undefined, formData: FormData) => Promise<ActionState>
	>(async (_prev: ActionState | undefined, formData: FormData) =>
		exportUserDataAdmin(formData.get("userId") as string),
	);
	useEffect(() => {
		wrappedActionRef.current = withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				exportUserDataAdmin(formData.get("userId") as string),
			createToastCallbacks({
				loadingMessage: "Export des données en cours...",
				onSuccess: (result) => {
					if (result.data) {
						const data = result.data as UserDataExport;
						const safeName = userNameRef.current.replace(/\s+/g, "-").toLowerCase();
						downloadJSON(
							data,
							`synclune-donnees-${safeName}-${new Date().toISOString().split("T")[0]}.json`,
						);
						options?.onSuccess?.(data);
					}
				},
				onError: (result) => {
					if (result.message) {
						options?.onError?.(result.message);
					}
				},
			}),
		);
	});

	const [, formAction, isActionPending] = useActionState(
		async (prev: ActionState | undefined, formData: FormData) =>
			wrappedActionRef.current(prev, formData),
		undefined,
	);

	const exportData = (userId: string, userName: string) => {
		userNameRef.current = userName;
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
