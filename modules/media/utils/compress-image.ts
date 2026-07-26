/**
 * Client-side image compression with EXIF auto-rotation.
 *
 * Reduces upload bandwidth on mobile (iPhone photos = 5-12MB → ~600KB-1.5MB)
 * and avoids 90° rotated photos via `createImageBitmap({ imageOrientation: "from-image" })`.
 *
 * HEIC handling: Safari + Chrome macOS decode HEIC natively via createImageBitmap.
 * Chrome/Firefox/Edge on other platforms fall back to libheif WASM (heic-to/csp,
 * lazy-loaded only when a HEIC file is encountered).
 */

const HEIC_MIME_TYPES = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];
const HEIC_EXTENSIONS = [".heic", ".heif"];

/** Threshold under which compression is skipped (file is already small enough) */
const SKIP_COMPRESSION_THRESHOLD = 1024 * 1024; // 1 MB

export interface CompressImageOptions {
	/** Maximum dimension (longest side) in pixels. Default: 2048 */
	maxDim?: number;
	/** Output quality 0-1. Default: 0.85 */
	quality?: number;
	/** Output MIME type. Default: best available ("image/avif" → "image/webp" → "image/jpeg") */
	mimeType?: "image/avif" | "image/webp" | "image/jpeg";
	/** Progress callback fired between phases (decode, resize, encode) — values in [0..1] */
	onProgress?: (percent: number) => void;
}

export interface CompressImageResult {
	/** Compressed file (or original if compression skipped/failed) */
	file: File;
	/** Whether compression actually ran */
	compressed: boolean;
	/** Original size in bytes */
	originalSize: number;
	/** Final size in bytes */
	finalSize: number;
}

/**
 * True if the file is HEIC/HEIF (iPhone default format).
 */
