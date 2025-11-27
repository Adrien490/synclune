"use client";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { downloadInvoice } from "@/modules/orders/actions/download-invoice";
import { ActionStatus } from "@/shared/types/server-action";
import { toast } from "sonner";

interface DownloadInvoiceButtonProps {
	orderId: string;
	invoiceNumber: string | null;
}

export function DownloadInvoiceButton({
	orderId,
	invoiceNumber,
}: DownloadInvoiceButtonProps) {
	const [isLoading, setIsLoading] = useState(false);

	if (!invoiceNumber) {
		return null;
	}

	const handleDownload = async () => {
		setIsLoading(true);
		try {
			const result = await downloadInvoice(orderId);

			if (result.status === ActionStatus.SUCCESS && result.data) {
				const data = result.data as { url: string };
				// Open the PDF in a new tab
				window.open(data.url, "_blank");
			} else {
				toast.error(result.message || "Impossible de télécharger la facture");
			}
		} catch (error) {
			toast.error("Une erreur est survenue");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card>
			<CardContent className="pt-6">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<FileText className="h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm font-medium">Facture</p>
							<p className="text-xs text-muted-foreground">{invoiceNumber}</p>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleDownload}
						disabled={isLoading}
					>
						{isLoading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<>
								<Download className="h-4 w-4 mr-2" />
								Télécharger
							</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
