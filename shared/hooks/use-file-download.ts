"use client";

/**
 * Hook pour télécharger des fichiers (CSV, JSON, Blob)
 *
 * Centralise la logique de téléchargement pour éviter la duplication
 * dans les différents hooks d'export (newsletter, RGPD, etc.)
 */
export function useFileDownload() {
	/**
	 * Télécharge un fichier CSV encodé en base64
	 */
	const downloadCSV = (csvBase64: string, filename: string) => {
		try {
			const csvContent = atob(csvBase64);
			const blob = new Blob([csvContent], {
				type: "text/csv;charset=utf-8;",
			});
			downloadBlob(blob, filename);
		} catch {
			// Ignore download errors
		}
	};

	/**
	 * Télécharge des données JSON
	 */
	const downloadJSON = (data: unknown, filename: string) => {
		try {
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			downloadBlob(blob, filename);
		} catch {
			// Ignore download errors
		}
	};

	/**
	 * Télécharge un Blob quelconque
	 */
	const downloadBlob = (blob: Blob, filename: string) => {
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");

		link.href = url;
		link.download = filename;
		link.style.visibility = "hidden";

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		URL.revokeObjectURL(url);
	};

	return {
		downloadCSV,
		downloadJSON,
		downloadBlob,
	};
}