export function isHeicFile(file: File): boolean {
	const type = file.type.toLowerCase();
	if (HEIC_MIME_TYPES.includes(type)) return true;
	const name = file.name.toLowerCase();
	return HEIC_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * True if the browser supports createImageBitmap with imageOrientation option.
 */
function supportsImageBitmapOrientation(): boolean {
	if (typeof createImageBitmap !== "function") return false;
	try {
		const opts: ImageBitmapOptions = { imageOrientation: "from-image" };
		return "imageOrientation" in opts;
	} catch {
		return false;
	}
}

/**
 * True if Save-Data network preference is enabled — caller may compress more aggressively.
 */
export function prefersReducedData(): boolean {
	if (typeof navigator === "undefined") return false;
	const conn = (
		navigator as Navigator & {
			connection?: { saveData?: boolean };
		}
	).connection;
	return conn?.saveData === true;
}

/**
 * True if the browser can encode WebP via canvas.toBlob (all evergreen browsers since 2020).
 */
function supportsWebPEncoding(): boolean {
	if (typeof document === "undefined") return false;
	try {
		const canvas = document.createElement("canvas");
		canvas.width = 1;
		canvas.height = 1;
		return canvas.toDataURL("image/webp").startsWith("data:image/webp");
	} catch {
		return false;
	}
}

/**
 * True if the browser can encode AVIF via canvas.toDataURL (Safari 16.4+, Chrome 85+ desktop, Chrome 100+ Android).
 * AVIF compresses ~30-50% better than WebP at equivalent visual quality.
 */
let _avifSupportCache: boolean | null = null;
function supportsAvifEncoding(): boolean {
	if (_avifSupportCache !== null) return _avifSupportCache;
	if (typeof document === "undefined") {
		_avifSupportCache = false;
		return false;
	}
	try {
		const canvas = document.createElement("canvas");
		canvas.width = 1;
		canvas.height = 1;
		_avifSupportCache = canvas.toDataURL("image/avif").startsWith("data:image/avif");
		return _avifSupportCache;
	} catch {
		_avifSupportCache = false;
		return false;
	}
}

function pickOutputMimeType(
	requested: CompressImageOptions["mimeType"],
): "image/avif" | "image/webp" | "image/jpeg" {
	if (requested === "image/jpeg") return "image/jpeg";
	if (requested === "image/webp") return supportsWebPEncoding() ? "image/webp" : "image/jpeg";
	if (requested === "image/avif") {
		if (supportsAvifEncoding()) return "image/avif";
		return supportsWebPEncoding() ? "image/webp" : "image/jpeg";
	}
	// Default: prefer AVIF, then WebP, then JPEG
	if (supportsAvifEncoding()) return "image/avif";
	return supportsWebPEncoding() ? "image/webp" : "image/jpeg";
}

function computeTargetDimensions(
	width: number,
	height: number,
	maxDim: number,
): { width: number; height: number } {
	if (width <= maxDim && height <= maxDim) {
		return { width, height };
	}
	const ratio = width / height;
	if (width >= height) {
		return { width: maxDim, height: Math.round(maxDim / ratio) };
	}
	return { width: Math.round(maxDim * ratio), height: maxDim };
}

function renameWithExtension(originalName: string, newMimeType: string): string {
	const dot = originalName.lastIndexOf(".");
	const stem = dot > 0 ? originalName.slice(0, dot) : originalName;
	const ext =
		newMimeType === "image/avif" ? ".avif" : newMimeType === "image/webp" ? ".webp" : ".jpg";
	return `${stem}${ext}`;
}

async function decodeBitmap(file: File): Promise<ImageBitmap> {
	if (supportsImageBitmapOrientation()) {
		return createImageBitmap(file, { imageOrientation: "from-image" });
	}
	return createImageBitmap(file);
}

/**
 * Decode a HEIC/HEIF blob via libheif WASM (heic-to/csp).
 * Lazy-loaded so non-HEIC uploads pay zero bundle cost.
 */
async function decodeHeicBitmap(file: File): Promise<ImageBitmap> {
	const { heicTo } = await import("heic-to/csp");
	return heicTo({
		blob: file,
		type: "bitmap",
		options: supportsImageBitmapOrientation() ? { imageOrientation: "from-image" } : undefined,
	});
}

/**
 * Compress an image client-side with EXIF orientation respect.
 *
 * Skips compression if:
 * - File is already small (< 1MB)
 * - Browser lacks createImageBitmap (very old browsers)
 *
 * For HEIC files, attempts native decode first (Safari, Chrome macOS) then
 * falls back to libheif WASM via lazy-loaded `heic-to/csp`. Only throws
 * `HeicDecodeError` if both paths fail (corrupt file or libheif crash).
 */
export async function compressImage(
	file: File,
	options: CompressImageOptions = {},
): Promise<CompressImageResult> {
	const originalSize = file.size;
	const onProgress = options.onProgress;

	// Skip small files entirely — compression would add no benefit
	if (originalSize < SKIP_COMPRESSION_THRESHOLD) {
		onProgress?.(1);
		return { file, compressed: false, originalSize, finalSize: originalSize };
	}

	if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas === "undefined") {
		onProgress?.(1);
		return { file, compressed: false, originalSize, finalSize: originalSize };
	}

	onProgress?.(0.05);

	const heic = isHeicFile(file);
	let bitmap: ImageBitmap;
	try {
		bitmap = await decodeBitmap(file);
	} catch (err) {
		if (heic) {
			try {
				bitmap = await decodeHeicBitmap(file);
			} catch {
				throw new HeicDecodeError(file.name);
			}
		} else {
			throw err;
		}
	}

	// Decode complete — heaviest step for HEIC (libheif WASM)
	onProgress?.(0.6);

	const reducedData = prefersReducedData();
	const maxDim = options.maxDim ?? (reducedData ? 1280 : 2048);
	const quality = options.quality ?? (reducedData ? 0.75 : 0.85);
	const outputMimeType = pickOutputMimeType(options.mimeType);

	const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height, maxDim);

	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		bitmap.close();
		onProgress?.(1);
		return { file, compressed: false, originalSize, finalSize: originalSize };
	}

	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	onProgress?.(0.8);

	let blob: Blob;
	try {
		blob = await canvas.convertToBlob({ type: outputMimeType, quality });
	} catch {
		// Some platforms reject AVIF in convertToBlob despite passing the toDataURL check —
		// retry once with WebP/JPEG fallback.
		if (outputMimeType === "image/avif") {
			const fallback = supportsWebPEncoding() ? "image/webp" : "image/jpeg";
			blob = await canvas.convertToBlob({ type: fallback, quality });
			const newName = renameWithExtension(file.name, fallback);
			const compressedFile = new File([blob], newName, {
				type: fallback,
				lastModified: file.lastModified,
			});
			onProgress?.(1);
			if (blob.size >= originalSize && !heic) {
				return { file, compressed: false, originalSize, finalSize: originalSize };
			}
			return { file: compressedFile, compressed: true, originalSize, finalSize: blob.size };
		}
		throw new Error(`Compression failed for ${file.name}`);
	}

	onProgress?.(1);

	// If compression made it bigger (rare, e.g. tiny PNG with alpha), keep original
	if (blob.size >= originalSize && !heic) {
		return { file, compressed: false, originalSize, finalSize: originalSize };
	}

	const newName = renameWithExtension(file.name, outputMimeType);
	const compressedFile = new File([blob], newName, {
		type: outputMimeType,
		lastModified: file.lastModified,
	});

	return {
		file: compressedFile,
		compressed: true,
		originalSize,
		finalSize: blob.size,
	};
}

/**
 * Thrown when a HEIC file cannot be decoded by either the native browser path
 * or the libheif WASM fallback (corrupt file, multi-image container without
 * primary frame, or unsupported codec variant).
 */
export class HeicDecodeError extends Error {
	readonly fileName: string;
	constructor(fileName: string) {
		super(
			`Le fichier HEIC "${fileName}" n'a pas pu être décodé. ` +
				"Le fichier semble corrompu ou utilise un encodage non supporté.",
		);
		this.name = "HeicDecodeError";
		this.fileName = fileName;
	}
}
