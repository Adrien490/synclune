"use client";

import { bulkExportPayments } from "@/modules/payments/actions/bulk-export-payments";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition, useEffect } from "react";
import { ActionStatus } from "@/shared/types/server-action";

interface UseBulkExportPaymentsOptions {
	onSuccess?: () => void;
}

export function useBulkExportPayments(options?: UseBulkExportPaymentsOptions) {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkExportPayments,
			createToastCallbacks({
				onSuccess: () => {
					options?.onSuccess?.();
				},
			})
		),
		undefined
	);

	// Télécharger le CSV quand l'export réussit
	useEffect(() => {
		if (state?.status === ActionStatus.SUCCESS && state?.data) {
			const data = state.data as { csv: string; filename: string };
			const csvContent = atob(data.csv);
			const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = data.filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		}
	}, [state]);

	const exportPayments = (paymentIds: string[]) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(paymentIds));
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		exportPayments,
	};
}
