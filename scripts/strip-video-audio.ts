/**
 * Script pour supprimer la piste audio des vidéos existantes
 *
 * Ce script traite toutes les vidéos SkuMedia et supprime leur piste audio
 * pour optimiser la taille des fichiers et garantir une expérience muette.
 *
 * Etapes:
 * 1. Récupère les SkuMedia de type VIDEO
 * 2. Télécharge chaque vidéo temporairement
 * 3. Supprime la piste audio avec FFmpeg (-an)
 * 4. Upload la nouvelle vidéo sur UploadThing
 * 5. Met à jour l'URL dans la base de données
 * 6. Supprime l'ancienne vidéo d'UploadThing
 *
 * Variables d'environnement requises:
 * - DATABASE_URL: Connection string PostgreSQL
 * - UPLOADTHING_TOKEN: Token API UploadThing
 *
 * Usage:
 *   pnpm strip:video-audio                 # Traiter toutes les vidéos
 *   pnpm strip:video-audio --dry-run       # Simuler sans modification
 *   pnpm strip:video-audio --parallel=3    # Parallélisation (défaut: 3)
 *   pnpm strip:video-audio --check         # Health check uniquement
 *   pnpm strip:video-audio --json          # Logs JSON pour monitoring
 *
 * @see modules/media/services/generate-video-thumbnail.ts
 */

