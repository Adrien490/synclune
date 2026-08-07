"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react/ssr";
import { Spinner } from "@/shared/components/ui/spinner";
import { useTransition } from "react";
import { Button } from "@/shared/components/ui/button";
import { toast } from "@/shared/utils/toast";

interface DownloadAdminCreditNoteButtonProps {
	orderNumber: string;
	creditNoteNumber: string;
	/**
	 * Avoir partiel rattaché à un remboursement : route `/credit-note/${refundId}`.
	 * Omis → avoir d'annulation totale (Order.creditNoteNumber) : route `/credit-note`.
	 */
	refundId?: string;
}

/**
 * Bouton inline pour télécharger le PDF d'avoir comptable (Art. 272-I CGI) côté
 * admin. Miroir de `download-admin-invoice-button.tsx` : la route sert le PDF
 * archivé immuable (SHA-256) en priorité. EINV-UI-101 (audit UI admin 2026-05-28).
 */
export function DownloadAdminCreditNoteButton({
	orderNumber,
	creditNoteNumber,
	refundId,
}: DownloadAdminCreditNoteButtonProps) {
	// Voir `download-admin-invoice-button.tsx` : `isPending` de `useTransition`
	// couvre tout le corps async, donc plus de booléen ni de `try/catch` tenant
	// lieu de `finally`.
	const [isDownloading, startDownload] = useTransition();

	function handleDownload() {
		if (isDownloading) return;
		const endpoint = refundId
			? `/api/orders/${orderNumber}/credit-note/${refundId}`
			: `/api/orders/${orderNumber}/credit-note`;
		startDownload(async () => {
			const task = (async () => {
				const response = await fetch(endpoint);
				if (!response.ok) {
					throw new Error(
						response.status === 404
							? "Avoir indisponible — aucun avoir comptable émis pour cette commande"
							: "Erreur lors du téléchargement de l'avoir",
					);
				}
				const blob = await response.blob();
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = `avoir-${creditNoteNumber}.pdf`;
				link.click();
				URL.revokeObjectURL(url);
			})();
			toast.promise(task, {
				loading: "Téléchargement…",
				success: "Avoir téléchargé",
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
			{isDownloading ? "Téléchargement…" : "Télécharger l'avoir (PDF)"}
		</Button>
	);
}
