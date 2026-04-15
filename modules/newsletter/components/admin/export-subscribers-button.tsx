"use client";

import { Button } from "@/shared/components/ui/button";
import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ExportSubscribersButton() {
	const [isExporting, setIsExporting] = useState(false);

	async function handleExport() {
		setIsExporting(true);

		try {
			const response = await fetch("/api/admin/newsletter/export");

			if (!response.ok) {
				let errorMessage = "Erreur lors de l'export";
				try {
					const data = (await response.json()) as { error?: string } | null;
					if (data?.error) errorMessage = data.error;
				} catch {
					// Ignore parse error
				}
				toast.error(errorMessage);
				return;
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;

			const disposition = response.headers.get("Content-Disposition");
			link.download = disposition?.match(/filename="(.+)"/)?.[1] ?? "newsletter-export.csv";

			link.click();
			URL.revokeObjectURL(url);

			toast.success("Export téléchargé");
		} catch {
			toast.error("Erreur lors de l'export");
		} finally {
			setIsExporting(false);
		}
	}

	return (
		<Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
			{isExporting ? (
				<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
			) : (
				<Download className="mr-2 h-4 w-4" />
			)}
			{isExporting ? "Export..." : "Exporter CSV"}
		</Button>
	);
}