import { execFile, execSync, type ChildProcess } from "node:child_process";
import { createWriteStream, existsSync, statSync } from "node:fs";
import { mkdir, readFile, rm, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";
import { UTApi } from "uploadthing/server";
import { VIDEO_MIGRATION_CONFIG } from "../modules/media/constants/thumbnail.constants";
import { isValidCuid, isValidUploadThingUrl } from "../modules/media/utils/validate-media-file";
import type { MediaItem, ProcessResult } from "../modules/media/types/script.types";
import { requireScriptEnvVars } from "../shared/utils/script-env";
import { delay, withRetry, createScriptLogger, processInBatches } from "./lib/script-utils";

// ============================================================================
// FFMPEG PATH RESOLUTION
// ============================================================================

function findFFmpegPath(): string | null {
	try {
		const systemPath = execSync("which ffmpeg", { encoding: "utf-8" }).trim();
		if (systemPath && existsSync(systemPath)) {
			return systemPath;
		}
	} catch {
		// which ffmpeg a échoué
	}

	const commonPaths = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"];

	for (const path of commonPaths) {
		if (existsSync(path)) {
			return path;
		}
	}

	return null;
}

const FFMPEG_PATH = findFFmpegPath();

// ============================================================================
// CONFIGURATION
// ============================================================================

const SCRIPT_NAME = "strip-video-audio";
const env = requireScriptEnvVars(["DATABASE_URL", "UPLOADTHING_TOKEN"] as const, SCRIPT_NAME);

const DOWNLOAD_TIMEOUT = VIDEO_MIGRATION_CONFIG.downloadTimeout;
const FFMPEG_TIMEOUT = 120_000; // 2 minutes pour le re-encoding
const MAX_VIDEO_SIZE = VIDEO_MIGRATION_CONFIG.maxVideoSize;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1000;

const TEMP_DIR = join(tmpdir(), `synclune-strip-audio-${process.pid}`);

// CLI Arguments
const DRY_RUN = process.argv.includes("--dry-run");
const PARALLEL_ARG = process.argv.find((arg) => arg.startsWith("--parallel="));
const rawParallel = PARALLEL_ARG?.split("=")[1];
const parsedParallel = rawParallel ? parseInt(rawParallel, 10) : NaN;
const PARALLEL_COUNT = !isNaN(parsedParallel) && parsedParallel > 0 ? parsedParallel : 3;
const JSON_LOGS = process.argv.includes("--json");
const CHECK_ONLY = process.argv.includes("--check");

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

let shuttingDown = false;

process.on("SIGTERM", () => {
	console.log("\n⚠️  SIGTERM reçu - arrêt en cours...");
	shuttingDown = true;
});

process.on("SIGINT", () => {
	console.log("\n⚠️  SIGINT reçu - arrêt en cours...");
	shuttingDown = true;
});

// ============================================================================
// LOGGING
// ============================================================================

const {
	logSuccess,
	logWarn: logWarning,
	logError,
} = createScriptLogger({
	jsonEnabled: JSON_LOGS,
});

// Prisma & UploadThing
const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const utapi = new UTApi();

// ============================================================================
// HELPERS
// ============================================================================

const RETRY_OPTIONS = {
	maxRetries: MAX_RETRIES,
	baseDelay: RETRY_BASE_DELAY,
	onRetry: (attempt: number, maxRetries: number, waitTime: number) => {
		console.log(`    Retry ${attempt}/${maxRetries} dans ${waitTime}ms...`);
	},
};

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

async function checkFFmpegInstalled(): Promise<boolean> {
	if (!FFMPEG_PATH) return false;
	try {
		await execFileWithTimeout(FFMPEG_PATH, ["-version"], 5000);
		return true;
	} catch {
		return false;
	}
}

/**
 * Vérifie si une vidéo a une piste audio avec FFprobe
 */
async function hasAudioTrack(videoPath: string): Promise<boolean> {
	if (!FFMPEG_PATH) return true; // Assume audio si pas de FFmpeg

	const ffprobePath = FFMPEG_PATH.replace(/ffmpeg$/, "ffprobe");
	if (!existsSync(ffprobePath)) {
		// Fallback: assume qu'il y a de l'audio
		return true;
	}

	try {
		const { stdout } = await execFileWithTimeout(
			ffprobePath,
			[
				"-v",
				"error",
				"-select_streams",
				"a",
				"-show_entries",
				"stream=codec_type",
				"-of",
				"csv=p=0",
				videoPath,
			],
			10000,
		);
		return stdout.trim().includes("audio");
	} catch {
		// En cas d'erreur, on assume qu'il y a de l'audio
		return true;
	}
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
	if (!isValidUploadThingUrl(url)) {
		throw new Error(`URL non autorisée: le domaine doit être UploadThing`);
	}

	const timeoutSignal = AbortSignal.timeout(DOWNLOAD_TIMEOUT);

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
			`Vidéo trop volumineuse: ${Math.round(parseInt(contentLength, 10) / 1024 / 1024)}MB`,
		);
	}

	const response = await fetch(url, { signal: timeoutSignal });
	if (!response.ok) {
		throw new Error(`Échec du téléchargement: ${response.status}`);
	}

	if (!response.body) {
		throw new Error("Pas de body dans la réponse");
	}

	const writeStream = createWriteStream(outputPath);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const readable = Readable.fromWeb(response.body as any);
	await pipeline(readable, writeStream);

	const stats = await stat(outputPath);
	if (stats.size > MAX_VIDEO_SIZE) {
		await unlink(outputPath);
		throw new Error(`Vidéo trop volumineuse après téléchargement`);
	}
}

/**
 * Supprime la piste audio d'une vidéo avec FFmpeg
 * Utilise -c:v copy pour éviter le re-encoding vidéo (rapide)
 */
async function stripAudio(inputPath: string, outputPath: string): Promise<void> {
	if (!FFMPEG_PATH) {
		throw new Error("FFmpeg n'est pas disponible");
	}

	const args = [
		"-y", // Écraser si existant
		"-i",
		inputPath, // Fichier d'entrée
		"-c:v",
		"copy", // Copier le flux vidéo sans re-encoding
		"-an", // Supprimer la piste audio
		"-movflags",
		"+faststart", // Optimiser pour streaming progressif (moov atom au début)
		outputPath, // Fichier de sortie
	];

	await execFileWithTimeout(FFMPEG_PATH, args, FFMPEG_TIMEOUT);

	if (!existsSync(outputPath)) {
		throw new Error("La vidéo sans audio n'a pas été créée");
	}

	const stats = statSync(outputPath);
	if (stats.size === 0) {
		throw new Error("La vidéo sans audio est vide (0 octets)");
	}
}

