/**
 * Script de conversion des blur base64 existants vers placeholders couleur optimisés
 *
 * Ce script :
 * 1. Récupère tous les SkuMedia avec un blurDataUrl base64 existant
 * 2. Re-télécharge l'image originale
 * 3. Extrait la couleur dominante avec sharp
 * 4. Génère un SVG gradient ultra-compact
 * 5. Met à jour la base de données
 *
 * Avantages:
 * - Réduit la taille des placeholders de ~200-300 bytes à ~50 bytes
 * - Économie totale: ~150-250 bytes par image
 * - Pour 1000 images: ~150-250 KB économisés en DB
 *
 * ============================================================================
 * Variables d'environnement requises:
 * - DATABASE_URL: Connection string PostgreSQL
 * ============================================================================
 *
 * Usage :
 * pnpm exec tsx scripts/convert-blur-to-color-placeholders.ts
 * pnpm exec tsx scripts/convert-blur-to-color-placeholders.ts --dry-run       # Simulation
 * pnpm exec tsx scripts/convert-blur-to-color-placeholders.ts --parallel=10   # 10 images en parallèle
 * pnpm exec tsx scripts/convert-blur-to-color-placeholders.ts --json          # Logs JSON
 */

import "dotenv/config";
import { prisma } from "../shared/lib/prisma";
import { generateColorPlaceholderWithRetry } from "../modules/media/services/generate-color-placeholder";
import { COLOR_PLACEHOLDER_CONFIG } from "../modules/media/constants/media.constants";
import { isValidUploadThingUrl } from "../modules/media/utils/validate-media-file";
import type { ProcessMetrics, StructuredLog } from "../modules/media/types/script.types";
import { requireScriptEnvVars } from "../shared/utils/script-env";

// ============================================================================
// VALIDATION ENVIRONNEMENT
// ============================================================================

const SCRIPT_NAME = "convert-blur-to-color-placeholders";
const env = requireScriptEnvVars(["DATABASE_URL"] as const, SCRIPT_NAME);

// ============================================================================
// ARGUMENTS CLI
// ============================================================================

const DRY_RUN = process.argv.includes("--dry-run");
const JSON_LOGS = process.argv.includes("--json");
const PARALLEL_ARG = process.argv.find((arg) => arg.startsWith("--parallel="));
const PARALLEL_COUNT = PARALLEL_ARG ? parseInt(PARALLEL_ARG.split("=")[1], 10) : 5;

// ============================================================================
// GESTION ARRÊT GRACIEUX
// ============================================================================

let isShuttingDown = false;

process.on("SIGTERM", () => {
	isShuttingDown = true;
	if (JSON_LOGS) {
		console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: "warn", event: "SIGTERM reçu, arrêt gracieux..." }));
	} else {
		console.warn("\n⚠️  SIGTERM reçu, arrêt gracieux après le batch en cours...");
	}
});

process.on("SIGINT", () => {
	isShuttingDown = true;
	if (JSON_LOGS) {
		console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: "warn", event: "SIGINT reçu, arrêt gracieux..." }));
	} else {
		console.warn("\n⚠️  SIGINT reçu, arrêt gracieux après le batch en cours...");
	}
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

interface MediaItemWithBlur {
	id: string;
	url: string;
	blurDataUrl: string;
}

interface ConversionResult {
	id: string;
	success: boolean;
	error?: string;
	oldSize?: number;
	newSize?: number;
	savings?: number;
	dominantColor?: string;
	metrics?: ProcessMetrics;
}

// ============================================================================
// HELPERS
// ============================================================================

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
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
 * Vérifie si un blurDataUrl est déjà au format SVG optimisé
 */
function isAlreadySvgPlaceholder(blurDataUrl: string): boolean {
	return blurDataUrl.startsWith("data:image/svg+xml");
}

/**
 * Convertit une image avec blur base64 vers placeholder couleur
 */
async function convertImage(image: MediaItemWithBlur): Promise<ConversionResult> {
	const startTime = performance.now();
	const oldSize = image.blurDataUrl.length;

	// Vérifier si déjà converti
	if (isAlreadySvgPlaceholder(image.blurDataUrl)) {
		return {
			id: image.id,
			success: true,
			oldSize,
			newSize: oldSize,
			savings: 0,
			metrics: createMetrics({ totalMs: Math.round(performance.now() - startTime) }),
		};
	}

	// Validation du domaine source
	if (!isValidUploadThingUrl(image.url)) {
		return {
			id: image.id,
			success: false,
			error: `Domaine non autorisé: ${new URL(image.url).hostname}`,
			oldSize,
			metrics: createMetrics({ totalMs: Math.round(performance.now() - startTime) }),
		};
	}

	try {
		// Générer nouveau placeholder couleur depuis l'image originale
		const colorStart = performance.now();
		const placeholder = await generateColorPlaceholderWithRetry(image.url, {
			validateDomain: false,
		});
		const blurMs = Math.round(performance.now() - colorStart);

		const newSize = placeholder.blurDataUrl.length;
		const savings = oldSize - newSize;

		// Mise à jour DB
		let dbUpdateMs = 0;
		if (!DRY_RUN) {
			const dbStart = performance.now();
			await prisma.skuMedia.update({
				where: { id: image.id },
				data: { blurDataUrl: placeholder.blurDataUrl },
			});
			dbUpdateMs = Math.round(performance.now() - dbStart);
		}

		return {
			id: image.id,
			success: true,
			oldSize,
			newSize,
			savings,
			dominantColor: placeholder.dominantColor,
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
			oldSize,
			metrics: createMetrics({ totalMs: Math.round(performance.now() - startTime) }),
		};
	}
}

