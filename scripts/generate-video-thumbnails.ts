/**
 * Script de migration pour generer les miniatures des videos existantes
 *
 * Ce script genere deux tailles de thumbnails (SMALL 160px, MEDIUM 480px) pour
 * toutes les videos SkuMedia qui n'ont pas encore de thumbnailSmallUrl.
 *
 * Etapes:
 * 1. Recupere les SkuMedia de type VIDEO sans thumbnailSmallUrl
 * 2. Telecharge chaque video temporairement (streaming)
 * 3. Valide le format video avec FFprobe
 * 4. Extrait une frame a 10% de la duree (max 1s) avec FFmpeg
 * 5. Genere 2 thumbnails WebP (small + medium)
 * 6. Upload sur UploadThing et met a jour la base de donnees
 *
 * ============================================================================
 * PREREQUIS: FFmpeg doit etre installe sur le systeme
 * ============================================================================
 *
 * Installation FFmpeg:
 *
 *   macOS (Homebrew):
 *     brew install ffmpeg
 *
 *   Ubuntu/Debian:
 *     sudo apt update && sudo apt install ffmpeg
 *
 *   Windows (Chocolatey):
 *     choco install ffmpeg
 *
 *   Windows (winget):
 *     winget install FFmpeg
 *
 *   Docker (si execution dans container):
 *     RUN apt-get update && apt-get install -y ffmpeg
 *
 * Verification:
 *   ffmpeg -version
 *
 * ============================================================================
 * Variables d'environnement requises:
 * - DATABASE_URL: Connection string PostgreSQL
 * - UPLOADTHING_TOKEN: Token API UploadThing
 * ============================================================================
 *
 * Usage:
 *   pnpm generate:video-thumbnails                 # Traiter toutes les videos
 *   pnpm generate:video-thumbnails --dry-run      # Simuler sans modification
 *   pnpm generate:video-thumbnails --parallel=3   # Parallelisation (defaut: 5)
 *
 * @see modules/media/hooks/use-auto-video-thumbnail.ts pour la generation cote client
 */

import { exec } from "child_process";
import { createWriteStream, existsSync, mkdirSync, rmSync, unlinkSync, readFileSync, statSync } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { join } from "path";
import { promisify } from "util";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";
import { UTApi } from "uploadthing/server";
import {
	THUMBNAIL_CONFIG,
	VIDEO_MIGRATION_CONFIG,
} from "../modules/media/constants/media.constants";
import {
	isValidCuid,
	isValidUploadThingUrl,
} from "../modules/media/utils/validate-media-file";

/**
 * Helper pour valider les variables d'environnement requises par le script
 * (ne charge pas le module env.ts qui valide TOUTES les variables Next.js)
 */
function getScriptEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Variable d'environnement manquante: ${key}. Vérifiez votre fichier .env`);
	}
	return value;
}

const execAsync = promisify(exec);

// ============================================================================
// CONFIGURATION
// ============================================================================

// Tailles des thumbnails (centralisées depuis THUMBNAIL_CONFIG)
const THUMBNAIL_SIZES = {
	small: THUMBNAIL_CONFIG.SMALL.width,
	medium: THUMBNAIL_CONFIG.MEDIUM.width,
} as const;

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
const TEMP_DIR = join(process.cwd(), `.tmp-thumbnails-${process.pid}`);

// Arguments CLI
const DRY_RUN = process.argv.includes("--dry-run");
const PARALLEL_ARG = process.argv.find((arg) => arg.startsWith("--parallel="));
const PARALLEL_COUNT = PARALLEL_ARG ? parseInt(PARALLEL_ARG.split("=")[1], 10) : 5;
const JSON_LOGS = process.argv.includes("--json");

// ============================================================================
// LOGS STRUCTURÉS (Sentry-ready)
// ============================================================================

interface StructuredLog {
	timestamp: string;
	level: "info" | "warn" | "error";
	event: string;
	data?: Record<string, unknown>;
}

function logStructured(log: StructuredLog): void {
	if (JSON_LOGS) {
		console.log(JSON.stringify(log));
	}
}

function logSuccess(event: string, data?: Record<string, unknown>): void {
	logStructured({
		timestamp: new Date().toISOString(),
		level: "info",
		event,
		data,
	});
}

