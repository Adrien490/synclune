"use client";

import { Button } from "@/shared/components/ui/button";
import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "@/shared/utils/toast";

export function ExportSubscribersButton() {
	const [isExporting, setIsExporting] = useState(false);

	async function handleExport() {
		setIsExporting(true);

		const task = (async () => {
			let response: Response;
			try {
				response = await fetch("/api/admin/newsletter/export");
			} catch {
				throw new Error("Erreur lors de l'export");
			}
			if (!response.ok) {
				let errorMessage = "Erreur lors de l'export";
				try {
					const data = (await response.json()) as { error?: string } | null;
					if (data?.error) errorMessage = data.error;
				} catch {
					// ignore parse error
				}
				throw new Error(errorMessage);
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			const disposition = response.headers.get("Content-Disposition");
			link.download = disposition?.match(/filename="(.+)"/)?.[1] ?? "newsletter-export.csv";
			link.click();
			URL.revokeObjectURL(url);
		})();

		toast.promise(task, {
			loading: "Export en cours…",
			success: "Export téléchargé",
			error: (err) => (err instanceof Error ? err.message : "Erreur lors de l'export"),
		});

		try {
			await task;
		} catch {
			// error surfaced by toast.promise
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
