/**
 * Service de génération de thumbnails vidéo côté serveur
 *
 * Utilise FFmpeg (via ffmpeg-static) pour extraire des frames des vidéos
 * et générer des miniatures optimisées pour le web.
 *
 * @module modules/media/services/generate-video-thumbnail
 */

import { execFile, execSync, type ChildProcess } from "child_process";
import { promisify } from "util";
import {
	existsSync,
	mkdirSync,
	unlinkSync,
	readFileSync,
	writeFileSync,
	statSync,
} from "fs";
import { join, extname } from "path";
import { tmpdir } from "os";
import { UTApi } from "uploadthing/server";
import {
	THUMBNAIL_CONFIG,
	VIDEO_EXTENSIONS,
} from "../constants/media.constants";

const execFileAsync = promisify(execFile);

// Importer ffmpeg-static si disponible, sinon utiliser le système
let ffmpegStaticPath: string | null = null;
try {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	ffmpegStaticPath = require("ffmpeg-static") as string;
} catch {
	// ffmpeg-static non disponible
}

/**
 * Trouve le chemin vers FFmpeg
 * Priorité: ffmpeg-static > système (homebrew) > null
 */
function findFFmpegPath(): string | null {
	// 1. Essayer ffmpeg-static
	if (ffmpegStaticPath && existsSync(ffmpegStaticPath)) {
		return ffmpegStaticPath;
	}

	// 2. Essayer le système (macOS/Linux)
	try {
		const systemPath = execSync("which ffmpeg", { encoding: "utf-8" }).trim();
		if (systemPath && existsSync(systemPath)) {
			return systemPath;
		}
	} catch {
		// which ffmpeg a échoué
	}

	// 3. Chemins communs en fallback
	const commonPaths = [
		"/opt/homebrew/bin/ffmpeg", // macOS Apple Silicon
		"/usr/local/bin/ffmpeg", // macOS Intel / Linux
		"/usr/bin/ffmpeg", // Linux
	];

	for (const path of commonPaths) {
		if (existsSync(path)) {
			return path;
		}
	}

	return null;
}

const ffmpegPath = findFFmpegPath();

// ============================================================================
// TYPES
// ============================================================================

export interface VideoThumbnailResult {
	/** URL de la miniature petite taille (160px) pour galerie */
	thumbnailSmallUrl: string;
	/** URL de la miniature moyenne (480px) pour poster vidéo */
	thumbnailUrl: string;
	/** Base64 blur placeholder (10x10) pour chargement progressif */
	blurDataUrl: string | null;
}

export interface GenerateVideoThumbnailOptions {
	/** Position de capture en secondes (défaut: 10% de la durée, max 1s) */
	captureTimeSeconds?: number;
	/** Identifiant unique pour les fichiers temporaires */
	fileId?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Crée un dossier temporaire pour le traitement
 */
function ensureTempDir(): string {
	const tempDir = join(tmpdir(), "synclune-thumbnails");
	if (!existsSync(tempDir)) {
		mkdirSync(tempDir, { recursive: true });
	}
	return tempDir;
}

/**
 * Génère un ID unique pour les fichiers temporaires
 */
function generateFileId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Exécute une commande avec timeout de manière sécurisée (via execFile)
 * Évite les risques d'injection de commande en utilisant un tableau d'arguments
 */
async function execFileWithTimeout(
	command: string,
	args: string[],
	timeout: number
): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		let child: ChildProcess | null = null;

		const timer = setTimeout(() => {
			if (child) {
				child.kill("SIGKILL");
			}
			reject(new Error(`Commande timeout après ${timeout}ms`));
		}, timeout);

		child = execFile(command, args, (error, stdout, stderr) => {
			clearTimeout(timer);
			if (error) {
				reject(error);
			} else {
				resolve({ stdout, stderr });
			}
		});
	});
}

/**
 * Valide que l'URL pointe vers un format vidéo supporté
 */
