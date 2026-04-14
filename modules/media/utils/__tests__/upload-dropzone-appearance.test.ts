import { describe, it, expect } from "vitest";
import { getCatalogDropzoneAppearance } from "../upload-dropzone-appearance";

// ============================================================================
// getCatalogDropzoneAppearance
// ============================================================================

describe("getCatalogDropzoneAppearance", () => {
	it("returns all required keys", () => {
		const appearance = getCatalogDropzoneAppearance();
		expect(appearance).toHaveProperty("container");
		expect(appearance).toHaveProperty("uploadIcon");
		expect(appearance).toHaveProperty("label");
		expect(appearance).toHaveProperty("allowedContent");
	});

	it("all values are functions", () => {
		const appearance = getCatalogDropzoneAppearance();
		expect(typeof appearance.container).toBe("function");
		expect(typeof appearance.uploadIcon).toBe("function");
		expect(typeof appearance.label).toBe("function");
		expect(typeof appearance.allowedContent).toBe("function");
	});

	describe("container", () => {
		it("returns CSSProperties for idle state", () => {
			const appearance = getCatalogDropzoneAppearance();
			const style = appearance.container({ isDragActive: false, isUploading: false });

			expect(style.border).toBe("2px dashed");
			expect(style.cursor).toBe("pointer");
			expect(style.opacity).toBe(1);
			expect(style.display).toBe("flex");
		});

		it("changes cursor and opacity when uploading", () => {
			const appearance = getCatalogDropzoneAppearance();
			const style = appearance.container({ isDragActive: false, isUploading: true });

			expect(style.cursor).toBe("not-allowed");
			expect(style.opacity).toBe(0.7);
		});

		it("changes border color when drag active", () => {
			const appearance = getCatalogDropzoneAppearance();
			const idle = appearance.container({ isDragActive: false, isUploading: false });
			const active = appearance.container({ isDragActive: true, isUploading: false });

			expect(active.borderColor).toBe("var(--primary)");
			expect(active.borderColor).not.toBe(idle.borderColor);
		});
	});

	describe("uploadIcon", () => {
		it("scales up when drag active", () => {
			const appearance = getCatalogDropzoneAppearance();
			const idle = appearance.uploadIcon({ isDragActive: false, isUploading: false });
			const active = appearance.uploadIcon({ isDragActive: true, isUploading: false });

			expect(idle.transform).toBe("scale(1)");
			expect(active.transform).toBe("scale(1.1)");
		});

		it("reduces opacity when uploading", () => {
			const appearance = getCatalogDropzoneAppearance();
			const style = appearance.uploadIcon({ isDragActive: false, isUploading: true });

			expect(style.opacity).toBe(0.5);
		});
	});

	describe("label", () => {
		it("uses primary color when drag active", () => {
			const appearance = getCatalogDropzoneAppearance();
			const active = appearance.label({ isDragActive: true, isUploading: false });

			expect(active.color).toBe("var(--primary)");
		});

		it("uses foreground color when idle", () => {
			const appearance = getCatalogDropzoneAppearance();
			const idle = appearance.label({ isDragActive: false, isUploading: false });

			expect(idle.color).toBe("var(--foreground)");
		});

		it("reduces opacity when uploading", () => {
			const appearance = getCatalogDropzoneAppearance();
			const style = appearance.label({ isDragActive: false, isUploading: true });

			expect(style.opacity).toBe(0.5);
		});
	});

	describe("allowedContent", () => {
		it("uses muted foreground color", () => {
			const appearance = getCatalogDropzoneAppearance();
			const style = appearance.allowedContent({ isDragActive: false, isUploading: false });

			expect(style.color).toBe("var(--muted-foreground)");
		});

		it("reduces opacity when uploading", () => {
			const appearance = getCatalogDropzoneAppearance();
			const style = appearance.allowedContent({ isDragActive: false, isUploading: true });

			expect(style.opacity).toBe(0.5);
		});
	});

	describe("custom options", () => {
		it("accepts custom height", () => {
			const appearance = getCatalogDropzoneAppearance({ height: "200px" });
			const style = appearance.container({ isDragActive: false, isUploading: false });

			expect(style.height).toBe("200px");
		});

		it("accepts custom minHeight", () => {
			const appearance = getCatalogDropzoneAppearance({ minHeight: "100px" });
			const style = appearance.container({ isDragActive: false, isUploading: false });

			expect(style.minHeight).toBe("100px");
		});

		it("accepts custom iconSize", () => {
			const appearance = getCatalogDropzoneAppearance({ iconSize: "3rem" });
			const style = appearance.uploadIcon({ isDragActive: false, isUploading: false });

			expect(style.width).toBe("3rem");
			expect(style.height).toBe("3rem");
		});

		it("accepts custom labelFontSize", () => {
			const appearance = getCatalogDropzoneAppearance({ labelFontSize: "1rem" });
			const style = appearance.label({ isDragActive: false, isUploading: false });

			expect(style.fontSize).toBe("1rem");
		});

		it("uses defaults when no options provided", () => {
			const appearance = getCatalogDropzoneAppearance();
			const containerStyle = appearance.container({ isDragActive: false, isUploading: false });
			const iconStyle = appearance.uploadIcon({ isDragActive: false, isUploading: false });
			const labelStyle = appearance.label({ isDragActive: false, isUploading: false });

			expect(containerStyle.height).toBe("min(180px, 22vh)");
			expect(containerStyle.minHeight).toBe("140px");
			expect(containerStyle.padding).toBe("1.5rem");
			expect(iconStyle.width).toBe("2.5rem");
			expect(labelStyle.fontSize).toBe("0.9rem");
		});
	});
});
