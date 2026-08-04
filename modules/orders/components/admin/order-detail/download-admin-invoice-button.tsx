"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react/ssr";
import { Spinner } from "@/shared/components/ui/spinner";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { toast } from "@/shared/utils/toast";

interface DownloadAdminInvoiceButtonProps {
	orderNumber: string;
	invoiceNumber: string;
}

/**
 * Bouton inline OrderInvoiceCard pour télécharger le PDF facture côté admin.
 * Le bouton ResponsiveActionMenu d'OrderHeader reste pour la cohérence multi-actions,
 * mais on duplique ici pour donner accès immédiat depuis la card facture (EINV-UI-007).
 */
export function DownloadAdminInvoiceButton({
	orderNumber,
	invoiceNumber,
}: DownloadAdminInvoiceButtonProps) {
	const [isDownloading, setIsDownloading] = useState(false);

	async function handleDownload() {
		if (isDownloading) return;
		setIsDownloading(true);
		const task = (async () => {
			const response = await fetch(`/api/orders/${orderNumber}/invoice`);
			if (!response.ok) {
				throw new Error(
					response.status === 400
						? "Facture indisponible — commande non payée"
						: "Erreur lors du téléchargement de la facture",
				);
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `facture-${invoiceNumber}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		})();
		toast.promise(task, {
			loading: "Téléchargement…",
			success: "Facture téléchargée",
			error: (e) => (e instanceof Error ? e.message : "Téléchargement impossible"),
		});
		// Pas de `finally` : bail-out React Compiler (TryStatement + finalizer).
		try {
			await task;
		} catch {
			// surfaced by toast.promise
		}
		setIsDownloading(false);
	}

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleDownload}
			disabled={isDownloading}
			aria-busy={isDownloading || undefined}
			className="w-full"
		>
			{isDownloading ? (
				<Spinner presentational />
			) : (
				<DownloadSimpleIcon className="size-4" aria-hidden="true" />
			)}
			{isDownloading ? "Téléchargement…" : "Télécharger le PDF"}
		</Button>
	);
}