/**
 * Traite un batch d'images en parallèle
 */
async function processBatch(images: MediaItemWithBlur[]): Promise<ConversionResult[]> {
	return Promise.all(images.map((image) => convertImage(image)));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	logInfo("🔄 Conversion des blur base64 vers placeholders couleur optimisés\n");
	logInfo(`Mode: ${DRY_RUN ? "DRY RUN (simulation)" : "PRODUCTION"}`);
	logInfo(`Parallélisation: ${PARALLEL_COUNT} images simultanées`);
	logInfo(`Logs JSON: ${JSON_LOGS ? "activés" : "désactivés"}\n`);

	// Récupérer les images avec blurDataUrl base64 (pas SVG)
	const allImages = await prisma.skuMedia.findMany({
		where: {
			mediaType: "IMAGE",
			blurDataUrl: {
				not: null,
			},
		},
		select: {
			id: true,
			url: true,
			blurDataUrl: true,
		},
	});

	// Filtrer celles qui ont encore un base64 (pas déjà SVG)
	const images = allImages.filter(
		(img): img is MediaItemWithBlur =>
			img.blurDataUrl !== null && !isAlreadySvgPlaceholder(img.blurDataUrl)
	);

	logInfo(`📊 ${images.length} images à convertir (sur ${allImages.length} avec placeholder)\n`);

	if (images.length === 0) {
		logInfo("✅ Toutes les images utilisent déjà le format SVG optimisé !");
		return;
	}

	// Calculer la taille totale actuelle
	const totalOldSize = images.reduce((sum, img) => sum + img.blurDataUrl.length, 0);
	logInfo(`📦 Taille totale actuelle: ${(totalOldSize / 1024).toFixed(2)} KB\n`);

	// Traiter par batch
	let processed = 0;
	let successCount = 0;
	let errorCount = 0;
	let skippedCount = 0;
	let totalSavings = 0;
	const allMetrics: ProcessMetrics[] = [];

	for (let i = 0; i < images.length; i += PARALLEL_COUNT) {
		if (isShuttingDown) {
			logWarn("Arrêt demandé, sortie après ce batch...");
			break;
		}

		const batch = images.slice(i, i + PARALLEL_COUNT);
		const results = await processBatch(batch);

		for (const result of results) {
			processed++;
			if (result.metrics) {
				allMetrics.push(result.metrics);
			}

			if (result.success) {
				if (result.savings === 0) {
					skippedCount++;
					logInfo(`⏭️  [${processed}/${images.length}] ${result.id} (déjà converti)`);
				} else {
					successCount++;
					totalSavings += result.savings || 0;
					const timing = result.metrics ? ` (${result.metrics.totalMs}ms)` : "";
					const color = result.dominantColor ? ` ${result.dominantColor}` : "";
					const savings = result.savings ? ` [-${result.savings}B]` : "";
					logInfo(`✅ [${processed}/${images.length}] ${result.id}${color}${savings}${timing}`, {
						id: result.id,
						success: true,
						oldSize: result.oldSize,
						newSize: result.newSize,
						savings: result.savings,
						dominantColor: result.dominantColor,
					});
				}
			} else {
				errorCount++;
				logError(`❌ [${processed}/${images.length}] ${result.id}: ${result.error}`, {
					id: result.id,
					error: result.error,
				});
			}
		}

		// Pause entre les batches
		if (i + PARALLEL_COUNT < images.length) {
			await delay(COLOR_PLACEHOLDER_CONFIG.batchDelay);
		}
	}

	// Résumé final
	logInfo("\n📊 Résumé:");
	logInfo(`   Total traité: ${processed}/${images.length}`);
	logInfo(`   ✅ Convertis: ${successCount}`);
	logInfo(`   ⏭️  Déjà SVG: ${skippedCount}`);
	logInfo(`   ❌ Erreurs: ${errorCount}`);

	if (totalSavings > 0) {
		logInfo(`\n💾 Économies réalisées:`);
		logInfo(`   Total: ${totalSavings} bytes (${(totalSavings / 1024).toFixed(2)} KB)`);
		logInfo(`   Moyenne: ${Math.round(totalSavings / successCount)} bytes/image`);
		const percentSaved = ((totalSavings / totalOldSize) * 100).toFixed(1);
		logInfo(`   Réduction: ${percentSaved}%`);
	}

	if (allMetrics.length > 0) {
		const avgMs = Math.round(allMetrics.reduce((sum, m) => sum + m.totalMs, 0) / allMetrics.length);
		logInfo(`\n⏱️  Temps moyen par image: ${avgMs}ms`);
	}

	if (isShuttingDown) {
		logWarn(`\n⚠️  Script interrompu - ${images.length - processed} images non traitées`);
	}

	if (DRY_RUN) {
		logWarn("\n⚠️  Mode DRY RUN - Aucune modification effectuée");
	}
}

main()
	.catch((error) => {
		logError("❌ Erreur fatale:", { error: String(error) });
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
