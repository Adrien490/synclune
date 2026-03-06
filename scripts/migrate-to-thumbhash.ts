/**
 * Script de migration vers ThumbHash
 *
 * Migre toutes les images vers le format ThumbHash (standard 2025):
 * 1. Images sans blurDataUrl -> génère ThumbHash
 * 2. Images avec ancien format (plaiceholder/SVG) -> régénère en ThumbHash
 *
 * Avantages ThumbHash:
 * - ~25 bytes vs ~200-300 bytes (plaiceholder)
 * - Support transparence (alpha)
 * - Encode l'aspect ratio
 * - Meilleure fidélité des couleurs
 *
 * ============================================================================
 * Variables d'environnement requises:
 * - DATABASE_URL: Connection string PostgreSQL
 * ============================================================================
 *
 * Usage :
 * pnpm exec tsx scripts/migrate-to-thumbhash.ts
 * pnpm exec tsx scripts/migrate-to-thumbhash.ts --dry-run         # Simulation
 * pnpm exec tsx scripts/migrate-to-thumbhash.ts --parallel=10     # 10 images en parallèle
 * pnpm exec tsx scripts/migrate-to-thumbhash.ts --force           # Régénère TOUS les blurs
 * pnpm exec tsx scripts/migrate-to-thumbhash.ts --allow-external  # Autorise Unsplash, etc.
 * pnpm exec tsx scripts/migrate-to-thumbhash.ts --json            # Logs JSON
 */

import { prisma } from "../shared/lib/prisma";
import { generateThumbHashWithRetry } from "../modules/media/services/generate-thumbhash";
import { THUMBHASH_CONFIG } from "../modules/media/constants/image-downloader.constants";
import { isValidUploadThingUrl } from "../modules/media/utils/validate-media-file";
import { delay } from "../shared/utils/delay";
import type {
	MediaItem,
	ProcessResult as BaseProcessResult,
	ProcessMetrics,
	StructuredLog,
} from "../modules/media/types/script.types";
import { requireScriptEnvVars } from "../shared/utils/script-env";

// ============================================================================
// VALIDATION ENVIRONNEMENT
// ============================================================================

const SCRIPT_NAME = "migrate-to-thumbhash";
requireScriptEnvVars(["DATABASE_URL"] as const, SCRIPT_NAME);

// ============================================================================
// ARGUMENTS CLI
// ============================================================================

const DRY_RUN = process.argv.includes("--dry-run");
const JSON_LOGS = process.argv.includes("--json");
const FORCE_ALL = process.argv.includes("--force");
const PARALLEL_ARG = process.argv.find((arg) => arg.startsWith("--parallel="));
const PARALLEL_COUNT = PARALLEL_ARG ? parseInt(PARALLEL_ARG.split("=")[1], 10) : 5;

// ============================================================================
// GESTION ARRÊT GRACIEUX
// ============================================================================

let isShuttingDown = false;

process.on("SIGTERM", () => {
	isShuttingDown = true;
	logWarn("SIGTERM reçu, arrêt gracieux...");
});

process.on("SIGINT", () => {
	isShuttingDown = true;
	logWarn("SIGINT reçu, arrêt gracieux...");
});

// ============================================================================
// LOGS STRUCTURÉS
// ============================================================================

function logStructured(log: StructuredLog): void {
	if (JSON_LOGS) {
		console.log(JSON.stringify(log));
	}
}

function logInfo(message: string, data?: Record<string, unknown>): void {
	if (JSON_LOGS) {
		logStructured({ timestamp: new Date().toISOString(), level: "info", event: message, data });
	} else {
		console.log(message);
	}
}

function logWarn(message: string, data?: Record<string, unknown>): void {
	if (JSON_LOGS) {
		logStructured({ timestamp: new Date().toISOString(), level: "warn", event: message, data });
	} else {
		console.warn(message);
	}
}

function logError(message: string, data?: Record<string, unknown>): void {
	if (JSON_LOGS) {
		logStructured({ timestamp: new Date().toISOString(), level: "error", event: message, data });
	} else {
		console.error(message);
	}
}

// ============================================================================
// TYPES
// ============================================================================

