"use client";

import { useTransition, useCallback } from "react";
import { toast } from "sonner";
import { downloadInvoice } from "@/modules/orders/actions/download-invoice";
import { ActionStatus } from "@/shared/types/server-action";

interface UseDownloadInvoiceOptions {
	onSuccess?: (url: string) => void;
	onError?: (message: string) => void;
}

/**
 * Hook pour télécharger une facture de commande
 *
 * @example
 * ```tsx
 * const { download, isPending } = useDownloadInvoice();
 *
 * return (
 *   <Button onClick={() => download(orderId)} disabled={isPending}>
 *     Télécharger
 *   </Button>
 * );
 * ```
 */
export function useDownloadInvoice(options?: UseDownloadInvoiceOptions) {
	const [isPending, startTransition] = useTransition();

	const download = useCallback(
		(orderId: string) => {
			startTransition(async () => {
				const toastId = toast.loading("Récupération de la facture...");

				const result = await downloadInvoice(orderId);

				toast.dismiss(toastId);

				if (result.status === ActionStatus.SUCCESS && result.data) {
					const data = result.data as { url: string };
					window.open(data.url, "_blank");
					options?.onSuccess?.(data.url);
				} else {
					toast.error(result.message || "Impossible de télécharger la facture");
					options?.onError?.(result.message);
				}
			});
		},
		[options]
	);

	return {
		download,
		isPending,
	};
}
