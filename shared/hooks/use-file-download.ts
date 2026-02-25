"use client";

import {
	downloadCSV,
	downloadJSON,
	downloadBlob,
} from "@/shared/utils/file-download";

/**
 * @deprecated Import directly from "@/shared/utils/file-download" instead.
 * These are pure utility functions, not React hooks.
 */
export function useFileDownload() {
	return {
		downloadCSV,
		downloadJSON,
		downloadBlob,
	};
}
