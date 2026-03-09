"use client";

import { Button } from "@/shared/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DownloadInvoiceButtonProps {
	orderNumber: string;
}

export function DownloadInvoiceButton({ orderNumber }: DownloadInvoiceButtonProps) {
	const [isDownloading, setIsDownloading] = useState(false);

	async function handleDownload() {
		setIsDownloading(true);
		let response: Response;
		try {
			response = await fetch(`/api/orders/${orderNumber}/invoice`);
		} catch {
			toast.error("Impossible de télécharger la facture");
			setIsDownloading(false);
			return;
		}

		try {
			if (!response.ok) {
				if (response.status === 404) {
					toast.error("La facture n'est pas encore disponible");
				} else {
					toast.error("Erreur lors du téléchargement de la facture");
				}
				return;
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `facture-${orderNumber}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		} catch {
			toast.error("Erreur lors du téléchargement de la facture");
		} finally {
			setIsDownloading(false);
		}
	}

	return (
		<section className="space-y-4">
			<h2 className="flex items-center gap-2 text-base font-semibold">
				<FileText className="text-muted-foreground size-4" />
				Facture
			</h2>
			<div className="border-border/60 border-t pt-4">
				<Button
					variant="outline"
					className="w-full"
					onClick={handleDownload}
					disabled={isDownloading}
					aria-busy={isDownloading}
				>
					{isDownloading ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Download className="mr-2 h-4 w-4" />
					)}
					{isDownloading ? "Téléchargement..." : "Télécharger la facture"}
				</Button>
			</div>
		</section>
	);
}
