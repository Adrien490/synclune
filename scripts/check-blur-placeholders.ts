/**
 * Script de vérification des blurDataUrl manquants
 *
 * Ce script analyse les tables SkuMedia et ReviewMedia pour :
 * 1. Compter les images avec/sans blurDataUrl
 * 2. Identifier les blurs au format ancien (base64 plaiceholder) vs ThumbHash
 * 3. Générer un rapport détaillé
 *
 * ============================================================================
 * Variables d'environnement requises:
 * - DATABASE_URL: Connection string PostgreSQL
 * ============================================================================
 *
 * Usage :
 * pnpm exec tsx scripts/check-blur-placeholders.ts
 * pnpm exec tsx scripts/check-blur-placeholders.ts --json   # Logs JSON pour monitoring
 */

import { prisma } from "../shared/lib/prisma";
import { requireScriptEnvVars } from "../shared/utils/script-env";

// ============================================================================
// VALIDATION ENVIRONNEMENT
// ============================================================================

const SCRIPT_NAME = "check-blur-placeholders";
requireScriptEnvVars(["DATABASE_URL"] as const, SCRIPT_NAME);

// ============================================================================
// ARGUMENTS CLI
// ============================================================================

const JSON_LOGS = process.argv.includes("--json");

// ============================================================================
// TYPES
// ============================================================================

interface BlurStats {
	total: number;
	withBlur: number;
	withoutBlur: number;
	thumbhashCount: number;
	plaiceholderCount: number;
	colorPlaceholderCount: number;
	unknownFormatCount: number;
}

