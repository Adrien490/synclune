/**
 * Service pour supprimer la piste audio des vidéos
 *
 * Utilise FFmpeg pour supprimer la piste audio sans re-encoder la vidéo.
 * Appelé automatiquement après l'upload d'une vidéo sur UploadThing.
 *
 * @module modules/media/services/strip-video-audio
 */

import { execFile, execSync, type ChildProcess } from "child_process";
import { existsSync, mkdirSync, unlinkSync, readFileSync, writeFileSync, statSync } from "fs";
import { join, extname } from "path";
import { tmpdir } from "os";
import { UTApi } from "uploadthing/server";
import { VIDEO_AUDIO_CONFIG } from "../constants/media.constants";

// FFmpeg path resolution (same as generate-video-thumbnail.ts)
let ffmpegStaticPath: string | null = null;
try {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	ffmpegStaticPath = require("ffmpeg-static") as string;
} catch {
	// ffmpeg-static non disponible
}

function findFFmpegPath(): string | null {
	if (ffmpegStaticPath && existsSync(ffmpegStaticPath)) {
		return ffmpegStaticPath;
	}

	try {
		const systemPath = execSync("which ffmpeg", { encoding: "utf-8" }).trim();
		if (systemPath && existsSync(systemPath)) {
			return systemPath;
		}
	} catch {
		// which ffmpeg a échoué
	}

	const commonPaths = [
		"/opt/homebrew/bin/ffmpeg",
		"/usr/local/bin/ffmpeg",
		"/usr/bin/ffmpeg",
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

export interface StripAudioResult {
	/** Nouvelle URL de la vidéo sans audio */
	url: string;
	/** Taille originale en octets */
	originalSize: number;
	/** Nouvelle taille en octets */
	newSize: number;
	/** Pourcentage de réduction */
	savedPercent: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function ensureTempDir(): string {
	const tempDir = join(tmpdir(), "synclune-strip-audio");
	if (!existsSync(tempDir)) {
		mkdirSync(tempDir, { recursive: true });
	}
	return tempDir;
}

function generateFileId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

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
 * Vérifie si une vidéo a une piste audio
 */
async function hasAudioTrack(videoPath: string): Promise<boolean> {
	if (!ffmpegPath) return true;

	const ffprobePath = ffmpegPath.replace(/ffmpeg$/, "ffprobe");
	if (!existsSync(ffprobePath)) {
		return true; // Assume audio si pas de ffprobe
	}

	try {
		const { stdout } = await execFileWithTimeout(
			ffprobePath,
			[
				"-v", "error",
				"-select_streams", "a",
				"-show_entries", "stream=codec_type",
				"-of", "csv=p=0",
				videoPath,
			],
			10000
		);
		return stdout.trim().includes("audio");
	} catch {
		return true; // Assume audio en cas d'erreur
	}
}

/**
 * Télécharge une vidéo depuis une URL
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 60000);

	try {
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
 * Supprime la piste audio d'une vidéo avec FFmpeg
 * Utilise -c:v copy pour éviter le re-encoding vidéo
 */
async function stripAudioFromVideo(inputPath: string, outputPath: string): Promise<void> {
	if (!ffmpegPath) {
		throw new Error("FFmpeg n'est pas disponible");
	}

	const args = [
		"-y",              // Écraser si existant
		"-i", inputPath,   // Fichier d'entrée
		"-c:v", "copy",    // Copier le flux vidéo sans re-encoding
		"-an",             // Supprimer la piste audio
		outputPath,        // Fichier de sortie
	];

	await execFileWithTimeout(ffmpegPath, args, VIDEO_AUDIO_CONFIG.stripAudioTimeout);

	if (!existsSync(outputPath)) {
		throw new Error("La vidéo sans audio n'a pas été créée");
	}

	const stats = statSync(outputPath);
	if (stats.size === 0) {
		throw new Error("La vidéo sans audio est vide");
	}
}

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

/**
 * Extrait le file key depuis une URL UploadThing
 */
function extractFileKey(url: string): string | null {
	const match = url.match(/\/f\/([a-zA-Z0-9_-]+)/);
	return match ? match[1] : null;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Supprime la piste audio d'une vidéo uploadée
 *
 * @param videoUrl - URL de la vidéo source (UploadThing)
 * @returns Nouvelle URL de la vidéo sans audio, ou null si pas de changement nécessaire
 *
 * @example
 * ```typescript
 * const result = await stripVideoAudio("https://utfs.io/f/xxxxx.mp4");
 * if (result) {
 *   console.log(`Nouvelle URL: ${result.url}, économie: ${result.savedPercent}%`);
 * }
 * ```
 */
export async function stripVideoAudio(videoUrl: string): Promise<StripAudioResult | null> {
	// Vérifier si la fonctionnalité est activée
	if (!VIDEO_AUDIO_CONFIG.stripAudioOnUpload) {
		return null;
	}

	// Vérifier FFmpeg
	if (!ffmpegPath || !existsSync(ffmpegPath)) {
		console.warn("[StripAudio] FFmpeg non disponible - suppression audio ignorée");
		return null;
	}

	const fileId = generateFileId();
	const tempDir = ensureTempDir();
	const ext = extname(new URL(videoUrl).pathname) || ".mp4";
	const inputPath = join(tempDir, `input-${fileId}${ext}`);
	const outputPath = join(tempDir, `output-${fileId}${ext}`);

	const tempFiles = [inputPath, outputPath];

	try {
		// 1. Télécharger la vidéo
		await downloadVideo(videoUrl, inputPath);

		const originalStats = statSync(inputPath);
		const originalSize = originalStats.size;

		// 2. Vérifier si la vidéo a de l'audio
		const hasAudio = await hasAudioTrack(inputPath);
		if (!hasAudio) {
			// Pas d'audio, retourner null pour indiquer aucun changement
			return null;
		}

		// 3. Supprimer l'audio
		await stripAudioFromVideo(inputPath, outputPath);

		const newStats = statSync(outputPath);
		const newSize = newStats.size;
		const savedPercent = Math.round(((originalSize - newSize) / originalSize) * 100);

		// 4. Upload la nouvelle vidéo
		const utapi = new UTApi();
		const fileBuffer = readFileSync(outputPath);
		const mimeType = ext === ".webm" ? "video/webm" : "video/mp4";
		const file = new File([fileBuffer], `video-${fileId}${ext}`, { type: mimeType });

		const uploadResult = await utapi.uploadFiles([file]);

		if (!uploadResult[0]?.data?.ufsUrl) {
			throw new Error("Échec upload de la vidéo sans audio");
		}

		const newUrl = uploadResult[0].data.ufsUrl;

		// 5. Supprimer l'ancienne vidéo d'UploadThing
		const oldFileKey = extractFileKey(videoUrl);
		if (oldFileKey) {
			try {
				await utapi.deleteFiles([oldFileKey]);
			} catch (error) {
				console.warn(
					"[StripAudio] Échec suppression ancienne vidéo:",
					error instanceof Error ? error.message : error
				);
			}
		}

		return {
			url: newUrl,
			originalSize,
			newSize,
			savedPercent,
		};
	} finally {
		cleanupTempFiles(tempFiles);
	}
}

/**
 * Vérifie si FFmpeg est disponible pour la suppression audio
 */
export function isStripAudioAvailable(): boolean {
	return VIDEO_AUDIO_CONFIG.stripAudioOnUpload && ffmpegPath !== null && existsSync(ffmpegPath);
}
