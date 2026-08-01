"use client";

import { Download } from "lucide-react";
import { Spinner } from "@/shared/components/ui/spinner";
import { useState } from "react";
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
	const [isDownloading, setIsDownloading] = useState(false);

	async function handleDownload() {
		if (isDownloading) return;
		setIsDownloading(true);
		const endpoint = refundId
			? `/api/orders/${orderNumber}/credit-note/${refundId}`
			: `/api/orders/${orderNumber}/credit-note`;
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
				<Download className="size-4" aria-hidden="true" />
			)}
			{isDownloading ? "Téléchargement…" : "Télécharger l'avoir (PDF)"}
		</Button>
	);
}
