"use client";

import { useTransition, useCallback } from "react";
import { toast } from "sonner";
import { getOrderInvoiceUrls } from "@/modules/orders/data/get-order-invoice-urls";

interface UseDownloadInvoiceAdminOptions {
	onSuccess?: (url: string) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour télécharger une facture de commande
 * Utilise getOrderInvoiceUrls qui supporte les admins
 */
export function useDownloadInvoiceAdmin(options?: UseDownloadInvoiceAdminOptions) {
	const [isPending, startTransition] = useTransition();

	const download = useCallback(
		(orderId: string) => {
			startTransition(async () => {
				const toastId = toast.loading("Récupération de la facture...");

				const result = await getOrderInvoiceUrls(orderId);

				toast.dismiss(toastId);

				if (result.success && result.invoicePdfUrl) {
					window.open(result.invoicePdfUrl, "_blank");
					options?.onSuccess?.(result.invoicePdfUrl);
				} else {
					toast.error(result.error || "Impossible de télécharger la facture");
					options?.onError?.(result.error || "Erreur inconnue");
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
