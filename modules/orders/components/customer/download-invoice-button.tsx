"use client";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Download, FileText, Loader2 } from "lucide-react";
import { useDownloadInvoice } from "@/modules/orders/hooks/use-download-invoice";

interface DownloadInvoiceButtonProps {
	orderId: string;
	invoiceNumber: string | null;
}

export function DownloadInvoiceButton({
	orderId,
	invoiceNumber,
}: DownloadInvoiceButtonProps) {
	const { download, isPending } = useDownloadInvoice();

	if (!invoiceNumber) {
		return null;
	}

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
						onClick={() => download(orderId)}
						disabled={isPending}
					>
						{isPending ? (
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
