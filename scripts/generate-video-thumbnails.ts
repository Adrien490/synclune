/**
 * Script de migration pour generer les miniatures des videos existantes
 *
 * Ce script genere les thumbnails (480px) pour toutes les videos SkuMedia
 * qui n'ont pas encore de thumbnailUrl.
 *
 * Etapes:
 * 1. Recupere les SkuMedia de type VIDEO sans thumbnailUrl
 * 2. Telecharge chaque video temporairement (streaming)
 * 3. Valide le format video avec FFmpeg
 * 4. Extrait une frame a 10% de la duree (max 1s) avec FFmpeg
 * 5. Genere la thumbnail WebP
 * 6. Upload sur UploadThing et met a jour la base de donnees
 *
 * ============================================================================
 * FFmpeg: Necessite ffmpeg installe sur le systeme
 *   macOS:   brew install ffmpeg
 *   Ubuntu:  sudo apt install ffmpeg
 * ============================================================================
 *
 * Variables d'environnement requises:
 * - DATABASE_URL: Connection string PostgreSQL
 * - UPLOADTHING_TOKEN: Token API UploadThing
 *
 * Usage:
 *   pnpm generate:video-thumbnails                 # Traiter toutes les videos
 *   pnpm generate:video-thumbnails --dry-run      # Simuler sans modification
 *   pnpm generate:video-thumbnails --parallel=3   # Parallelisation (defaut: 5)
 *   pnpm generate:video-thumbnails --no-blur      # Skip generation blur placeholders
 *   pnpm generate:video-thumbnails --check        # Health check (FFmpeg + DB) sans traitement
 *   pnpm generate:video-thumbnails --json         # Logs JSON pour monitoring/Sentry
 *
 * @see modules/media/services/generate-video-thumbnail.ts pour la generation cote serveur (upload)
 */

