"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react/ssr";
import { Spinner } from "@/shared/components/ui/spinner";
import { useTransition } from "react";
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
	// `useTransition` plutôt qu'un booléen fait main : en React 19 `isPending`
	// reste vrai pendant tout le corps async de `startTransition`, ce qui supprime
	// à la fois le `setState` de fin et le `try { await task } catch {}` qui
	// remplaçait un `finally` (bail-out React Compiler sur TryStatement +
	// finalizer). Le rejet reste porté par `toast.promise`.
	const [isDownloading, startDownload] = useTransition();

	function handleDownload() {
		if (isDownloading) return;
		startDownload(async () => {
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
			await task.catch(() => {
				// surfaced by toast.promise
			});
		});
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