/**
 * Upload une vidéo sur UploadThing
 */
async function uploadVideo(filePath: string, mediaId: string): Promise<string> {
	const fileBuffer = await readFile(filePath);
	const ext = extname(filePath) || ".mp4";
	const fileName = `video-${mediaId}${ext}`;
	const mimeType = "video/mp4";
	const file = new File([fileBuffer], fileName, { type: mimeType });

	const response = await utapi.uploadFiles([file]);

	if (!response[0]?.data?.ufsUrl) {
		throw new Error("Upload échoué: pas d'URL retournée");
	}

	return response[0].data.ufsUrl;
}

/**
 * Extrait le file key depuis une URL UploadThing
 */
function extractFileKey(url: string): string | null {
	// Format: https://utfs.io/f/FILE_KEY ou https://ufs.sh/f/FILE_KEY
	const match = url.match(/\/f\/([a-zA-Z0-9_-]+)/);
	return match ? match[1] : null;
}

/**
 * Traite une vidéo : télécharge, supprime audio, upload, met à jour DB
 */
async function processVideo(
	media: MediaItem,
	index: number,
	total: number,
): Promise<ProcessResult> {
	if (shuttingDown) {
		return { id: media.id, success: false, error: "Script interrompu" };
	}

	if (!isValidCuid(media.id)) {
		logError("invalid_media_id", { mediaId: media.id });
		return { id: media.id, success: false, error: "ID invalide" };
	}

	const ext = extname(new URL(media.url).pathname) || ".mp4";
	const inputPath = join(TEMP_DIR, `input-${media.id}${ext}`);
	const outputPath = join(TEMP_DIR, `output-${media.id}${ext}`);

	console.log(`\n[${index + 1}/${total}] Traitement de ${media.id}...`);
	console.log(`  URL: ${media.url.substring(0, 80)}...`);

	if (DRY_RUN) {
		console.log("  [DRY-RUN] Serait traité");
		return { id: media.id, success: true };
	}

	const startTotal = Date.now();

	try {
		// 1. Télécharger
		console.log("  Téléchargement...");
		await withRetry(() => downloadVideo(media.url, inputPath), RETRY_OPTIONS);

		// 2. Vérifier si la vidéo a de l'audio
		console.log("  Vérification audio...");
		const hasAudio = await hasAudioTrack(inputPath);
		if (!hasAudio) {
			console.log("  ✅ Pas de piste audio détectée - skip");
			return { id: media.id, success: true };
		}

		// 3. Supprimer l'audio
		console.log("  Suppression de la piste audio...");
		await stripAudio(inputPath, outputPath);

		// Comparer les tailles
		const inputStats = statSync(inputPath);
		const outputStats = statSync(outputPath);
		const savedBytes = inputStats.size - outputStats.size;
		const savedPercent = ((savedBytes / inputStats.size) * 100).toFixed(1);
		console.log(
			`  Taille: ${(inputStats.size / 1024 / 1024).toFixed(2)}MB → ${(outputStats.size / 1024 / 1024).toFixed(2)}MB (-${savedPercent}%)`,
		);

		// 4. Upload la nouvelle vidéo
		console.log("  Upload de la nouvelle vidéo...");
		const newUrl = await withRetry(() => uploadVideo(outputPath, media.id), RETRY_OPTIONS);
		console.log(`  Nouvelle URL: ${newUrl.substring(0, 50)}...`);

		// 5. Mettre à jour la DB
		console.log("  Mise à jour de la base de données...");
		await prisma.skuMedia.update({
			where: { id: media.id },
			data: { url: newUrl },
		});

		// 6. Supprimer l'ancienne vidéo d'UploadThing
		const oldFileKey = extractFileKey(media.url);
		if (oldFileKey) {
			console.log("  Suppression de l'ancienne vidéo...");
			try {
				await utapi.deleteFiles([oldFileKey]);
			} catch (deleteError) {
				logWarning("old_file_delete_failed", {
					mediaId: media.id,
					fileKey: oldFileKey,
					error: String(deleteError),
				});
			}
		}

		const totalMs = Date.now() - startTotal;
		console.log(`  ✅ Terminé en ${(totalMs / 1000).toFixed(1)}s`);

		logSuccess("video_audio_stripped", {
			mediaId: media.id,
			totalMs,
			savedBytes,
			savedPercent: parseFloat(savedPercent),
		});

		return { id: media.id, success: true };
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error(`  ❌ Erreur: ${errorMsg}`);
		logError("video_processing_failed", { mediaId: media.id, error: errorMsg });
		return { id: media.id, success: false, error: errorMsg };
	} finally {
		// Cleanup
		for (const file of [inputPath, outputPath]) {
			try {
				if (existsSync(file)) await unlink(file);
			} catch {
				// Ignorer
			}
		}
	}
}

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
	console.log("🔇 Script de suppression audio des vidéos");
	console.log("=".repeat(50));
	console.log(`Configuration:`);
	console.log(`  - Parallélisation: ${PARALLEL_COUNT} vidéos simultanées`);
	console.log(`  - Taille max vidéo: ${MAX_VIDEO_SIZE / 1024 / 1024}MB`);
	console.log(`  - Dossier temp: ${TEMP_DIR}`);

	if (DRY_RUN) {
		console.log("\n⚠️  Mode DRY-RUN activé - aucune modification");
	}

	// Vérifier FFmpeg
	console.log("\nVérification de FFmpeg...");
	const ffmpegInstalled = await checkFFmpegInstalled();
	if (!ffmpegInstalled) {
		console.error("❌ FFmpeg n'est pas disponible!");
		console.error("  macOS:  brew install ffmpeg");
		console.error("  Ubuntu: sudo apt install ffmpeg");
		process.exit(1);
	}
	console.log(`✅ FFmpeg disponible`);

	// Mode CHECK
	if (CHECK_ONLY) {
		console.log("\nVérification de la connexion base de données...");
		try {
			const count = await prisma.skuMedia.count({
				where: { mediaType: "VIDEO" },
			});
			console.log(`✅ Connexion DB OK - ${count} vidéo(s) en base`);
			console.log("\n✅ Health check terminé avec succès");
			return;
		} catch (dbError) {
			console.error("❌ Connexion DB échouée:", String(dbError));
			process.exit(1);
		}
	}

	// Créer le dossier temporaire
	if (existsSync(TEMP_DIR)) {
		await rm(TEMP_DIR, { recursive: true });
	}
	await mkdir(TEMP_DIR, { recursive: true });

	try {
		// Récupérer toutes les vidéos
		console.log("\nRecherche des vidéos...");
		const videos = await prisma.skuMedia.findMany({
			where: { mediaType: "VIDEO" },
			select: { id: true, url: true, skuId: true },
		});

		if (videos.length === 0) {
			console.log("✅ Aucune vidéo trouvée. Rien à faire.");
			return;
		}

		console.log(`📹 ${videos.length} vidéo(s) à traiter`);

		// Traiter
		const results = await processVideosInBatches(videos, PARALLEL_COUNT);

		// Résumé
		const successCount = results.filter((r) => r.success).length;
		const errorCount = results.filter((r) => !r.success).length;
		const errors = results.filter((r) => !r.success);

		console.log("\n" + "=".repeat(50));
		console.log("📊 Résumé:");
		console.log(`  ✅ Succès: ${successCount}`);
		console.log(`  ❌ Erreurs: ${errorCount}`);
		console.log(`  📹 Total: ${videos.length}`);

		if (errors.length > 0) {
			console.log("\n📋 Erreurs détaillées:");
			for (const error of errors) {
				console.log(`  - ${error.id}: ${error.error}`);
			}
		}

		if (DRY_RUN) {
			console.log("\n⚠️  Mode DRY-RUN - relancez sans --dry-run pour appliquer");
		}
	} finally {
		try {
			if (existsSync(TEMP_DIR)) {
				await rm(TEMP_DIR, { recursive: true });
			}
		} catch {
			// Ignorer
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
