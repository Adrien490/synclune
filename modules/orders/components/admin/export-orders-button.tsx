"use client";

import { useState } from "react";
import { DownloadSimpleIcon } from "@phosphor-icons/react/ssr";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { downloadCSV } from "@/shared/utils/file-download";
import { toast } from "@/shared/utils/toast";

/**
 * Export du livre de recettes (Art. 50-0 CGI) — CSV des commandes encaissées
 * (PAID / SHIPPED / REFUNDED), généré par `/api/admin/orders/export`.
 */
export function ExportOrdersButton() {
	const [isPending, setIsPending] = useState(false);

	const handleExport = async () => {
		setIsPending(true);
		try {
			const response = await fetch("/api/admin/orders/export", { method: "POST" });
			if (!response.ok) {
				throw new Error(`Export refusé (${response.status})`);
			}
			const { csvBase64, filename } = (await response.json()) as {
				csvBase64: string;
				filename: string;
			};
			downloadCSV(csvBase64, filename, () => {
				toast.error("Le téléchargement du CSV a échoué. Réessaie.");
			});
		} catch {
			toast.error("L'export du livre de recettes a échoué. Réessaie.");
		} finally {
			setIsPending(false);
		}
	};

	return (
		<Button variant="outline" onClick={handleExport} disabled={isPending}>
			{isPending ? <Spinner aria-hidden="true" /> : <DownloadSimpleIcon aria-hidden="true" />}
			Exporter le livre de recettes
		</Button>
	);
}
