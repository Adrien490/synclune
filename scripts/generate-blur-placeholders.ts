/**
 * Script de migration pour générer les blurDataURL des images existantes
 *
 * Ce script :
 * 1. Récupère tous les SkuMedia de type IMAGE sans blurDataUrl
 * 2. Télécharge chaque image
 * 3. Génère un placeholder blur avec plaiceholder
 * 4. Met à jour la base de données
 *
 * ============================================================================
 * Variables d'environnement requises:
 * - DATABASE_URL: Connection string PostgreSQL
 * ============================================================================
 *
 * Usage :
 * pnpm exec tsx scripts/generate-blur-placeholders.ts
 * pnpm exec tsx scripts/generate-blur-placeholders.ts --dry-run       # Pour voir ce qui serait fait
 * pnpm exec tsx scripts/generate-blur-placeholders.ts --parallel=10   # Traiter 10 images en parallèle
 * pnpm exec tsx scripts/generate-blur-placeholders.ts --json          # Logs JSON pour monitoring
 */

import { prisma } from "../shared/lib/prisma";
import { generateBlurDataUrlWithRetry } from "../modules/media/services/generate-blur-data-url";
import { BLUR_PLACEHOLDER_CONFIG } from "../modules/media/constants/media.constants";
import { isValidUploadThingUrl } from "../modules/media/utils/validate-media-file";
import type { MediaItem, ProcessResult as BaseProcessResult, ProcessMetrics, StructuredLog } from "../modules/media/types/script.types";
import { requireScriptEnvVars } from "../shared/utils/script-env";

// ============================================================================
// VALIDATION ENVIRONNEMENT
// ============================================================================

const SCRIPT_NAME = "generate-blur-placeholders";
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
// LOGS STRUCTURÉS (Sentry-ready)
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

/** Résultat étendu avec le blur data URL */
interface BlurProcessResult extends BaseProcessResult {
	blurDataUrl?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Crée un objet ProcessMetrics avec les valeurs par défaut
 */
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
 * Traite une image et génère son blurDataUrl
 */
async function processImage(image: MediaItem): Promise<BlurProcessResult> {
	const startTime = performance.now();

	// Validation du domaine source
	if (!isValidUploadThingUrl(image.url)) {
		return {
			id: image.id,
			success: false,
			error: `Domaine non autorisé: ${new URL(image.url).hostname}`,
			metrics: createMetrics({ totalMs: Math.round(performance.now() - startTime) }),
		};
	}

	try {
		// Mesure génération blur (inclut téléchargement)
		const blurStart = performance.now();
		const blurDataUrl = await generateBlurDataUrlWithRetry(image.url, {
			validateDomain: false, // Déjà validé ci-dessus
		});
		const blurMs = Math.round(performance.now() - blurStart);

		// Mesure mise à jour DB
		let dbUpdateMs = 0;
		if (!DRY_RUN) {
			const dbStart = performance.now();
			await prisma.skuMedia.update({
				where: { id: image.id },
				data: { blurDataUrl },
			});
			dbUpdateMs = Math.round(performance.now() - dbStart);
		}

		return {
			id: image.id,
			success: true,
			blurDataUrl: blurDataUrl.substring(0, 50) + "...",
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
			metrics: createMetrics({ totalMs: Math.round(performance.now() - startTime) }),
		};
	}
}

/**
 * Traite un batch d'images en parallèle
 */
async function processBatch(images: MediaItem[]): Promise<BlurProcessResult[]> {
	return Promise.all(images.map((image) => processImage(image)));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	logInfo("🖼️  Génération des blurDataURL pour les images existantes\n");
	logInfo(`Mode: ${DRY_RUN ? "DRY RUN (simulation)" : "PRODUCTION"}`);
	logInfo(`Parallélisation: ${PARALLEL_COUNT} images simultanées`);
	logInfo(`Logs JSON: ${JSON_LOGS ? "activés" : "désactivés"}\n`);

	// Récupérer les images sans blurDataUrl
	const images = await prisma.skuMedia.findMany({
		where: {
			mediaType: "IMAGE",
			blurDataUrl: null,
		},
		select: {
			id: true,
			url: true,
			skuId: true,
		},
	});

	logInfo(`📊 ${images.length} images trouvées sans blurDataUrl\n`);

	if (images.length === 0) {
		logInfo("✅ Toutes les images ont déjà un blurDataUrl !");
		return;
	}

	// Traiter par batch
	let processed = 0;
	let successCount = 0;
	let errorCount = 0;
	const allMetrics: ProcessMetrics[] = [];

	for (let i = 0; i < images.length; i += PARALLEL_COUNT) {
		// Vérifier si arrêt demandé
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
				successCount++;
				const timing = result.metrics ? ` (${result.metrics.totalMs}ms)` : "";
				logInfo(`✅ [${processed}/${images.length}] ${result.id}${timing}`, {
					id: result.id,
					success: true,
					metrics: result.metrics,
				});
			} else {
				errorCount++;
				logError(`❌ [${processed}/${images.length}] ${result.id}: ${result.error}`, {
					id: result.id,
					error: result.error,
					metrics: result.metrics,
				});
			}
		}

		// Pause entre les batches pour ne pas surcharger
		if (i + PARALLEL_COUNT < images.length) {
			await delay(BLUR_PLACEHOLDER_CONFIG.batchDelay);
		}
	}

	// Calcul des métriques moyennes
	const avgMetrics =
		allMetrics.length > 0
			? {
					blurMs: Math.round(allMetrics.reduce((sum, m) => sum + m.blurMs, 0) / allMetrics.length),
					dbUpdateMs: Math.round(allMetrics.reduce((sum, m) => sum + m.dbUpdateMs, 0) / allMetrics.length),
					totalMs: Math.round(allMetrics.reduce((sum, m) => sum + m.totalMs, 0) / allMetrics.length),
				}
			: null;

	logInfo("\n📊 Résumé:");
	logInfo(`   Total traité: ${processed}/${images.length}`);
	logInfo(`   ✅ Succès: ${successCount}`);
	logInfo(`   ❌ Erreurs: ${errorCount}`);

	if (avgMetrics) {
		logInfo(`\n⏱️  Métriques moyennes:`);
		logInfo(`   Blur (download + génération): ${avgMetrics.blurMs}ms`);
		logInfo(`   Mise à jour DB: ${avgMetrics.dbUpdateMs}ms`);
		logInfo(`   Total: ${avgMetrics.totalMs}ms`);
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