import { execFile, execSync, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream, existsSync, renameSync } from "node:fs";
import { mkdir, readFile, rm, stat, statfs, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";
import { UTApi } from "uploadthing/server";
import {
	THUMBNAIL_CONFIG,
	VIDEO_MIGRATION_CONFIG,
} from "../modules/media/constants/thumbnail.constants";
import { isValidCuid, isValidUploadThingUrl } from "../modules/media/utils/validate-media-file";
import type { MediaItem, ProcessResult } from "../modules/media/types/script.types";
import { requireScriptEnvVars } from "../shared/utils/script-env";
import { delay, withRetry, createScriptLogger, processInBatches } from "./lib/script-utils";

// ============================================================================
// FFMPEG PATH RESOLUTION
// ============================================================================

/**
 * Trouve le chemin vers FFmpeg
 * Priorité: système (which ffmpeg) > chemins communs
 */
function findFFmpegPath(): string | null {
	// 1. Essayer le système (macOS/Linux)
	try {
		const systemPath = execSync("which ffmpeg", { encoding: "utf-8" }).trim();
		if (systemPath && existsSync(systemPath)) {
			return systemPath;
		}
	} catch {
		// which ffmpeg a échoué
	}

	// 2. Chemins communs en fallback
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

/** Chemin vers FFmpeg résolu au démarrage */
const FFMPEG_PATH = findFFmpegPath();

// ============================================================================
// VALIDATION ENVIRONNEMENT
// ============================================================================

const SCRIPT_NAME = "generate-video-thumbnails";
const env = requireScriptEnvVars(["DATABASE_URL", "UPLOADTHING_TOKEN"] as const, SCRIPT_NAME);

// ============================================================================
// CONFIGURATION
// ============================================================================

// Taille de la thumbnail (centralisée depuis THUMBNAIL_CONFIG)
const THUMBNAIL_SIZE = THUMBNAIL_CONFIG.MEDIUM.width;

// Qualité de la thumbnail (centralisée depuis THUMBNAIL_CONFIG, convertie 0-1 → 0-100)
const THUMBNAIL_QUALITY = Math.round(THUMBNAIL_CONFIG.MEDIUM.quality * 100);

// Position de capture (centralisée depuis THUMBNAIL_CONFIG)
const CAPTURE_POSITION = THUMBNAIL_CONFIG.capturePosition;
const MAX_CAPTURE_TIME = THUMBNAIL_CONFIG.maxCaptureTime;

// Timeouts et limites (centralisés depuis VIDEO_MIGRATION_CONFIG)
const DOWNLOAD_TIMEOUT = VIDEO_MIGRATION_CONFIG.downloadTimeout;
const FFMPEG_TIMEOUT = VIDEO_MIGRATION_CONFIG.ffmpegTimeout;
const MAX_VIDEO_SIZE = VIDEO_MIGRATION_CONFIG.maxVideoSize;
const MAX_VIDEO_DURATION = VIDEO_MIGRATION_CONFIG.maxVideoDuration;

// Retry configuration (centralisée depuis THUMBNAIL_CONFIG)
const MAX_RETRIES = THUMBNAIL_CONFIG.maxRetries;
const RETRY_BASE_DELAY = THUMBNAIL_CONFIG.retryBaseDelay;

// Dossier temporaire avec PID pour éviter les race conditions entre instances
// Utilise tmpdir() (système) au lieu de cwd() (projet) pour éviter pollution du workspace
const TEMP_DIR = join(tmpdir(), `synclune-video-thumbnails-${process.pid}`);

// Arguments CLI
const DRY_RUN = process.argv.includes("--dry-run");
const PARALLEL_ARG = process.argv.find((arg) => arg.startsWith("--parallel="));
const rawParallel = PARALLEL_ARG?.split("=")[1];
const parsedParallel = rawParallel ? parseInt(rawParallel, 10) : NaN;
const PARALLEL_COUNT = !isNaN(parsedParallel) && parsedParallel > 0 ? parsedParallel : 5;
const JSON_LOGS = process.argv.includes("--json");
const NO_BLUR = process.argv.includes("--no-blur");
const CHECK_ONLY = process.argv.includes("--check");
const SHOW_HELP = process.argv.includes("--help") || process.argv.includes("-h");

// Afficher l'aide si demandé
if (SHOW_HELP) {
	console.log(`
🎬 Script de generation de miniatures video

Usage:
  pnpm generate:video-thumbnails [options]

Options:
  --dry-run       Simuler sans modification (aucune ecriture DB/upload)
  --parallel=N    Nombre de videos en parallele (defaut: 5, max recommande: 10)
  --no-blur       Ne pas generer les blur placeholders base64
  --check         Health check uniquement (FFmpeg + connexion DB)
  --json          Logs JSON structures pour monitoring/Sentry
  --help, -h      Afficher cette aide

Exemples:
  pnpm generate:video-thumbnails                  # Traiter toutes les videos
  pnpm generate:video-thumbnails --dry-run        # Simuler sans modification
  pnpm generate:video-thumbnails --parallel=3     # Limiter a 3 en parallele
  pnpm generate:video-thumbnails --check          # Verifier FFmpeg et DB

Configuration:
  - Taille thumbnail: ${THUMBNAIL_SIZE}px
  - Qualite: ${THUMBNAIL_QUALITY}%
  - Capture a: ${Math.round(CAPTURE_POSITION * 100)}% de la duree (max ${MAX_CAPTURE_TIME}s)
  - Taille max video: ${MAX_VIDEO_SIZE / 1024 / 1024}MB
  - Timeout download: ${DOWNLOAD_TIMEOUT / 1000}s
  - Timeout FFmpeg: ${FFMPEG_TIMEOUT / 1000}s

Variables d'environnement requises:
  DATABASE_URL        Connection string PostgreSQL (Neon)
  UPLOADTHING_TOKEN   Token API UploadThing
`);
	process.exit(0);
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/** Flag pour interruption gracieuse */
let shuttingDown = false;

/** ID unique du batch pour traçabilité des logs (set dans main) */
let currentBatchId: string = "";

process.on("SIGTERM", () => {
	console.log("\n⚠️  SIGTERM recu - arret en cours...");
	shuttingDown = true;
});

process.on("SIGINT", () => {
	console.log("\n⚠️  SIGINT recu - arret en cours...");
	shuttingDown = true;
});

// ============================================================================
// LOGS STRUCTURÉS (Sentry-ready)
// ============================================================================

const {
	logSuccess,
	logWarn: logWarning,
	logError,
} = createScriptLogger({
	jsonEnabled: JSON_LOGS,
});

// Initialisation Prisma avec validation env
const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Initialisation UTApi (UPLOADTHING_TOKEN validé via env)
const utapi = new UTApi();

// ============================================================================
// TYPES
// ============================================================================

interface FFmpegOptions {
	inputPath: string;
	outputPath: string;
	timeInSeconds: number;
	width: number;
	quality: number;
	format: "webp" | "jpeg";
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Options de retry configurées pour ce script
 */
const RETRY_OPTIONS = {
	maxRetries: MAX_RETRIES,
	baseDelay: RETRY_BASE_DELAY,
	onRetry: (attempt: number, maxRetries: number, waitTime: number) => {
		console.log(`    Retry ${attempt}/${maxRetries} dans ${waitTime}ms...`);
	},
};

/**
 * Exécuter une commande avec execFile (sécurisé contre injection shell)
 * Utilise execFile au lieu de exec pour éviter l'interprétation shell des arguments
 */
async function execFileWithTimeout(
	command: string,
	args: string[],
	timeout: number,
): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const child: ChildProcess = execFile(command, args, (error, stdout, stderr) => {
			if (error) {
				reject(error);
			} else {
				resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
			}
		});

		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			reject(new Error(`Commande timeout après ${timeout}ms`));
		}, timeout);

		child.on("exit", () => clearTimeout(timer));
	});
}

