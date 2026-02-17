"use client";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { FileText, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DownloadInvoiceButtonProps {
	orderNumber: string;
}

export function DownloadInvoiceButton({
	orderNumber,
}: DownloadInvoiceButtonProps) {
	const [isDownloading, setIsDownloading] = useState(false);

	async function handleDownload() {
		setIsDownloading(true);
		try {
			const response = await fetch(
				`/api/orders/${orderNumber}/invoice`
			);
			if (!response.ok) {
				throw new Error("Erreur lors du téléchargement");
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `facture-${orderNumber}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		} catch {
			toast.error("Impossible de télécharger la facture");
		} finally {
			setIsDownloading(false);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg flex items-center gap-2">
					<FileText className="h-5 w-5" />
					Facture
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Button
					variant="outline"
					className="w-full"
					onClick={handleDownload}
					disabled={isDownloading}
				>
					{isDownloading ? (
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					) : (
						<Download className="h-4 w-4 mr-2" />
					)}
					{isDownloading ? "Téléchargement..." : "Télécharger la facture"}
				</Button>
			</CardContent>
		</Card>
	);
}