interface ThumbHashProcessResult extends BaseProcessResult {
	blurDataUrl?: string;
	previousFormat?: string;
}

interface MediaItemWithBlur extends MediaItem {
	blurDataUrl: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Detecte si un blur est déjà au format ThumbHash (PNG)
 */
function isThumbHash(blurDataUrl: string | null): boolean {
	if (!blurDataUrl) return false;
	return blurDataUrl.startsWith("data:image/png;base64,");
}

/**
 * Detecte le format d'un blur
 */
function detectFormat(blurDataUrl: string | null): string {
	if (!blurDataUrl) return "none";
	if (blurDataUrl.startsWith("data:image/png;base64,")) return "thumbhash";
	if (blurDataUrl.startsWith("data:image/jpeg;base64,")) return "plaiceholder-jpeg";
	if (blurDataUrl.startsWith("data:image/webp;base64,")) return "plaiceholder-webp";
	if (blurDataUrl.startsWith("data:image/svg+xml;base64,")) return "color-svg";
	return "unknown";
}

function createMetrics(overrides: Partial<ProcessMetrics> = {}): ProcessMetrics {
	return {
		totalMs: 0,
		downloadMs: 0,
		validationMs: 0,
		extractionMs: 0,
		blurMs: 0,
		uploadMs: 0,
		dbUpdateMs: 0,
		...overrides,
	};
}

/**
 * Traite une image et génère son ThumbHash
 */
async function processImage(
	image: MediaItemWithBlur,
	table: "SkuMedia" | "ReviewMedia",
): Promise<ThumbHashProcessResult> {
	const startTime = performance.now();
	const previousFormat = detectFormat(image.blurDataUrl);

	try {
		// Mesure génération ThumbHash (inclut téléchargement)
		const thumbhashStart = performance.now();
		const result = await generateThumbHashWithRetry(image.url);
		const blurMs = Math.round(performance.now() - thumbhashStart);

		// Mesure mise à jour DB
		let dbUpdateMs = 0;
		if (!DRY_RUN) {
			const dbStart = performance.now();
			if (table === "SkuMedia") {
				await prisma.skuMedia.update({
					where: { id: image.id },
					data: { blurDataUrl: result.dataUrl },
				});
			} else {
				await prisma.reviewMedia.update({
					where: { id: image.id },
					data: { blurDataUrl: result.dataUrl },
				});
			}
			dbUpdateMs = Math.round(performance.now() - dbStart);
		}

		return {
			id: image.id,
			success: true,
			blurDataUrl: result.dataUrl.substring(0, 50) + "...",
			previousFormat,
			metrics: createMetrics({
				blurMs,
				dbUpdateMs,
				totalMs: Math.round(performance.now() - startTime),
			}),
		};
	} catch (error) {
		return {
			id: image.id,
			success: false,
			error: error instanceof Error ? error.message : String(error),
			previousFormat,
			metrics: createMetrics({ totalMs: Math.round(performance.now() - startTime) }),
		};
	}
}

/**
 * Traite un batch d'images en parallèle
 */
async function processBatch(
	images: MediaItemWithBlur[],
	table: "SkuMedia" | "ReviewMedia",
): Promise<ThumbHashProcessResult[]> {
	return Promise.all(images.map((image) => processImage(image, table)));
}

/**
 * Migre une table vers ThumbHash
 */
async function migrateTable(
	table: "SkuMedia" | "ReviewMedia",
): Promise<{ success: number; error: number; skipped: number }> {
	logInfo(`\n📊 Migration ${table}...`);

	// Récupérer les images à migrer
	let images: MediaItemWithBlur[];

	if (table === "SkuMedia") {
		const allImages = await prisma.skuMedia.findMany({
			where: { mediaType: "IMAGE" },
			select: { id: true, url: true, skuId: true, blurDataUrl: true },
		});
		images = allImages.map((img) => ({ ...img, blurDataUrl: img.blurDataUrl }));
	} else {
		const allImages = await prisma.reviewMedia.findMany({
			select: { id: true, url: true, reviewId: true, blurDataUrl: true },
		});
		images = allImages.map((img) => ({
			id: img.id,
			url: img.url,
			skuId: img.reviewId,
			blurDataUrl: img.blurDataUrl,
		}));
	}

	// Filtrer selon les options
	let toProcess: MediaItemWithBlur[];
	let skipped = 0;

	if (FORCE_ALL) {
		toProcess = images;
		logInfo(`   Mode --force: ${images.length} images à régénérer`);
	} else {
		// Filtrer les images qui n'ont pas de ThumbHash
		toProcess = images.filter((img) => !isThumbHash(img.blurDataUrl));
		skipped = images.length - toProcess.length;
		logInfo(`   ${toProcess.length} images à migrer (${skipped} déjà en ThumbHash)`);
	}

	if (toProcess.length === 0) {
		return { success: 0, error: 0, skipped };
	}

	// Traiter par batch
	let successCount = 0;
	let errorCount = 0;
	let processed = 0;

	for (let i = 0; i < toProcess.length; i += PARALLEL_COUNT) {
		if (isShuttingDown) {
			logWarn("Arrêt demandé, sortie après ce batch...");
			break;
		}

		const batch = toProcess.slice(i, i + PARALLEL_COUNT);
		const results = await processBatch(batch, table);

		for (const result of results) {
			processed++;

			if (result.success) {
				successCount++;
				const timing = result.metrics ? ` (${result.metrics.totalMs}ms)` : "";
				const formatInfo =
					result.previousFormat !== "none" ? ` [${result.previousFormat} → thumbhash]` : "";
				logInfo(`   ✅ [${processed}/${toProcess.length}] ${result.id}${formatInfo}${timing}`);
			} else {
				errorCount++;
				logError(`   ❌ [${processed}/${toProcess.length}] ${result.id}: ${result.error}`);
			}
		}

		// Pause entre les batches
		if (i + PARALLEL_COUNT < toProcess.length) {
			await delay(THUMBHASH_CONFIG.batchDelay);
		}
	}

	return { success: successCount, error: errorCount, skipped };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	logInfo("🔄 Migration vers ThumbHash (standard 2025)\n");
	logInfo(`Mode: ${DRY_RUN ? "DRY RUN (simulation)" : "PRODUCTION"}`);
	logInfo(
		`Force régénération: ${FORCE_ALL ? "OUI (toutes les images)" : "NON (seulement les non-ThumbHash)"}`,
	);
	logInfo(`Parallélisation: ${PARALLEL_COUNT} images simultanées`);
	logInfo(`Logs JSON: ${JSON_LOGS ? "activés" : "désactivés"}`);

	const startTime = performance.now();

	// Migrer SkuMedia
	const skuResult = await migrateTable("SkuMedia");

	// Migrer ReviewMedia
	const reviewResult = await migrateTable("ReviewMedia");

	const totalMs = Math.round(performance.now() - startTime);

	// Résumé
	logInfo("\n" + "=".repeat(50));
	logInfo("                 RÉSUMÉ MIGRATION");
	logInfo("=".repeat(50));

	logInfo("\n📊 SkuMedia:");
	logInfo(`   ✅ Succès: ${skuResult.success}`);
	logInfo(`   ❌ Erreurs: ${skuResult.error}`);
	logInfo(`   ⏭️  Déjà ThumbHash: ${skuResult.skipped}`);

	logInfo("\n📊 ReviewMedia:");
	logInfo(`   ✅ Succès: ${reviewResult.success}`);
	logInfo(`   ❌ Erreurs: ${reviewResult.error}`);
	logInfo(`   ⏭️  Déjà ThumbHash: ${reviewResult.skipped}`);

	const totalSuccess = skuResult.success + reviewResult.success;
	const totalError = skuResult.error + reviewResult.error;

	logInfo(`\n⏱️  Durée totale: ${(totalMs / 1000).toFixed(1)}s`);

	if (totalError > 0) {
		logWarn(`\n⚠️  ${totalError} erreur(s) - Relancer le script pour réessayer`);
	}

	if (DRY_RUN) {
		logWarn("\n⚠️  Mode DRY RUN - Aucune modification effectuée");
	} else if (totalSuccess > 0) {
		logInfo(`\n✅ ${totalSuccess} image(s) migrée(s) vers ThumbHash !`);
	}
}

main()
	.catch((error) => {
		logError("❌ Erreur fatale:", { error: String(error) });
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