/**
 * Vérifie que FFmpeg est disponible sur le système
 */
async function checkFFmpegInstalled(): Promise<boolean> {
	if (!FFMPEG_PATH) {
		return false;
	}
	try {
		await execFileWithTimeout(FFMPEG_PATH, ["-version"], 5000);
		return true;
	} catch {
		return false;
	}
}

/**
 * Construit les arguments FFmpeg pour l'extraction de frame (sécurisé)
 * Retourne un tableau d'arguments pour execFile (pas d'interprétation shell)
 */
function buildFFmpegArgs(options: FFmpegOptions): string[] {
	const { inputPath, outputPath, timeInSeconds, width, quality, format } = options;

	const args = [
		"-y", // Écraser le fichier si existant
		"-ss",
		timeInSeconds.toString(), // Position temporelle
		"-i",
		inputPath, // Fichier d'entrée (pas de quotes, execFile gère)
		"-vframes",
		"1", // Une seule frame
		"-vf",
		`scale=${width}:-1`, // Redimensionner en gardant le ratio
	];

	if (format === "webp") {
		args.push("-c:v", "libwebp", "-quality", quality.toString());
	} else {
		args.push("-q:v", "2"); // Qualité JPEG
	}

	args.push(outputPath); // Fichier de sortie (pas de quotes)

	return args;
}

/**
 * Construit les arguments FFmpeg pour validation vidéo (vérifie qu'un fichier est une vidéo valide)
 * Utilise -i pour analyser le fichier et -f null pour ne pas produire de sortie
 */
function buildFFmpegValidateArgs(videoPath: string): string[] {
	return [
		"-v",
		"error",
		"-i",
		videoPath,
		"-t",
		"0.1", // Lire seulement 0.1s
		"-f",
		"null",
		"-",
	];
}

/**
 * Construit les arguments FFmpeg pour obtenir les informations du fichier
 * La durée est extraite du stderr de cette commande
 */
function buildFFmpegInfoArgs(videoPath: string): string[] {
	return ["-i", videoPath, "-f", "null", "-t", "0", "-"];
}

/**
 * Construit les arguments FFmpeg pour générer un blur placeholder (sécurisé)
 */
function buildBlurArgs(inputPath: string, outputPath: string): string[] {
	return [
		"-y",
		"-i",
		inputPath,
		"-vf",
		"scale=10:10",
		"-c:v",
		"libwebp",
		"-quality",
		"50",
		outputPath,
	];
}

/**
 * Verifie l'espace disque disponible dans le dossier temporaire
 * Retourne false si moins de minBytes disponible (defaut: 1GB)
 */
async function checkDiskSpace(minBytes: number = 1024 * 1024 * 1024): Promise<boolean> {
	try {
		const stats = await statfs(tmpdir());
		const availableBytes = stats.bfree * stats.bsize;
		return availableBytes >= minBytes;
	} catch {
		// Si on ne peut pas verifier, on continue
		return true;
	}
}

