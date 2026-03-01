/**
 * Utility functions for downloading files (CSV, JSON, Blob)
 *
 * Centralizes download logic to avoid duplication
 * across export hooks (newsletter, RGPD, etc.)
 */

/**
 * Downloads a CSV file encoded in base64
 * Uses TextDecoder for proper UTF-8 support (accented characters)
 */
export function downloadCSV(
	csvBase64: string,
	filename: string,
	onError?: (error: unknown) => void,
) {
	try {
		const binaryString = atob(csvBase64);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		const csvContent = new TextDecoder("utf-8").decode(bytes);
		const blob = new Blob([csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		downloadBlob(blob, filename);
	} catch (error) {
		onError?.(error);
	}
}

/**
 * Downloads JSON data as a file
 */
export function downloadJSON(data: unknown, filename: string, onError?: (error: unknown) => void) {
	try {
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json",
		});
		downloadBlob(blob, filename);
	} catch (error) {
		onError?.(error);
	}
}

/**
 * Downloads any Blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");

	link.href = url;
	link.download = filename;
	link.style.visibility = "hidden";

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	URL.revokeObjectURL(url);
}