function isValidVideoFormat(url: string): boolean {
	try {
		const urlObj = new URL(url);
		const ext = extname(urlObj.pathname).toLowerCase();
		return VIDEO_EXTENSIONS.includes(ext as (typeof VIDEO_EXTENSIONS)[number]);
	} catch {
		return false;
	}
}

/**
 * Télécharge une vidéo depuis une URL avec validation de taille
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
	// Valider le format vidéo
	if (!isValidVideoFormat(url)) {
		const ext = extname(new URL(url).pathname) || "(inconnu)";
		console.warn(
			`[VideoThumbnail] Format vidéo potentiellement non supporté: ${ext}`
		);
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		THUMBNAIL_CONFIG.downloadTimeout
	);

	try {
		// Vérifier la taille avec HEAD request
		const headResponse = await fetch(url, {
			method: "HEAD",
			signal: controller.signal,
		});

		if (!headResponse.ok) {
			throw new Error(`HEAD request échouée: ${headResponse.status}`);
		}

		const contentLength = headResponse.headers.get("content-length");
		const maxSize = THUMBNAIL_CONFIG.maxSyncVideoSize;
		if (contentLength && parseInt(contentLength, 10) > maxSize) {
			const sizeMB = Math.round(parseInt(contentLength, 10) / 1024 / 1024);
			throw new Error(
				`Vidéo trop volumineuse pour traitement synchrone: ${sizeMB}MB (max: ${maxSize / 1024 / 1024}MB)`
			);
		}

		// Télécharger le fichier
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			throw new Error(`Échec téléchargement: ${response.status}`);
		}

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		writeFileSync(outputPath, buffer);
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Trouve le chemin vers FFprobe
 */
function findFFprobePath(): string | null {
	if (!ffmpegPath) return null;

	// FFprobe est généralement au même endroit que FFmpeg
	const ffprobePath = ffmpegPath.replace(/ffmpeg$/, "ffprobe");
	if (existsSync(ffprobePath)) {
		return ffprobePath;
	}

	// Essayer le système
	try {
		const systemPath = execSync("which ffprobe", { encoding: "utf-8" }).trim();
		if (systemPath && existsSync(systemPath)) {
			return systemPath;
		}
	} catch {
		// Ignorer
	}

	return null;
}

/**
 * Obtient la durée d'une vidéo avec FFprobe
 */
async function getVideoDuration(videoPath: string): Promise<number> {
	const ffprobePath = findFFprobePath();
	const fallbackDuration = THUMBNAIL_CONFIG.fallbackDuration;

	if (!ffprobePath) {
		console.warn(
			`[VideoThumbnail] FFprobe non disponible, utilisation durée fallback: ${fallbackDuration}s`
		);
		return fallbackDuration;
	}

	const args = [
		"-v",
		"error",
		"-show_entries",
		"format=duration",
		"-of",
		"default=noprint_wrappers=1:nokey=1",
		videoPath,
	];

	try {
		const { stdout } = await execFileWithTimeout(
			ffprobePath,
			args,
			THUMBNAIL_CONFIG.ffprobeTimeout
		);
		const duration = parseFloat(stdout.trim());
		if (isNaN(duration) || duration <= 0) {
			console.warn(
				`[VideoThumbnail] Durée vidéo invalide (${stdout.trim()}), utilisation fallback: ${fallbackDuration}s`
			);
			return fallbackDuration;
		}
		return duration;
	} catch (error) {
		console.warn(
			`[VideoThumbnail] Erreur FFprobe, utilisation durée fallback: ${fallbackDuration}s`,
			error instanceof Error ? error.message : error
		);
		return fallbackDuration;
	}
}

/**
 * Extrait une frame à une taille spécifique avec FFmpeg
 */