/**
 * Télécharge une vidéo depuis une URL avec streaming (économie mémoire)
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
	// Validation de l'URL avant téléchargement
	if (!isValidUploadThingUrl(url)) {
		throw new Error(
			`URL non autorisée: le domaine doit être UploadThing (${url.substring(0, 50)}...)`,
		);
	}

	// Node.js 2025: utilise AbortSignal.timeout() natif au lieu de setTimeout manuel
	const timeoutSignal = AbortSignal.timeout(DOWNLOAD_TIMEOUT);

	// D'abord, vérifier la taille avec HEAD request
	const headResponse = await fetch(url, {
		method: "HEAD",
		signal: timeoutSignal,
	});

	if (!headResponse.ok) {
		throw new Error(`HEAD request échouée: ${headResponse.status}`);
	}

	const contentLength = headResponse.headers.get("content-length");
	if (contentLength && parseInt(contentLength, 10) > MAX_VIDEO_SIZE) {
		throw new Error(
			`Vidéo trop volumineuse: ${Math.round(parseInt(contentLength, 10) / 1024 / 1024)}MB (max: ${MAX_VIDEO_SIZE / 1024 / 1024}MB)`,
		);
	}

	// Télécharger le fichier avec streaming
	const response = await fetch(url, { signal: timeoutSignal });
	if (!response.ok) {
		throw new Error(`Échec du téléchargement: ${response.status} ${response.statusText}`);
	}

	if (!response.body) {
		throw new Error("Pas de body dans la réponse");
	}

	// Streaming vers le fichier (économie mémoire)
	const writeStream = createWriteStream(outputPath);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Type mismatch Node.js ReadableStream vs Web ReadableStream
	const readable = Readable.fromWeb(response.body as any);
	await pipeline(readable, writeStream);

	// Vérifier la taille après téléchargement
	const stats = await stat(outputPath);
	if (stats.size > MAX_VIDEO_SIZE) {
		await unlink(outputPath);
		throw new Error(
			`Vidéo trop volumineuse: ${Math.round(stats.size / 1024 / 1024)}MB (max: ${MAX_VIDEO_SIZE / 1024 / 1024}MB)`,
		);
	}
}

/**
 * Valide qu'un fichier est une vidéo valide avec FFmpeg
 * Si FFmpeg peut lire le fichier sans erreur, c'est une vidéo valide
 */
async function validateVideoFormat(videoPath: string): Promise<boolean> {
	if (!FFMPEG_PATH) return false;
	try {
		await execFileWithTimeout(
			FFMPEG_PATH,
			buildFFmpegValidateArgs(videoPath),
			VIDEO_MIGRATION_CONFIG.validationTimeout,
		);
		return true;
	} catch {
		return false;
	}
}

/**
 * Parse la durée depuis le stderr de FFmpeg
 * Format attendu: "Duration: HH:MM:SS.ms" ou "Duration: N/A"
 */
