import type { CSSProperties } from "react";

interface AppearanceCallbackArgs {
	isDragActive: boolean;
	isUploading: boolean;
}

interface UploadDropzoneAppearanceOptions {
	/** Container height (default: "min(180px, 22vh)") */
	height?: string;
	/** Container min-height (default: "140px") */
	minHeight?: string;
	/** Container padding (default: "1.5rem") */
	padding?: string;
	/** Icon size (default: "2.5rem") */
	iconSize?: string;
	/** Label font size (default: "0.9rem") */
	labelFontSize?: string;
}

/**
 * Shared UploadDropzone appearance factory for catalog media upload zones.
 * Used by EditProductMediaSection and SkuGalleryField.
 */
export function getCatalogDropzoneAppearance(options: UploadDropzoneAppearanceOptions = {}) {
	const {
		height = "min(180px, 22vh)",
		minHeight = "140px",
		padding = "1.5rem",
		iconSize = "2.5rem",
		labelFontSize = "0.9rem",
	} = options;

	return {
		container: ({ isDragActive, isUploading }: AppearanceCallbackArgs): CSSProperties => ({
			border: "2px dashed",
			borderColor: isDragActive
				? "var(--primary)"
				: "color-mix(in oklch, var(--muted-foreground) 25%, transparent)",
			borderRadius: "0.75rem",
			backgroundColor: isDragActive
				? "color-mix(in oklch, var(--primary) 5%, transparent)"
				: "color-mix(in oklch, var(--muted) 30%, transparent)",
			padding,
			transition: "all 0.2s ease-in-out",
			height,
			minHeight,
			display: "flex",
			flexDirection: "column" as const,
			alignItems: "center",
			justifyContent: "center",
			gap: "0.5rem",
			cursor: isUploading ? "not-allowed" : "pointer",
			opacity: isUploading ? 0.7 : 1,
			position: "relative" as const,
			boxShadow: isDragActive
				? "0 0 0 1px color-mix(in oklch, var(--primary) 20%, transparent), 0 4px 12px color-mix(in oklch, var(--primary) 10%, transparent)"
				: "var(--shadow-sm)",
		}),
		uploadIcon: ({ isDragActive, isUploading }: AppearanceCallbackArgs): CSSProperties => ({
			color: isDragActive
				? "var(--primary)"
				: "color-mix(in oklch, var(--primary) 70%, transparent)",
			width: iconSize,
			height: iconSize,
			transition: "all 0.2s ease-in-out",
			transform: isDragActive ? "scale(1.1)" : "scale(1)",
			opacity: isUploading ? 0.5 : 1,
		}),
		label: ({ isDragActive, isUploading }: AppearanceCallbackArgs): CSSProperties => ({
			color: isDragActive ? "var(--primary)" : "var(--foreground)",
			fontSize: labelFontSize,
			fontWeight: "500",
			textAlign: "center" as const,
			transition: "color 0.2s ease-in-out",
			opacity: isUploading ? 0.5 : 1,
			width: "100%",
			wordBreak: "break-word" as const,
		}),
		allowedContent: ({ isUploading }: AppearanceCallbackArgs): CSSProperties => ({
			color: "var(--muted-foreground)",
			fontSize: "0.75rem",
			textAlign: "center" as const,
			marginTop: "0.25rem",
			opacity: isUploading ? 0.5 : 1,
		}),
	};
}