interface TableReport {
	tableName: string;
	stats: BlurStats;
	samplesWithoutBlur: { id: string; url: string }[];
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Detecte le format d'un blurDataUrl
 */
function detectBlurFormat(blurDataUrl: string): "thumbhash" | "plaiceholder" | "color-svg" | "unknown" {
	if (!blurDataUrl) return "unknown";

	// ThumbHash génère du PNG
	if (blurDataUrl.startsWith("data:image/png;base64,")) {
		return "thumbhash";
	}

	// Plaiceholder génère du JPEG ou WebP
	if (blurDataUrl.startsWith("data:image/jpeg;base64,") || blurDataUrl.startsWith("data:image/webp;base64,")) {
		return "plaiceholder";
	}

	// Color placeholder génère du SVG
	if (blurDataUrl.startsWith("data:image/svg+xml;base64,")) {
		return "color-svg";
	}

	return "unknown";
}

/**
 * Analyse une table de médias
 */
async function analyzeTable(
	tableName: "SkuMedia" | "ReviewMedia"
): Promise<TableReport> {
	const stats: BlurStats = {
		total: 0,
		withBlur: 0,
		withoutBlur: 0,
		thumbhashCount: 0,
		plaiceholderCount: 0,
		colorPlaceholderCount: 0,
		unknownFormatCount: 0,
	};

	const samplesWithoutBlur: { id: string; url: string }[] = [];

	if (tableName === "SkuMedia") {
		const images = await prisma.skuMedia.findMany({
			where: { mediaType: "IMAGE" },
			select: { id: true, url: true, blurDataUrl: true },
		});

		stats.total = images.length;

		for (const img of images) {
			if (img.blurDataUrl) {
				stats.withBlur++;
				const format = detectBlurFormat(img.blurDataUrl);
				if (format === "thumbhash") stats.thumbhashCount++;
				else if (format === "plaiceholder") stats.plaiceholderCount++;
				else if (format === "color-svg") stats.colorPlaceholderCount++;
				else stats.unknownFormatCount++;
			} else {
				stats.withoutBlur++;
				if (samplesWithoutBlur.length < 5) {
					samplesWithoutBlur.push({ id: img.id, url: img.url });
				}
			}
		}
	} else {
		const images = await prisma.reviewMedia.findMany({
			select: { id: true, url: true, blurDataUrl: true },
		});

		stats.total = images.length;

		for (const img of images) {
			if (img.blurDataUrl) {
				stats.withBlur++;
				const format = detectBlurFormat(img.blurDataUrl);
				if (format === "thumbhash") stats.thumbhashCount++;
				else if (format === "plaiceholder") stats.plaiceholderCount++;
				else if (format === "color-svg") stats.colorPlaceholderCount++;
				else stats.unknownFormatCount++;
			} else {
				stats.withoutBlur++;
				if (samplesWithoutBlur.length < 5) {
					samplesWithoutBlur.push({ id: img.id, url: img.url });
				}
			}
		}
	}

	return { tableName, stats, samplesWithoutBlur };
}

/**
 * Affiche le rapport
 */
function printReport(reports: TableReport[]): void {
	if (JSON_LOGS) {
		console.log(JSON.stringify({
			timestamp: new Date().toISOString(),
			event: "blur-placeholder-audit",
			reports: reports.map(r => ({
				table: r.tableName,
				...r.stats,
				samplesWithoutBlur: r.samplesWithoutBlur,
			})),
		}));
		return;
	}

	console.log("\n" + "=".repeat(70));
	console.log("           AUDIT DES BLUR PLACEHOLDERS");
	console.log("=".repeat(70) + "\n");

	let totalMissing = 0;
	let totalOldFormat = 0;

	for (const report of reports) {
		const { tableName, stats, samplesWithoutBlur } = report;
		const coverage = stats.total > 0 ? ((stats.withBlur / stats.total) * 100).toFixed(1) : "0";

		console.log(`\n📊 ${tableName}`);
		console.log("-".repeat(40));
		console.log(`   Total images:       ${stats.total}`);
		console.log(`   Avec blur:          ${stats.withBlur} (${coverage}%)`);
		console.log(`   Sans blur:          ${stats.withoutBlur}`);

		if (stats.withBlur > 0) {
			console.log("\n   📦 Formats détectés:");
			console.log(`      ThumbHash (2025):    ${stats.thumbhashCount}`);
			console.log(`      Plaiceholder:        ${stats.plaiceholderCount}`);
			console.log(`      Color SVG:           ${stats.colorPlaceholderCount}`);
			if (stats.unknownFormatCount > 0) {
				console.log(`      Inconnu:             ${stats.unknownFormatCount}`);
			}
		}

		if (samplesWithoutBlur.length > 0) {
			console.log("\n   ⚠️  Exemples sans blur (max 5):");
			for (const sample of samplesWithoutBlur) {
				const shortUrl = sample.url.length > 50 ? sample.url.substring(0, 50) + "..." : sample.url;
				console.log(`      - ${sample.id}: ${shortUrl}`);
			}
		}

		totalMissing += stats.withoutBlur;
		totalOldFormat += stats.plaiceholderCount + stats.colorPlaceholderCount;
	}

	console.log("\n" + "=".repeat(70));
	console.log("                    RÉSUMÉ");
	console.log("=".repeat(70));

	if (totalMissing === 0 && totalOldFormat === 0) {
		console.log("\n✅ Toutes les images ont un ThumbHash ! Aucune action requise.\n");
	} else {
		if (totalMissing > 0) {
			console.log(`\n⚠️  ${totalMissing} image(s) sans blur placeholder`);
			console.log("   → Exécuter: pnpm exec tsx scripts/migrate-to-thumbhash.ts");
		}

		if (totalOldFormat > 0) {
			console.log(`\n🔄 ${totalOldFormat} image(s) au format ancien (plaiceholder/SVG)`);
			console.log("   → Exécuter: pnpm exec tsx scripts/migrate-to-thumbhash.ts");
		}
	}

	console.log("\n");
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	const skuMediaReport = await analyzeTable("SkuMedia");
	const reviewMediaReport = await analyzeTable("ReviewMedia");

	printReport([skuMediaReport, reviewMediaReport]);
}

main()
	.catch((error) => {
		console.error("❌ Erreur fatale:", error);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