async function extractFrame(
	videoPath: string,
	outputPath: string,
	timeInSeconds: number,
	width: number,
	quality: number
): Promise<void> {
	if (!ffmpegPath) {
		throw new Error("FFmpeg n'est pas disponible");
	}

	// Arguments FFmpeg pour extraire une frame au format WebP
	const webpArgs = [
		"-y", // Écraser si existant
		"-ss",
		timeInSeconds.toString(),
		"-i",
		videoPath,
		"-vframes",
		"1",
		"-vf",
		`scale=${width}:-1`,
		"-c:v",
		"libwebp",
		"-quality",
		quality.toString(),
		outputPath,
	];

	try {
		await execFileWithTimeout(
			ffmpegPath,
			webpArgs,
			THUMBNAIL_CONFIG.ffmpegTimeout
		);
	} catch (webpError) {
		// Fallback vers JPEG si WebP échoue (libwebp non disponible)
		console.warn(
			`[VideoThumbnail] WebP échoué, fallback vers JPEG:`,
			webpError instanceof Error ? webpError.message : webpError
		);

		const jpegPath = outputPath.replace(".webp", ".jpg");
		const jpegArgs = [
			"-y",
			"-ss",
			timeInSeconds.toString(),
			"-i",
			videoPath,
			"-vframes",
			"1",
			"-vf",
			`scale=${width}:-1`,
			"-q:v",
			"2",
			jpegPath,
		];

		await execFileWithTimeout(
			ffmpegPath,
			jpegArgs,
			THUMBNAIL_CONFIG.ffmpegTimeout
		);

		// Lire et réécrire avec extension .webp (pour cohérence du nommage)
		const jpegBuffer = readFileSync(jpegPath);
		writeFileSync(outputPath, jpegBuffer);
		try {
			unlinkSync(jpegPath);
		} catch {
			// Ignorer erreur de cleanup
		}
	}

	// Valider que le fichier a été créé
	if (!existsSync(outputPath)) {
		throw new Error(`Miniature ${width}px non créée`);
	}

	const stats = statSync(outputPath);
	if (stats.size === 0) {
		throw new Error(`Miniature ${width}px vide (0 octets)`);
	}
}

/**
 * Génère un blur placeholder base64 depuis une thumbnail
 */
async function generateBlurDataUrl(
	thumbnailPath: string
): Promise<string | null> {
	if (!ffmpegPath) return null;

	const blurPath = thumbnailPath.replace(".webp", "-blur.webp");

	try {
		const args = [
			"-y",
			"-i",
			thumbnailPath,
			"-vf",
			"scale=10:10",
			"-c:v",
			"libwebp",
			"-quality",
			"50",
			blurPath,
		];

		await execFileWithTimeout(
			ffmpegPath,
			args,
			THUMBNAIL_CONFIG.blurTimeout
		);

		if (!existsSync(blurPath)) {
			console.warn(
				"[VideoThumbnail] Blur placeholder non créé (fichier manquant)"
			);
			return null;
		}

		const blurBuffer = readFileSync(blurPath);
		const base64 = blurBuffer.toString("base64");
		const blurDataUrl = `data:image/webp;base64,${base64}`;

		// Nettoyer
		try {
			unlinkSync(blurPath);
		} catch {
			// Ignorer erreur de cleanup
		}

		return blurDataUrl;
	} catch (error) {
		console.warn(
			"[VideoThumbnail] Échec génération blur placeholder:",
			error instanceof Error ? error.message : error
		);
		return null;
	}
}

/**
 * Nettoie les fichiers temporaires
 */
