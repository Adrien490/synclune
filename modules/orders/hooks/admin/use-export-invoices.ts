"use client";

import { ActionStatus } from "@/shared/types/server-action";
import { useActionState } from "react";
import { exportInvoices } from "@/modules/orders/actions/export-invoices";

/**
 * Hook personnalisé pour exporter le livre de recettes (factures)
 *
 * Gère l'état de l'action et le téléchargement automatique du CSV
 */
export function useExportInvoices() {
	const [state, action, isPending] = useActionState(exportInvoices, {
		status: ActionStatus.INITIAL,
		message: "",
	});

	/**
	 * Fonction helper pour déclencher le téléchargement du CSV
	 * à partir des données base64 retournées par l'action
	 */
	const downloadCSV = (csvBase64: string, filename: string) => {
		try {
			// Décoder base64
			const csvContent = atob(csvBase64);

			// Créer un Blob
			const blob = new Blob([csvContent], {
				type: "text/csv;charset=utf-8;",
			});

			// Créer un lien de téléchargement
			const link = document.createElement("a");
			const url = URL.createObjectURL(blob);

			link.setAttribute("href", url);
			link.setAttribute("download", filename);
			link.style.visibility = "hidden";

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Libérer la mémoire
			URL.revokeObjectURL(url);
		} catch (error) {
// console.error("Erreur lors du téléchargement du CSV:", error);
		}
	};

	return {
		action,
		isPending,
		state,
		downloadCSV,
	};
}