function logWarning(event: string, data?: Record<string, unknown>): void {
	logStructured({
		timestamp: new Date().toISOString(),
		level: "warn",
		event,
		data,
	});
	// Aussi afficher en console pour visibilité
	if (!JSON_LOGS && data) {
		console.warn(`    [WARN] ${event}:`, JSON.stringify(data));
	}
}

function logError(event: string, data?: Record<string, unknown>): void {
	logStructured({
		timestamp: new Date().toISOString(),
		level: "error",
		event,
		data,
	});
}

// Initialisation Prisma avec validation env
const databaseUrl = getScriptEnv("DATABASE_URL");
const adapter = new PrismaNeon({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

// Initialisation UTApi (UPLOADTHING_TOKEN est validé par le module)
const utapi = new UTApi();

// ============================================================================
// TYPES
// ============================================================================

interface VideoMedia {
	id: string;
	url: string;
	skuId: string;
}

interface ProcessResult {
	id: string;
	success: boolean;
	error?: string;
}

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
 * Attendre un délai avec backoff exponentiel
 */
function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exécuter une fonction avec retry et backoff exponentiel
 */
async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries: number = MAX_RETRIES,
	baseDelay: number = RETRY_BASE_DELAY
): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (attempt < maxRetries - 1) {
				const waitTime = baseDelay * Math.pow(2, attempt);
				console.log(`    Retry ${attempt + 1}/${maxRetries - 1} dans ${waitTime}ms...`);
				await delay(waitTime);
			}
		}
	}

	throw lastError;
}

/**
 * Exécuter une commande avec timeout
 */
