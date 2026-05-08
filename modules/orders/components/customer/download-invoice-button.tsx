"use client";

import { Button } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "@/shared/utils/toast";

interface DownloadInvoiceButtonProps {
	orderNumber: string;
}

export function DownloadInvoiceButton({ orderNumber }: DownloadInvoiceButtonProps) {
	const [isDownloading, setIsDownloading] = useState(false);

	async function handleDownload() {
		triggerHaptic("medium");
		setIsDownloading(true);

		const task = (async () => {
			let response: Response;
			try {
				response = await fetch(`/api/orders/${orderNumber}/invoice`);
			} catch {
				throw new Error("Impossible de télécharger la facture");
			}
			if (!response.ok) {
				if (response.status === 404) {
					throw new Error("La facture n'est pas encore disponible");
				}
				throw new Error("Erreur lors du téléchargement de la facture");
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `facture-${orderNumber}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		})();

		toast.promise(task, {
			loading: "Téléchargement…",
			success: "Facture téléchargée",
			error: (err) => (err instanceof Error ? err.message : "Impossible de télécharger la facture"),
		});

		try {
			await task;
		} catch {
			// error surfaced by toast.promise (haptic déjà déclenché par wrapper toast.error)
		} finally {
			setIsDownloading(false);
		}
	}

	return (
		<section className="space-y-4">
			<h2 className="text-base font-semibold">Facture</h2>
			<div className="border-border/60 border-t pt-4">
				<Button
					variant="outline"
					className="w-full"
					onClick={handleDownload}
					disabled={isDownloading}
					aria-busy={isDownloading}
				>
					{isDownloading ? (
						<LoaderCircle className="mr-2 size-4 animate-spin" />
					) : (
						<Download className="mr-2 size-4" />
					)}
					{isDownloading ? "Téléchargement…" : "Télécharger la facture"}
				</Button>
			</div>
		</section>
	);
}
