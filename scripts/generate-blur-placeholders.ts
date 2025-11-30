/**
 * Script de migration pour générer les blurDataURL des images existantes
 *
 * Ce script :
 * 1. Récupère tous les SkuMedia de type IMAGE sans blurDataUrl
 * 2. Télécharge chaque image
 * 3. Génère un placeholder blur avec plaiceholder
 * 4. Met à jour la base de données
 *
 * Usage :
 * pnpm exec tsx scripts/generate-blur-placeholders.ts
 * pnpm exec tsx scripts/generate-blur-placeholders.ts --dry-run       # Pour voir ce qui serait fait
 * pnpm exec tsx scripts/generate-blur-placeholders.ts --parallel=10   # Traiter 10 images en parallèle
 */

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";
import { getPlaiceholder } from "plaiceholder";

// ============================================================================
// CONFIGURATION
// ============================================================================

const DOWNLOAD_TIMEOUT = 30000; // 30 secondes pour télécharger
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB max
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1000;

// Arguments CLI
const DRY_RUN = process.argv.includes("--dry-run");
const PARALLEL_ARG = process.argv.find((arg) => arg.startsWith("--parallel="));
const PARALLEL_COUNT = PARALLEL_ARG ? parseInt(PARALLEL_ARG.split("=")[1], 10) : 5;

// Initialisation Prisma
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
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
				const delayMs = baseDelay * Math.pow(2, attempt);
				await delay(delayMs);
			}
		}
	}

	throw lastError;
}

/**
 * Télécharge une image et retourne le buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				"User-Agent": "Synclune-BlurGenerator/1.0",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const contentLength = response.headers.get("content-length");
		if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
			throw new Error(`Image trop volumineuse (${contentLength} bytes)`);
		}

		const arrayBuffer = await response.arrayBuffer();
		return Buffer.from(arrayBuffer);
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Génère un blurDataURL pour une image
 */
async function generateBlurDataUrl(imageUrl: string): Promise<string> {
	const buffer = await downloadImage(imageUrl);
	const { base64 } = await getPlaiceholder(buffer, { size: 10 });
	return base64;
}

/**
 * Traite une image et génère son blurDataUrl
 */
async function processImage(image: ImageMedia): Promise<ProcessResult> {
	try {
		const blurDataUrl = await withRetry(() => generateBlurDataUrl(image.url));

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
	console.log("🖼️  Génération des blurDataURL pour les images existantes\n");
	console.log(`Mode: ${DRY_RUN ? "DRY RUN (simulation)" : "PRODUCTION"}`);
	console.log(`Parallélisation: ${PARALLEL_COUNT} images simultanées\n`);

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

	console.log(`📊 ${images.length} images trouvées sans blurDataUrl\n`);

	if (images.length === 0) {
		console.log("✅ Toutes les images ont déjà un blurDataUrl !");
		await prisma.$disconnect();
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
				console.log(`✅ [${processed}/${images.length}] ${result.id}`);
			} else {
				errors++;
				console.log(`❌ [${processed}/${images.length}] ${result.id}: ${result.error}`);
			}
		}

		// Petite pause entre les batches pour ne pas surcharger
		if (i + PARALLEL_COUNT < images.length) {
			await delay(500);
		}
	}

	console.log("\n📊 Résumé:");
	console.log(`   Total traité: ${processed}`);
	console.log(`   ✅ Succès: ${success}`);
	console.log(`   ❌ Erreurs: ${errors}`);

	if (DRY_RUN) {
		console.log("\n⚠️  Mode DRY RUN - Aucune modification effectuée");
	}

	await prisma.$disconnect();
}

main().catch((error) => {
	console.error("❌ Erreur fatale:", error);
	process.exit(1);
});