function parseDurationFromStderr(stderr: string): number | null {
	const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
	if (!durationMatch) return null;

	const hours = parseInt(durationMatch[1], 10);
	const minutes = parseInt(durationMatch[2], 10);
	const seconds = parseFloat(durationMatch[3]);

	return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Obtient la durée d'une vidéo avec FFmpeg
 * Extrait la durée depuis le stderr de la commande -i
 * Ajoute un warning si durée > MAX_VIDEO_DURATION
 */
async function getVideoDuration(videoPath: string, mediaId?: string): Promise<number> {
	if (!FFMPEG_PATH) {
		logWarning("ffmpeg_not_available", { mediaId, fallback: THUMBNAIL_CONFIG.fallbackDuration });
		return THUMBNAIL_CONFIG.fallbackDuration;
	}

	try {
		// FFmpeg écrit les infos dans stderr, pas stdout
		// La commande va "échouer" car on ne produit pas de sortie, mais on récupère stderr
		const { stderr } = await execFileWithTimeout(
			FFMPEG_PATH,
			buildFFmpegInfoArgs(videoPath),
			VIDEO_MIGRATION_CONFIG.infoTimeout,
		).catch((error: Error & { stderr?: string }) => {
			// FFmpeg retourne une erreur mais stderr contient les infos
			if (error.stderr) {
				return { stdout: "", stderr: error.stderr };
			}
			throw error;
		});

		const duration = parseDurationFromStderr(stderr);
		if (duration === null || duration <= 0) {
			logWarning("duration_detection_failed", {
				mediaId,
				fallback: THUMBNAIL_CONFIG.fallbackDuration,
			});
			return THUMBNAIL_CONFIG.fallbackDuration;
		}

		// Avertissement si vidéo trop longue
		if (duration > MAX_VIDEO_DURATION) {
			const durationMin = Math.floor(duration / 60);
			const durationSec = Math.round(duration % 60);
			console.log(
				`    ⚠️  Vidéo longue: ${durationMin}m${durationSec}s (recommandé: <${MAX_VIDEO_DURATION / 60}min pour les produits)`,
			);
			logWarning("video_duration_warning", {
				mediaId,
				duration,
				maxRecommended: MAX_VIDEO_DURATION,
				durationFormatted: `${durationMin}m${durationSec}s`,
			});
		}

		return duration;
	} catch {
		logWarning("ffmpeg_duration_failed", { mediaId, fallback: THUMBNAIL_CONFIG.fallbackDuration });
		return THUMBNAIL_CONFIG.fallbackDuration;
	}
}

/**
 * Extrait une frame d'une vidéo avec FFmpeg à une taille spécifique (sécurisé)
 */
async function extractFrameAtSize(
	videoPath: string,
	outputPath: string,
	timeInSeconds: number,
	width: number,
	quality: number,
): Promise<void> {
	if (!FFMPEG_PATH) {
		throw new Error("FFmpeg n'est pas disponible");
	}

	// Arguments WebP (sécurisé - utilise execFile)
	const webpArgs = buildFFmpegArgs({
		inputPath: videoPath,
		outputPath,
		timeInSeconds,
		width,
		quality,
		format: "webp",
	});

	try {
		await execFileWithTimeout(FFMPEG_PATH, webpArgs, FFMPEG_TIMEOUT);
	} catch {
		console.log(`    WebP échoué pour ${width}px, fallback vers JPEG...`);
		// Si WebP échoue, essayer avec JPEG
		const jpegOutputPath = outputPath.replace(".webp", ".jpg");
		const jpegArgs = buildFFmpegArgs({
			inputPath: videoPath,
			outputPath: jpegOutputPath,
			timeInSeconds,
			width,
			quality: 2, // Qualité JPEG
			format: "jpeg",
		});

		await execFileWithTimeout(FFMPEG_PATH, jpegArgs, FFMPEG_TIMEOUT);

		// Renommer en .webp pour la cohérence (renameSync déjà importé)
		renameSync(jpegOutputPath, outputPath);
	}

	// Valider que le fichier a été créé et n'est pas vide
	if (!existsSync(outputPath)) {
		throw new Error(`La miniature ${width}px n'a pas été créée`);
	}

	const stats = await stat(outputPath);
	if (stats.size === 0) {
		throw new Error(`La miniature ${width}px est vide (0 octets)`);
	}
}

/**
 * Extrait la thumbnail
 */
async function extractThumbnail(
	videoPath: string,
	outputPath: string,
	timeInSeconds: number,
): Promise<void> {
	await extractFrameAtSize(videoPath, outputPath, timeInSeconds, THUMBNAIL_SIZE, THUMBNAIL_QUALITY);
}

/**
 * Génère un blur data URL (base64) depuis une image thumbnail (sécurisé)
 * Redimensionne l'image à 10x10 pour un placeholder très léger
 */
async function generateBlurDataUrl(thumbnailPath: string): Promise<string | null> {
	if (!FFMPEG_PATH) return null;

	try {
		// Générer une version 10x10 de la thumbnail small
		const blurPath = thumbnailPath.replace(".webp", "-blur.webp");

		// Arguments sécurisés pour FFmpeg (pas de shell interpretation)
		await execFileWithTimeout(
			FFMPEG_PATH,
			buildBlurArgs(thumbnailPath, blurPath),
			VIDEO_MIGRATION_CONFIG.blurTimeout,
		);

		if (!existsSync(blurPath)) {
			return null;
		}

		const blurBuffer = await readFile(blurPath);
		const base64 = blurBuffer.toString("base64");
		const blurDataUrl = `data:image/webp;base64,${base64}`;

		// Nettoyer le fichier blur temporaire
		try {
			await unlink(blurPath);
		} catch (cleanupError) {
			logWarning("blur_cleanup_failed", { error: String(cleanupError), path: blurPath });
		}

		return blurDataUrl;
	} catch (error) {
		console.log(
			`    Blur generation échouée: ${error instanceof Error ? error.message : String(error)}`,
		);
		return null;
	}
}

/**
 * Upload une miniature sur UploadThing
 */
async function uploadThumbnail(filePath: string, mediaId: string): Promise<string> {
	const fileBuffer = await readFile(filePath);
	const fileName = `thumbnail-${mediaId}.webp`;
	const file = new File([fileBuffer], fileName, { type: "image/webp" });

	const response = await utapi.uploadFiles([file]);

	if (!response[0]?.data?.ufsUrl) {
		throw new Error("Upload échoué: pas d'URL retournée");
	}

	return response[0].data.ufsUrl;
}

/**
 * Traite une vidéo : télécharge, extrait frames, upload, met à jour DB
 */
async function processVideo(
	media: MediaItem,
	index: number,
	total: number,
): Promise<ProcessResult> {
	// Verifier interruption avant traitement
	if (shuttingDown) {
		return { id: media.id, success: false, error: "Script interrompu (graceful shutdown)" };
	}

	// Validation CUID de l'ID avant utilisation dans les chemins de fichiers
	if (!isValidCuid(media.id)) {
		const errorMsg = `ID invalide (doit être un CUID): ${media.id}`;
		console.error(`  ❌ ${errorMsg}`);
		logError("invalid_media_id", {
			batchId: currentBatchId,
			mediaId: media.id,
			reason: "not_a_cuid",
		});
		return { id: media.id, success: false, error: errorMsg };
	}

	const videoPath = join(TEMP_DIR, `video-${media.id}.mp4`);
	const thumbnailPath = join(TEMP_DIR, `thumbnail-${media.id}.webp`);

	console.log(`\n[${index + 1}/${total}] Traitement de ${media.id}...`);
	console.log(`  URL: ${media.url.substring(0, 80)}...`);

	if (DRY_RUN) {
		console.log("  [DRY-RUN] Serait traité");
		return { id: media.id, success: true };
	}

	// Métriques de durée par opération
	const startTotal = Date.now();
	let downloadMs = 0;
	let validationMs = 0;
	let extractionMs = 0;
	let blurMs = 0;
	let uploadMs = 0;
	let dbUpdateMs = 0;

	try {
		// 1. Télécharger la vidéo avec retry (streaming)
		console.log("  Téléchargement de la vidéo (streaming)...");
		const startDownload = Date.now();
		await withRetry(() => downloadVideo(media.url, videoPath), RETRY_OPTIONS);
		downloadMs = Date.now() - startDownload;

		// 2. Valider que c'est bien une vidéo
		console.log("  Validation du format vidéo...");
		const startValidation = Date.now();
		const isValidVideo = await validateVideoFormat(videoPath);
		if (!isValidVideo) {
			throw new Error("Le fichier téléchargé n'est pas une vidéo valide");
		}

		// 3. Obtenir la durée et calculer la position de capture
		const duration = await getVideoDuration(videoPath, media.id);
		validationMs = Date.now() - startValidation;
		const rawCaptureTime = Math.min(MAX_CAPTURE_TIME, duration * CAPTURE_POSITION);
		// Validation sécurisée: fallback à 0 si NaN/Infinity (ex: FFprobe échoué)
		const captureTime = Number.isFinite(rawCaptureTime) ? rawCaptureTime : 0;
		console.log(`  Durée: ${duration.toFixed(1)}s, capture à ${captureTime.toFixed(2)}s`);

		// 4. Extraire la miniature
		console.log("  Extraction de la miniature...");
		const startExtraction = Date.now();
		await extractThumbnail(videoPath, thumbnailPath, captureTime);
		extractionMs = Date.now() - startExtraction;

		// 5. Générer le blur placeholder depuis la thumbnail (optionnel)
		let blurDataUrl: string | null = null;
		if (NO_BLUR) {
			console.log("  Blur: skipped (--no-blur)");
		} else {
			console.log("  Génération du blur placeholder...");
			const startBlur = Date.now();
			blurDataUrl = await generateBlurDataUrl(thumbnailPath);
			blurMs = Date.now() - startBlur;
			if (blurDataUrl) {
				console.log(`  Blur: ${blurDataUrl.length} caractères base64`);
			} else {
				console.log("  Blur: non généré (optionnel)");
			}
		}

		// 6. Upload la miniature sur UploadThing
		console.log("  Upload de la miniature...");
		const startUpload = Date.now();
		const thumbnailUrl = await withRetry(
			() => uploadThumbnail(thumbnailPath, media.id),
			RETRY_OPTIONS,
		);
		uploadMs = Date.now() - startUpload;
		console.log(`  Thumbnail: ${thumbnailUrl.substring(0, 50)}...`);

		// 7. Mettre à jour la base de données avec l'URL et le blur
		console.log("  Mise à jour de la base de données...");
		const startDbUpdate = Date.now();
		await prisma.skuMedia.update({
			where: { id: media.id },
			data: {
				thumbnailUrl,
				...(blurDataUrl && { blurDataUrl }),
			},
		});
		dbUpdateMs = Date.now() - startDbUpdate;

		const totalMs = Date.now() - startTotal;
		const metrics = {
			totalMs,
			downloadMs,
			validationMs,
			extractionMs,
			blurMs,
			uploadMs,
			dbUpdateMs,
		};

		console.log(`  ✅ Traitement terminé en ${(totalMs / 1000).toFixed(1)}s`);

		// Log structuré des métriques pour monitoring
		logSuccess("video_processed", { batchId: currentBatchId, mediaId: media.id, ...metrics });

		return { id: media.id, success: true, metrics };
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error(`  ❌ Erreur: ${errorMsg}`);
		return { id: media.id, success: false, error: errorMsg };
	} finally {
		// Nettoyer les fichiers temporaires (async)
		const filesToClean = [videoPath, thumbnailPath];
		await Promise.all(
			filesToClean.map(async (file) => {
				try {
					if (existsSync(file)) await unlink(file);
				} catch (cleanupError) {
					logWarning("file_cleanup_failed", { error: String(cleanupError), path: file });
				}
			}),
		);
	}
}

/**
 * Traite les vidéos par batch avec parallélisation
 * Utilise processInBatches des utilitaires partagés
 */
async function processVideosInBatches(
	videos: MediaItem[],
	batchSize: number,
): Promise<ProcessResult[]> {
	return processInBatches({
		items: videos,
		batchSize,
		processItem: processVideo,
		batchDelay: 1000,
		onBatchStart: (batchNumber, totalBatches, batchItemCount) => {
			console.log(`\n${"─".repeat(50)}`);
			console.log(`Batch ${batchNumber}/${totalBatches} (${batchItemCount} vidéos)`);
		},
	});
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
	// Générer un ID unique pour ce batch (traçabilité logs)
	currentBatchId = randomUUID().slice(0, 8);

	console.log("🎬 Script de génération de miniatures vidéo");
	console.log("=".repeat(50));
	console.log(`Configuration:`);
	console.log(`  - Batch ID: ${currentBatchId}`);
	console.log(`  - Parallélisation: ${PARALLEL_COUNT} vidéos simultanées`);
	console.log(`  - Taille max vidéo: ${MAX_VIDEO_SIZE / 1024 / 1024}MB`);
	console.log(`  - Timeout téléchargement: ${DOWNLOAD_TIMEOUT / 1000}s`);
	console.log(`  - Timeout FFmpeg: ${FFMPEG_TIMEOUT / 1000}s`);
	console.log(`  - Retries: ${MAX_RETRIES}`);
	console.log(`  - Dossier temp: ${TEMP_DIR}`);
	console.log(`  - Blur placeholders: ${NO_BLUR ? "désactivé (--no-blur)" : "activé"}`);

	if (DRY_RUN) {
		console.log("\n⚠️  Mode DRY-RUN activé - aucune modification ne sera effectuée");
	}

	if (CHECK_ONLY) {
		console.log("\n🔍 Mode CHECK - vérification sans traitement");
	}

	// Verifier FFmpeg
	console.log("\nVerification de FFmpeg...");
	const ffmpegInstalled = await checkFFmpegInstalled();
	if (!ffmpegInstalled) {
		console.error("❌ FFmpeg n'est pas disponible!");
		console.error("");
		console.error("Diagnostic:");
		console.error(`  - Chemin resolu: ${FFMPEG_PATH || "aucun"}`);

		// Verifier les chemins communs
		const commonPaths = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"];
		const foundPaths = commonPaths.filter((p) => existsSync(p));
		if (foundPaths.length > 0) {
			console.error(`  - Chemins systeme trouves: ${foundPaths.join(", ")}`);
		} else {
			console.error("  - Aucun FFmpeg systeme trouve");
		}

		console.error("");
		console.error("Installation:");
		console.error("  macOS:   brew install ffmpeg");
		console.error("  Ubuntu:  sudo apt install ffmpeg");
		console.error("  Windows: choco install ffmpeg");
		console.error("");
		console.error("Verification: ffmpeg -version");

		logError("ffmpeg_not_available", {
			batchId: currentBatchId,
			resolvedPath: FFMPEG_PATH,
			foundSystemPaths: foundPaths,
		});

		process.exit(1);
	}
	console.log(`✅ FFmpeg disponible`);
	console.log(`   Chemin: ${FFMPEG_PATH}`);

	// Mode CHECK: vérifier la connexion DB puis sortir
	if (CHECK_ONLY) {
		console.log("\nVerification de la connexion base de données...");
		try {
			const count = await prisma.skuMedia.count({
				where: { mediaType: "VIDEO", thumbnailUrl: null },
			});
			console.log(`✅ Connexion DB OK - ${count} vidéo(s) à traiter`);
			console.log("\n✅ Health check terminé avec succès");
			logSuccess("health_check_passed", {
				batchId: currentBatchId,
				ffmpegInstalled: true,
				dbConnected: true,
				pendingVideos: count,
			});
			return;
		} catch (dbError) {
			console.error(
				"❌ Connexion DB échouée:",
				dbError instanceof Error ? dbError.message : String(dbError),
			);
			logError("health_check_failed", {
				batchId: currentBatchId,
				ffmpegInstalled: true,
				dbConnected: false,
				error: String(dbError),
			});
			process.exit(1);
		}
	}

	// Nettoyer le dossier temporaire s'il existe (reste d'une exécution précédente)
	if (existsSync(TEMP_DIR)) {
		try {
			await rm(TEMP_DIR, { recursive: true });
			console.log("✅ Ancien dossier temporaire nettoyé");
		} catch (cleanupError) {
			logWarning("temp_dir_cleanup_failed", { error: String(cleanupError), path: TEMP_DIR });
		}
	}

	// Créer le dossier temporaire
	await mkdir(TEMP_DIR, { recursive: true });

	// Verifier espace disque disponible
	const hasEnoughSpace = await checkDiskSpace();
	if (!hasEnoughSpace) {
		logWarning("low_disk_space", { path: TEMP_DIR, minRequired: "1GB" });
		console.log("⚠️  Espace disque faible (<1GB) - le script pourrait echouer");
	}

	try {
		// Récupérer les vidéos sans miniature
		console.log("\nRecherche des vidéos sans miniature...");
		const videosWithoutThumbnail = await prisma.skuMedia.findMany({
			where: {
				mediaType: "VIDEO",
				thumbnailUrl: null,
			},
			select: {
				id: true,
				url: true,
				skuId: true,
			},
		});

		if (videosWithoutThumbnail.length === 0) {
			console.log("✅ Aucune vidéo sans miniature trouvée. Rien à faire.");
			return;
		}

		console.log(`📹 ${videosWithoutThumbnail.length} vidéo(s) à traiter`);

		// Traiter les vidéos en parallèle par batch
		const results = await processVideosInBatches(videosWithoutThumbnail, PARALLEL_COUNT);

		// Calculer les statistiques
		const successCount = results.filter((r) => r.success).length;
		const errorCount = results.filter((r) => !r.success).length;
		const errors = results.filter((r) => !r.success);

		// Résumé
		console.log("\n" + "=".repeat(50));
		console.log("📊 Résumé:");
		console.log(`  ✅ Succès: ${successCount}`);
		console.log(`  ❌ Erreurs: ${errorCount}`);
		console.log(`  📹 Total: ${videosWithoutThumbnail.length}`);

		// Log structuré du résumé (Sentry-ready)
		logSuccess("batch_completed", {
			batchId: currentBatchId,
			successCount,
			errorCount,
			totalProcessed: videosWithoutThumbnail.length,
			dryRun: DRY_RUN,
			parallelCount: PARALLEL_COUNT,
			errors: errors.map((e) => ({ id: e.id, error: e.error })),
		});

		if (errors.length > 0) {
			console.log("\n📋 Erreurs détaillées:");
			for (const error of errors) {
				console.log(`  - ${error.id}: ${error.error}`);
				// Log structuré par erreur
				logError("video_processing_failed", {
					batchId: currentBatchId,
					mediaId: error.id,
					error: error.error,
				});
			}
		}

		if (DRY_RUN) {
			console.log("\n⚠️  Mode DRY-RUN - relancez sans --dry-run pour appliquer les changements");
		}
	} finally {
		// Nettoyer le dossier temporaire
		try {
			if (existsSync(TEMP_DIR)) {
				await rm(TEMP_DIR, { recursive: true });
			}
		} catch (cleanupError) {
			logWarning("final_cleanup_failed", { error: String(cleanupError), path: TEMP_DIR });
		}
	}
}

main()
	.catch((error) => {
		console.error("❌ Erreur fatale:", error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
