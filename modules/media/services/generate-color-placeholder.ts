/**
 * Service de generation de placeholders couleur optimises pour les images
 *
 * Genere des placeholders CSS ultra-compacts (~30-50 bytes) au lieu de base64 (~200-300 bytes).
 * Utilise sharp pour extraire la couleur dominante et creer un gradient subtil.
 *
 * @module modules/media/services/generate-color-placeholder
 */

import sharp from "sharp";
import { COLOR_PLACEHOLDER_CONFIG } from "../constants/media.constants";
import { isValidUploadThingUrl } from "../utils/validate-media-file";
import {
	downloadImage,
	truncateUrl,
	withRetry,
	type LogFn,
} from "./image-downloader.service";

// ============================================================================
// TYPES
// ============================================================================

export interface ColorPlaceholderResult {
	/** Couleur dominante en hexadecimal (ex: "#8B7355") */
	dominantColor: string;
	/** CSS gradient pour placeholder (ex: "linear-gradient(135deg, #8B7355 0%, #6B5344 100%)") */
	cssGradient: string;
	/** Data URL CSS compatible avec Next.js Image blurDataURL */
	blurDataUrl: string;
}

/** Fonction de log pour les avertissements */
export type ColorLogFn = LogFn;

export interface GenerateColorPlaceholderOptions {
	/** Timeout pour le telechargement (ms) */
	downloadTimeout?: number;
	/** Taille max de l'image (octets) */
	maxImageSize?: number;
	/** Taille de resize pour l'analyse (pixels) - plus petit = plus rapide */
	analysisSize?: number;
	/** Valider que l'URL est un domaine UploadThing */
	validateDomain?: boolean;
	/** Fonction de log personnalisee (defaut: console.warn) */
	logWarning?: ColorLogFn;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Logger par defaut (console.warn)
 */
const defaultLogger: ColorLogFn = (message) => console.warn(message);

/**
 * Convertit RGB en hexadecimal
 */
function rgbToHex(r: number, g: number, b: number): string {
	return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Assombrit une couleur hex d'un certain pourcentage
 */
function darkenHex(hex: string, percent: number): string {
	const num = parseInt(hex.slice(1), 16);
	const r = Math.max(0, Math.floor((num >> 16) * (1 - percent)));
	const g = Math.max(0, Math.floor(((num >> 8) & 0x00ff) * (1 - percent)));
	const b = Math.max(0, Math.floor((num & 0x0000ff) * (1 - percent)));
	return rgbToHex(r, g, b);
}

/**
 * Genere un SVG minimaliste encode en base64 pour blurDataURL
 * SVG plus compact qu'une image base64 classique
 */
function generateSvgBlurDataUrl(dominantColor: string, darkerColor: string): string {
	// SVG 10x10 avec gradient - ultra compact
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${dominantColor}"/><stop offset="100%" stop-color="${darkerColor}"/></linearGradient></defs><rect fill="url(#g)" width="10" height="10"/></svg>`;

	// Encode en base64 pour data URL
	const base64 = Buffer.from(svg).toString("base64");
	return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Extrait la couleur dominante d'un buffer image avec sharp
 */
async function extractDominantColor(
	buffer: Buffer,
	analysisSize: number
): Promise<{ r: number; g: number; b: number }> {
	// Resize tres petit pour analyse rapide des couleurs dominantes
	const { dominant } = await sharp(buffer)
		.resize(analysisSize, analysisSize, { fit: "cover" })
		.stats();

	return {
		r: Math.round(dominant.r),
		g: Math.round(dominant.g),
		b: Math.round(dominant.b),
	};
}

/**
 * Genere un placeholder couleur optimise pour une image
 *
 * @param imageUrl - URL de l'image source
 * @param options - Options de generation
 * @returns Placeholder couleur ou undefined si echec
 *
 * @example
 * ```ts
 * const placeholder = await generateColorPlaceholder("https://utfs.io/f/abc123.jpg");
 * // => { dominantColor: "#8B7355", cssGradient: "linear-gradient(...)", blurDataUrl: "data:image/svg+xml;base64,..." }
 * ```
 */
export async function generateColorPlaceholder(
	imageUrl: string,
	options: GenerateColorPlaceholderOptions = {}
): Promise<ColorPlaceholderResult | undefined> {
	const validateDomain = options.validateDomain ?? true;
	const analysisSize = options.analysisSize ?? COLOR_PLACEHOLDER_CONFIG.analysisSize;
	const log = options.logWarning ?? defaultLogger;

	// Validation du domaine source (protection SSRF)
	if (validateDomain && !isValidUploadThingUrl(imageUrl)) {
		log("[ColorPlaceholder] Domaine non autorise", { url: truncateUrl(imageUrl) });
		return undefined;
	}

	try {
		const buffer = await downloadImage(imageUrl, {
			downloadTimeout: options.downloadTimeout ?? COLOR_PLACEHOLDER_CONFIG.downloadTimeout,
			maxImageSize: options.maxImageSize ?? COLOR_PLACEHOLDER_CONFIG.maxImageSize,
			userAgent: "Synclune-ColorPlaceholder/1.0",
		});
		const { r, g, b } = await extractDominantColor(buffer, analysisSize);

		const dominantColor = rgbToHex(r, g, b);
		const darkerColor = darkenHex(dominantColor, COLOR_PLACEHOLDER_CONFIG.darkenPercent);

		const cssGradient = `linear-gradient(135deg, ${dominantColor} 0%, ${darkerColor} 100%)`;
		const blurDataUrl = generateSvgBlurDataUrl(dominantColor, darkerColor);

		return {
			dominantColor,
			cssGradient,
			blurDataUrl,
		};
	} catch (error) {
		const timeout = options.downloadTimeout ?? COLOR_PLACEHOLDER_CONFIG.downloadTimeout;
		if (error instanceof Error && error.name === "AbortError") {
			log("[ColorPlaceholder] Timeout", { timeoutMs: timeout, url: truncateUrl(imageUrl) });
		} else {
			log("[ColorPlaceholder] Generation echouee", {
				error: error instanceof Error ? error.message : String(error),
				url: truncateUrl(imageUrl),
			});
		}
		return undefined;
	}
}

/**
 * Genere un placeholder couleur avec retry automatique
 *
 * @param imageUrl - URL de l'image source
 * @param options - Options de generation
 * @returns Placeholder couleur
 * @throws {Error} Si toutes les tentatives echouent
 */
export async function generateColorPlaceholderWithRetry(
	imageUrl: string,
	options: GenerateColorPlaceholderOptions = {}
): Promise<ColorPlaceholderResult> {
	const validateDomain = options.validateDomain ?? true;
	const analysisSize = options.analysisSize ?? COLOR_PLACEHOLDER_CONFIG.analysisSize;

	if (validateDomain && !isValidUploadThingUrl(imageUrl)) {
		throw new Error(`Domaine non autorise: ${new URL(imageUrl).hostname}`);
	}

	return withRetry(
		async () => {
			const buffer = await downloadImage(imageUrl, {
				downloadTimeout: options.downloadTimeout ?? COLOR_PLACEHOLDER_CONFIG.downloadTimeout,
				maxImageSize: options.maxImageSize ?? COLOR_PLACEHOLDER_CONFIG.maxImageSize,
				userAgent: "Synclune-ColorPlaceholder/1.0",
			});
			const { r, g, b } = await extractDominantColor(buffer, analysisSize);

			const dominantColor = rgbToHex(r, g, b);
			const darkerColor = darkenHex(dominantColor, COLOR_PLACEHOLDER_CONFIG.darkenPercent);

			const cssGradient = `linear-gradient(135deg, ${dominantColor} 0%, ${darkerColor} 100%)`;
			const blurDataUrl = generateSvgBlurDataUrl(dominantColor, darkerColor);

			return {
				dominantColor,
				cssGradient,
				blurDataUrl,
			};
		},
		{
			maxRetries: COLOR_PLACEHOLDER_CONFIG.maxRetries,
			baseDelay: COLOR_PLACEHOLDER_CONFIG.retryBaseDelay,
		}
	);
}

/**
 * Genere un placeholder couleur depuis un buffer (pas de telechargement)
 *
 * @param buffer - Buffer de l'image
 * @param options - Options de generation
 * @returns Placeholder couleur
 */
export async function generateColorPlaceholderFromBuffer(
	buffer: Buffer,
	options: Pick<GenerateColorPlaceholderOptions, "analysisSize" | "maxImageSize"> = {}
): Promise<ColorPlaceholderResult> {
	const maxSize = options.maxImageSize ?? COLOR_PLACEHOLDER_CONFIG.maxImageSize;
	const analysisSize = options.analysisSize ?? COLOR_PLACEHOLDER_CONFIG.analysisSize;

	if (buffer.length > maxSize) {
		throw new Error(`Image trop volumineuse: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
	}

	const { r, g, b } = await extractDominantColor(buffer, analysisSize);

	const dominantColor = rgbToHex(r, g, b);
	const darkerColor = darkenHex(dominantColor, COLOR_PLACEHOLDER_CONFIG.darkenPercent);

	const cssGradient = `linear-gradient(135deg, ${dominantColor} 0%, ${darkerColor} 100%)`;
	const blurDataUrl = generateSvgBlurDataUrl(dominantColor, darkerColor);

	return {
		dominantColor,
		cssGradient,
		blurDataUrl,
	};
}

/**
 * Convertit un ancien blur base64 en placeholder couleur (extraction depuis data URL)
 * Utile pour la migration progressive
 *
 * @param base64DataUrl - Data URL base64 existante
 * @returns Placeholder couleur ou undefined si echec
 */
export async function convertBase64ToColorPlaceholder(
	base64DataUrl: string
): Promise<ColorPlaceholderResult | undefined> {
	try {
		// Extraire le buffer du base64
		const matches = base64DataUrl.match(/^data:image\/\w+;base64,(.+)$/);
		if (!matches) {
			return undefined;
		}

		const buffer = Buffer.from(matches[1], "base64");
		return generateColorPlaceholderFromBuffer(buffer);
	} catch {
		return undefined;
	}
}
