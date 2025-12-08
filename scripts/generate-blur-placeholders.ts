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

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";
import { generateBlurDataUrlWithRetry } from "../modules/media/services/generate-blur-data-url";
import {
	BLUR_PLACEHOLDER_CONFIG,
	isValidUploadThingUrl,
} from "../modules/media/constants/media.constants";

// ============================================================================
// VALIDATION ENVIRONNEMENT
// ============================================================================

if (!process.env.DATABASE_URL) {
	console.error("❌ DATABASE_URL n'est pas défini dans les variables d'environnement.");
	console.error("   Vérifiez votre fichier .env ou vos variables d'environnement.");
	process.exit(1);
}

// ============================================================================
// ARGUMENTS CLI
// ============================================================================

const DRY_RUN = process.argv.includes("--dry-run");
const JSON_LOGS = process.argv.includes("--json");
const PARALLEL_ARG = process.argv.find((arg) => arg.startsWith("--parallel="));
const PARALLEL_COUNT = PARALLEL_ARG ? parseInt(PARALLEL_ARG.split("=")[1], 10) : 5;

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
// INITIALISATION PRISMA
// ============================================================================

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ============================================================================
// TYPES
// ============================================================================

interface ImageMedia {
	id: string;
	url: string;
	skuId: string;
}

interface ProcessResult {
	id: string;
	success: boolean;
	error?: string;
	blurDataUrl?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Traite une image et génère son blurDataUrl
 */
async function processImage(image: ImageMedia): Promise<ProcessResult> {
	// Validation du domaine source
	if (!isValidUploadThingUrl(image.url)) {
		return {
			id: image.id,
			success: false,
			error: `Domaine non autorisé: ${new URL(image.url).hostname}`,
		};
	}

	try {
		const blurDataUrl = await generateBlurDataUrlWithRetry(image.url, {
			validateDomain: false, // Déjà validé ci-dessus
		});

		if (!DRY_RUN) {
			await prisma.skuMedia.update({
				where: { id: image.id },
				data: { blurDataUrl },
			});
		}

		return {
			id: image.id,
			success: true,
			blurDataUrl: blurDataUrl.substring(0, 50) + "...",
		};
	} catch (error) {
		return {
			id: image.id,
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Traite un batch d'images en parallèle
 */
async function processBatch(images: ImageMedia[]): Promise<ProcessResult[]> {
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
	let success = 0;
	let errors = 0;

	for (let i = 0; i < images.length; i += PARALLEL_COUNT) {
		const batch = images.slice(i, i + PARALLEL_COUNT);
		const results = await processBatch(batch);

		for (const result of results) {
			processed++;
			if (result.success) {
				success++;
				logInfo(`✅ [${processed}/${images.length}] ${result.id}`, {
					id: result.id,
					success: true,
				});
			} else {
				errors++;
				logError(`❌ [${processed}/${images.length}] ${result.id}: ${result.error}`, {
					id: result.id,
					error: result.error,
				});
			}
		}

		// Pause entre les batches pour ne pas surcharger
		if (i + PARALLEL_COUNT < images.length) {
			await delay(BLUR_PLACEHOLDER_CONFIG.batchDelay);
		}
	}

	logInfo("\n📊 Résumé:");
	logInfo(`   Total traité: ${processed}`);
	logInfo(`   ✅ Succès: ${success}`);
	logInfo(`   ❌ Erreurs: ${errors}`);

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