function cleanupTempFiles(paths: string[]): void {
	for (const path of paths) {
		try {
			if (existsSync(path)) {
				unlinkSync(path);
			}
		} catch {
			// Ignorer les erreurs de nettoyage
		}
	}
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Génère les thumbnails d'une vidéo côté serveur
 *
 * @param videoUrl - URL de la vidéo source (UploadThing ou autre CDN)
 * @param options - Options de génération
 * @returns URLs des thumbnails uploadées sur UploadThing + blur placeholder
 *
 * @example
 * ```typescript
 * const result = await generateVideoThumbnail(
 *   "https://utfs.io/f/xxxxx.mp4",
 *   { captureTimeSeconds: 0.5 }
 * );
 * // { thumbnailSmallUrl: "...", thumbnailUrl: "...", blurDataUrl: "data:..." }
 * ```
 */
export async function generateVideoThumbnail(
	videoUrl: string,
	options: GenerateVideoThumbnailOptions = {}
): Promise<VideoThumbnailResult> {
	const fileId = options.fileId || generateFileId();
	const tempDir = ensureTempDir();

	const videoPath = join(tempDir, `video-${fileId}.mp4`);
	const smallPath = join(tempDir, `thumb-small-${fileId}.webp`);
	const mediumPath = join(tempDir, `thumb-medium-${fileId}.webp`);

	const tempFiles = [videoPath, smallPath, mediumPath];

	try {
		// 1. Télécharger la vidéo
		await downloadVideo(videoUrl, videoPath);

		// 2. Obtenir la durée et calculer la position de capture
		const duration = await getVideoDuration(videoPath);
		const captureTime =
			options.captureTimeSeconds !== undefined
				? Math.min(options.captureTimeSeconds, duration)
				: Math.min(
						THUMBNAIL_CONFIG.maxCaptureTime,
						duration * THUMBNAIL_CONFIG.capturePosition
					);

		// 3. Extraire les deux tailles en parallèle
		await Promise.all([
			extractFrame(
				videoPath,
				smallPath,
				captureTime,
				THUMBNAIL_CONFIG.SMALL.width,
				Math.round(THUMBNAIL_CONFIG.SMALL.quality * 100)
			),
			extractFrame(
				videoPath,
				mediumPath,
				captureTime,
				THUMBNAIL_CONFIG.MEDIUM.width,
				Math.round(THUMBNAIL_CONFIG.MEDIUM.quality * 100)
			),
		]);

		// 4. Générer le blur placeholder
		const blurDataUrl = await generateBlurDataUrl(smallPath);

		// 5. Uploader les thumbnails sur UploadThing
		const utapi = new UTApi();

		const smallBuffer = readFileSync(smallPath);
		const mediumBuffer = readFileSync(mediumPath);

		const smallFile = new File(
			[smallBuffer],
			`thumb-small-${fileId}.webp`,
			{ type: "image/webp" }
		);
		const mediumFile = new File(
			[mediumBuffer],
			`thumb-medium-${fileId}.webp`,
			{ type: "image/webp" }
		);

		const uploadResults = await utapi.uploadFiles([smallFile, mediumFile]);

		const smallResult = uploadResults[0];
		const mediumResult = uploadResults[1];

		// Vérifier les résultats d'upload et logger les états partiels
		if (!smallResult?.data?.ufsUrl || !mediumResult?.data?.ufsUrl) {
			// Logger les URLs partielles pour cleanup manuel si nécessaire
			const partialUrls = [
				smallResult?.data?.ufsUrl,
				mediumResult?.data?.ufsUrl,
			].filter(Boolean);

			if (partialUrls.length > 0) {
				console.error(
					"[VideoThumbnail] Upload partiel - fichiers orphelins potentiels:",
					partialUrls
				);
			}

			const errors = [smallResult?.error, mediumResult?.error].filter(Boolean);
			throw new Error(
				`Échec upload thumbnails sur UploadThing: ${errors.map((e) => e?.message).join(", ") || "raison inconnue"}`
			);
		}

		return {
			thumbnailSmallUrl: smallResult.data.ufsUrl,
			thumbnailUrl: mediumResult.data.ufsUrl,
			blurDataUrl,
		};
	} finally {
		// Toujours nettoyer les fichiers temporaires
		// Note: Les buffers sont déjà lus en mémoire avant l'upload,
		// donc le cleanup est safe même si l'upload est en cours
		cleanupTempFiles(tempFiles);
	}
}

/**
 * Vérifie si FFmpeg est disponible
 */
export function isFFmpegAvailable(): boolean {
	return ffmpegPath !== null && existsSync(ffmpegPath);
}

/**
 * Obtient le chemin vers FFmpeg
 */
export function getFFmpegPath(): string | null {
	return ffmpegPath;
}