async function execWithTimeout(
	command: string,
	timeout: number
): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const child = exec(command, (error, stdout, stderr) => {
			if (error) {
				reject(error);
			} else {
				resolve({ stdout, stderr });
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
 * Vérifie que FFmpeg est installé
 */
async function checkFFmpegInstalled(): Promise<boolean> {
	try {
		await execAsync("ffmpeg -version");
		return true;
	} catch {
		return false;
	}
}

/**
 * Construit une commande FFmpeg pour l'extraction de frame
 */
function buildFFmpegCommand(options: FFmpegOptions): string {
	const { inputPath, outputPath, timeInSeconds, width, quality, format } = options;

	const baseArgs = [
		"ffmpeg",
		"-y", // Écraser le fichier si existant
		"-ss", timeInSeconds.toString(), // Position temporelle
		`-i "${inputPath}"`, // Fichier d'entrée (quoted pour sécurité)
		"-vframes 1", // Une seule frame
		`-vf "scale=${width}:-1"`, // Redimensionner en gardant le ratio
	];

	if (format === "webp") {
		baseArgs.push("-c:v libwebp", `-quality ${quality}`);
	} else {
		baseArgs.push("-q:v 2"); // Qualité JPEG
	}

	baseArgs.push(`"${outputPath}"`);

	return baseArgs.join(" ");
}

/**
 * Télécharge une vidéo depuis une URL avec streaming (économie mémoire)
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
	// Validation de l'URL avant téléchargement
	if (!isValidUploadThingUrl(url)) {
		throw new Error(`URL non autorisée: le domaine doit être UploadThing (${url.substring(0, 50)}...)`);
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);

	try {
		// D'abord, vérifier la taille avec HEAD request
		const headResponse = await fetch(url, {
			method: "HEAD",
			signal: controller.signal,
		});

		if (!headResponse.ok) {
			throw new Error(`HEAD request échouée: ${headResponse.status}`);
		}

		const contentLength = headResponse.headers.get("content-length");
		if (contentLength && parseInt(contentLength, 10) > MAX_VIDEO_SIZE) {
			throw new Error(
				`Vidéo trop volumineuse: ${Math.round(parseInt(contentLength, 10) / 1024 / 1024)}MB (max: ${MAX_VIDEO_SIZE / 1024 / 1024}MB)`
			);
		}

		// Télécharger le fichier avec streaming
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			throw new Error(`Échec du téléchargement: ${response.status} ${response.statusText}`);
		}

		if (!response.body) {
			throw new Error("Pas de body dans la réponse");
		}

		// Streaming vers le fichier (économie mémoire)
		const writeStream = createWriteStream(outputPath);
		const readable = Readable.fromWeb(response.body as never);
		await pipeline(readable, writeStream);

		// Vérifier la taille après téléchargement
		const stats = statSync(outputPath);
		if (stats.size > MAX_VIDEO_SIZE) {
			unlinkSync(outputPath);
			throw new Error(
				`Vidéo trop volumineuse: ${Math.round(stats.size / 1024 / 1024)}MB (max: ${MAX_VIDEO_SIZE / 1024 / 1024}MB)`
			);
		}
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Valide qu'un fichier est une vidéo valide avec FFprobe
 */
async function validateVideoFormat(videoPath: string): Promise<boolean> {
	const command = `ffprobe -v error -select_streams v:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;

	try {
		const { stdout } = await execWithTimeout(command, 10000);
		return stdout.trim() === "video";
	} catch {
		return false;
	}
}

/**
 * Obtient la durée d'une vidéo avec FFprobe
 * Ajoute un warning si durée > MAX_VIDEO_DURATION
 */
async function getVideoDuration(videoPath: string, mediaId?: string): Promise<number> {
	const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;

	try {
		const { stdout } = await execWithTimeout(command, 10000);
		const duration = parseFloat(stdout.trim());
		if (isNaN(duration) || duration <= 0) {
			console.log("    Durée non détectée, utilisation de 1s par défaut");
			return 10; // Fallback pour calculer 10% = 1s
		}

		// Avertissement si vidéo trop longue
		if (duration > MAX_VIDEO_DURATION) {
			const durationMin = Math.floor(duration / 60);
			const durationSec = Math.round(duration % 60);
			console.log(`    ⚠️  Vidéo longue: ${durationMin}m${durationSec}s (recommandé: <${MAX_VIDEO_DURATION / 60}min pour les produits)`);
			logWarning("video_duration_warning", {
				mediaId,
				duration,
				maxRecommended: MAX_VIDEO_DURATION,
				durationFormatted: `${durationMin}m${durationSec}s`,
			});
		}

		return duration;
	} catch {
		console.log("    FFprobe échoué, utilisation de 1s par défaut");
		return 10; // Fallback
	}
}

/**
 * Extrait une frame d'une vidéo avec FFmpeg à une taille spécifique
 */
async function extractFrameAtSize(
	videoPath: string,
	outputPath: string,
	timeInSeconds: number,
	width: number,
	quality: number
): Promise<void> {
	// Commande WebP
	const webpCommand = buildFFmpegCommand({
		inputPath: videoPath,
		outputPath,
		timeInSeconds,
		width,
		quality,
		format: "webp",
	});

	try {
		await execWithTimeout(webpCommand, FFMPEG_TIMEOUT);
	} catch {
		console.log(`    WebP échoué pour ${width}px, fallback vers JPEG...`);
		// Si WebP échoue, essayer avec JPEG
		const jpegOutputPath = outputPath.replace(".webp", ".jpg");
		const jpegCommand = buildFFmpegCommand({
			inputPath: videoPath,
			outputPath: jpegOutputPath,
			timeInSeconds,
			width,
			quality: 2, // Qualité JPEG
			format: "jpeg",
		});

		await execWithTimeout(jpegCommand, FFMPEG_TIMEOUT);

		// Renommer en .webp pour la cohérence
		const { renameSync } = await import("fs");
		renameSync(jpegOutputPath, outputPath);
	}

	// Valider que le fichier a été créé et n'est pas vide
	if (!existsSync(outputPath)) {
		throw new Error(`La miniature ${width}px n'a pas été créée`);
	}

	const stats = statSync(outputPath);
	if (stats.size === 0) {
		throw new Error(`La miniature ${width}px est vide (0 octets)`);
	}
}

/**
 * Extrait les deux tailles de thumbnails (small et medium)
 */
async function extractFrames(
	videoPath: string,
	smallOutputPath: string,
	mediumOutputPath: string,
	timeInSeconds: number
): Promise<void> {
	// Générer les deux tailles en parallèle
	await Promise.all([
		extractFrameAtSize(videoPath, smallOutputPath, timeInSeconds, THUMBNAIL_SIZES.small, 80),
		extractFrameAtSize(videoPath, mediumOutputPath, timeInSeconds, THUMBNAIL_SIZES.medium, 85),
	]);
}

/**
 * Génère un blur data URL (base64) depuis une image thumbnail
 * Redimensionne l'image à 10x10 pour un placeholder très léger
 */
async function generateBlurDataUrl(thumbnailPath: string): Promise<string | null> {
	try {
		// Générer une version 10x10 de la thumbnail small
		const blurPath = thumbnailPath.replace(".webp", "-blur.webp");
		const command = buildFFmpegCommand({
			inputPath: thumbnailPath,
			outputPath: blurPath,
			timeInSeconds: 0,
			width: 10,
			quality: 50,
			format: "webp",
		}).replace("-ss 0", "").replace("-vframes 1", ""); // Pas besoin pour une image

		// Commande simplifiée pour image
		const imageCommand = `ffmpeg -y -i "${thumbnailPath}" -vf "scale=10:10" -c:v libwebp -quality 50 "${blurPath}"`;

		await execWithTimeout(imageCommand, 5000);

		if (!existsSync(blurPath)) {
			return null;
		}

		const blurBuffer = readFileSync(blurPath);
		const base64 = blurBuffer.toString("base64");
		const blurDataUrl = `data:image/webp;base64,${base64}`;

		// Nettoyer le fichier blur temporaire
		try {
			unlinkSync(blurPath);
		} catch (cleanupError) {
			logWarning("blur_cleanup_failed", { error: String(cleanupError), path: blurPath });
		}

		return blurDataUrl;
	} catch (error) {
		console.log(`    Blur generation échouée: ${error instanceof Error ? error.message : String(error)}`);
		return null;
	}
}

/**
 * Upload une miniature sur UploadThing
 */
async function uploadThumbnail(filePath: string, mediaId: string): Promise<string> {
	const fileBuffer = readFileSync(filePath);
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
async function processVideo(media: VideoMedia, index: number, total: number): Promise<ProcessResult> {
	// Validation CUID de l'ID avant utilisation dans les chemins de fichiers
	if (!isValidCuid(media.id)) {
		const errorMsg = `ID invalide (doit être un CUID): ${media.id}`;
		console.error(`  ❌ ${errorMsg}`);
		logError("invalid_media_id", { mediaId: media.id, reason: "not_a_cuid" });
		return { id: media.id, success: false, error: errorMsg };
	}

	const videoPath = join(TEMP_DIR, `video-${media.id}.mp4`);
	const smallThumbnailPath = join(TEMP_DIR, `thumbnail-small-${media.id}.webp`);
	const mediumThumbnailPath = join(TEMP_DIR, `thumbnail-medium-${media.id}.webp`);

	console.log(`\n[${index + 1}/${total}] Traitement de ${media.id}...`);
	console.log(`  URL: ${media.url.substring(0, 80)}...`);

	if (DRY_RUN) {
		console.log("  [DRY-RUN] Serait traité");
		return { id: media.id, success: true };
	}

	try {
		// 1. Télécharger la vidéo avec retry (streaming)
		console.log("  Téléchargement de la vidéo (streaming)...");
		await withRetry(() => downloadVideo(media.url, videoPath));

		// 2. Valider que c'est bien une vidéo
		console.log("  Validation du format vidéo...");
		const isValidVideo = await validateVideoFormat(videoPath);
		if (!isValidVideo) {
			throw new Error("Le fichier téléchargé n'est pas une vidéo valide");
		}

		// 3. Obtenir la durée et calculer la position de capture
		const duration = await getVideoDuration(videoPath, media.id);
		const captureTime = Math.min(MAX_CAPTURE_TIME, duration * CAPTURE_POSITION);
		console.log(`  Durée: ${duration.toFixed(1)}s, capture à ${captureTime.toFixed(2)}s`);

		// 4. Extraire les deux tailles de miniatures
		console.log("  Extraction des miniatures (small + medium)...");
		await extractFrames(videoPath, smallThumbnailPath, mediumThumbnailPath, captureTime);

		// 5. Générer le blur placeholder depuis la thumbnail small
		console.log("  Génération du blur placeholder...");
		const blurDataUrl = await generateBlurDataUrl(smallThumbnailPath);
		if (blurDataUrl) {
			console.log(`  Blur: ${blurDataUrl.length} caractères base64`);
		} else {
			console.log("  Blur: non généré (optionnel)");
		}

		// 6. Upload les deux miniatures sur UploadThing
		console.log("  Upload des miniatures...");
		const [thumbnailSmallUrl, thumbnailUrl] = await Promise.all([
			withRetry(() => uploadThumbnail(smallThumbnailPath, `${media.id}-small`)),
			withRetry(() => uploadThumbnail(mediumThumbnailPath, `${media.id}-medium`)),
		]);
		console.log(`  Small: ${thumbnailSmallUrl.substring(0, 50)}...`);
		console.log(`  Medium: ${thumbnailUrl.substring(0, 50)}...`);

		// 7. Mettre à jour la base de données avec les URLs et le blur
		console.log("  Mise à jour de la base de données...");
		await prisma.skuMedia.update({
			where: { id: media.id },
			data: {
				thumbnailUrl,
				thumbnailSmallUrl,
				...(blurDataUrl && { blurDataUrl }),
			},
		});

		console.log("  ✅ Traitement terminé");
		return { id: media.id, success: true };
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error(`  ❌ Erreur: ${errorMsg}`);
		return { id: media.id, success: false, error: errorMsg };
	} finally {
		// Nettoyer les fichiers temporaires
		const filesToClean = [videoPath, smallThumbnailPath, mediumThumbnailPath];
		for (const file of filesToClean) {
			try {
				if (existsSync(file)) unlinkSync(file);
			} catch (cleanupError) {
				logWarning("file_cleanup_failed", { error: String(cleanupError), path: file });
			}
		}
	}
}

/**
 * Traite les vidéos par batch avec parallélisation
 */
async function processVideosInBatches(
	videos: VideoMedia[],
	batchSize: number
): Promise<ProcessResult[]> {
	const results: ProcessResult[] = [];

	for (let i = 0; i < videos.length; i += batchSize) {
		const batch = videos.slice(i, i + batchSize);
		console.log(`\n${"─".repeat(50)}`);
		console.log(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(videos.length / batchSize)} (${batch.length} vidéos)`);

		const batchResults = await Promise.all(
			batch.map((video, batchIndex) =>
				processVideo(video, i + batchIndex, videos.length)
			)
		);

		results.push(...batchResults);

		// Petite pause entre les batches pour éviter de surcharger
		if (i + batchSize < videos.length) {
			await delay(1000);
		}
	}

	return results;
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
	console.log("🎬 Script de génération de miniatures vidéo");
	console.log("=".repeat(50));
	console.log(`Configuration:`);
	console.log(`  - Parallélisation: ${PARALLEL_COUNT} vidéos simultanées`);
	console.log(`  - Taille max vidéo: ${MAX_VIDEO_SIZE / 1024 / 1024}MB`);
	console.log(`  - Timeout téléchargement: ${DOWNLOAD_TIMEOUT / 1000}s`);
	console.log(`  - Timeout FFmpeg: ${FFMPEG_TIMEOUT / 1000}s`);
	console.log(`  - Retries: ${MAX_RETRIES}`);
	console.log(`  - Dossier temp: ${TEMP_DIR}`);

	if (DRY_RUN) {
		console.log("\n⚠️  Mode DRY-RUN activé - aucune modification ne sera effectuée");
	}

	// Verifier FFmpeg
	console.log("\nVerification de FFmpeg...");
	const ffmpegInstalled = await checkFFmpegInstalled();
	if (!ffmpegInstalled) {
		console.error("❌ FFmpeg n'est pas installe!");
		console.error("");
		console.error("Installation:");
		console.error("  macOS:        brew install ffmpeg");
		console.error("  Ubuntu:       sudo apt install ffmpeg");
		console.error("  Windows:      choco install ffmpeg");
		console.error("");
		console.error("Verification:   ffmpeg -version");
		process.exit(1);
	}
	console.log("✅ FFmpeg est installe");

	// Nettoyer le dossier temporaire s'il existe (reste d'une exécution précédente)
	if (existsSync(TEMP_DIR)) {
		try {
			rmSync(TEMP_DIR, { recursive: true });
			console.log("✅ Ancien dossier temporaire nettoyé");
		} catch (cleanupError) {
			logWarning("temp_dir_cleanup_failed", { error: String(cleanupError), path: TEMP_DIR });
		}
	}

	// Créer le dossier temporaire
	mkdirSync(TEMP_DIR, { recursive: true });

	try {
		// Récupérer les vidéos sans miniature small (nouveau système à 2 tailles)
		console.log("\nRecherche des vidéos sans miniature small...");
		const videosWithoutThumbnail = await prisma.skuMedia.findMany({
			where: {
				mediaType: "VIDEO",
				// Chercher les vidéos sans thumbnailSmallUrl (nouveau champ)
				// Cela inclut les vidéos qui ont un ancien thumbnailUrl mais pas le nouveau format
				thumbnailSmallUrl: null,
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
				rmSync(TEMP_DIR, { recursive: true });
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
