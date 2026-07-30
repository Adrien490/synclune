/**
 * Audit de couverture des placeholders blur (et des dimensions d'image).
 *
 * Analyse `SkuMedia` pour :
 * 1. Compter les médias avec/sans `blurDataUrl` — y compris les VIDÉOS, dont la
 *    couverture n'était pas auditée du tout (le scan filtrait `mediaType: IMAGE`) ;
 * 2. Ventiler les formats réellement produits (PNG ThumbHash serveur, JPEG canvas
 *    et WebP ffmpeg pour les posters vidéo) sans traiter les deux derniers comme
 *    un « format ancien » à migrer — ils sont vivants ;
 * 3. Signaler les `SkuMedia` sans dimensions (`width`/`height` NULL), qui privent
 *    la lightbox de son `srcSet`.
 *
 * Sort en code 1 s'il reste quelque chose à corriger : utilisable comme gate.
 * Le rattrapage se fait avec `pnpm backfill:media`.
 *
 * ============================================================================
 * Variables d'environnement requises:
 * - DATABASE_URL: Connection string PostgreSQL
 * ============================================================================
 *
 * Usage :
 *   pnpm check:media
 *   pnpm exec tsx scripts/check-blur-placeholders.ts --json   # monitoring
 */

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";
import { requireScriptEnvVars } from "../shared/utils/script-env";

// ============================================================================
// VALIDATION ENVIRONNEMENT
// ============================================================================

const SCRIPT_NAME = "check-blur-placeholders";
const env = requireScriptEnvVars(["DATABASE_URL"] as const, SCRIPT_NAME);

// Client dédié (convention des autres scripts) : `shared/lib/prisma` fait
// `import "server-only"`, non résoluble hors bundler Next — l'importer ici
// rendait ce script tout simplement INEXÉCUTABLE (ERR_MODULE_NOT_FOUND).
const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ============================================================================
// ARGUMENTS CLI
// ============================================================================

const JSON_LOGS = process.argv.includes("--json");

// ============================================================================
// TYPES
// ============================================================================

/**
 * Formats de placeholder réellement produits par le code aujourd'hui.
 * `thumbhash` (PNG serveur), `canvas-jpeg` et `ffmpeg-webp` (posters vidéo) sont
 * tous les trois LÉGITIMES — seuls `color-svg` et `unknown` méritent attention.
 */
type BlurFormat = "thumbhash" | "canvas-jpeg" | "ffmpeg-webp" | "color-svg" | "unknown";

const EMPTY_FORMATS: Record<BlurFormat, number> = {
	thumbhash: 0,
	"canvas-jpeg": 0,
	"ffmpeg-webp": 0,
	"color-svg": 0,
	unknown: 0,
};

interface BlurStats {
	total: number;
	withBlur: number;
	withoutBlur: number;
	formats: Record<BlurFormat, number>;
	/** `SkuMedia` IMAGE sans width/height. */
	withoutDimensions: number;
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
 * Détecte le format d'un `blurDataUrl`.
 *
 * ⚠️ JPEG et WebP ne sont PAS des formats legacy : ce sont exactement ceux que
 * produisent les deux chemins vidéo vivants — canvas client
 * (`use-video-thumbnail.ts`) et ffmpeg (`generate-video-thumbnails.ts`).
 * L'ancienne heuristique les étiquetait « plaiceholder / format ancien » et
 * poussait vers une migration inutile, via un script qui n'existe plus.
 */
function detectBlurFormat(blurDataUrl: string): BlurFormat {
	if (!blurDataUrl) return "unknown";
	if (blurDataUrl.startsWith("data:image/png;base64,")) return "thumbhash";
	if (blurDataUrl.startsWith("data:image/jpeg;base64,")) return "canvas-jpeg";
	if (blurDataUrl.startsWith("data:image/webp;base64,")) return "ffmpeg-webp";
	if (blurDataUrl.startsWith("data:image/svg+xml;base64,")) return "color-svg";
	return "unknown";
}

function tallyBlur(
	rows: { id: string; url: string; blurDataUrl: string | null }[],
	stats: BlurStats,
	samplesWithoutBlur: { id: string; url: string }[],
): void {
	stats.total = rows.length;

	for (const row of rows) {
		if (row.blurDataUrl) {
			stats.withBlur++;
			stats.formats[detectBlurFormat(row.blurDataUrl)]++;
		} else {
			stats.withoutBlur++;
			if (samplesWithoutBlur.length < 5) {
				samplesWithoutBlur.push({ id: row.id, url: row.url });
			}
		}
	}
}

// ============================================================================
// ANALYSE
// ============================================================================

async function analyzeTable(tableName: "SkuMedia"): Promise<TableReport> {
	const stats: BlurStats = {
		total: 0,
		withBlur: 0,
		withoutBlur: 0,
		formats: { ...EMPTY_FORMATS },
		withoutDimensions: 0,
	};
	const samplesWithoutBlur: { id: string; url: string }[] = [];

	// Pas de filtre `mediaType` : une VIDÉO porte aussi un blur (celui de son
	// poster) et son absence était invisible pour cet audit.
	const rows = await prisma.skuMedia.findMany({
		select: {
			id: true,
			url: true,
			blurDataUrl: true,
			mediaType: true,
			width: true,
			height: true,
		},
	});
	tallyBlur(rows, stats, samplesWithoutBlur);

	// Dimensions : seules les IMAGES en portent (cf. backfill-media-metadata).
	stats.withoutDimensions = rows.filter(
		(r) => r.mediaType === "IMAGE" && (r.width === null || r.height === null),
	).length;

	return { tableName, stats, samplesWithoutBlur };
}

// ============================================================================
// RAPPORT
// ============================================================================

function printReport(reports: TableReport[]): void {
	const totalMissingBlur = reports.reduce((s, r) => s + r.stats.withoutBlur, 0);
	const totalMissingDims = reports.reduce((s, r) => s + r.stats.withoutDimensions, 0);
	// Seuls les formats non identifiés sont anormaux : PNG/JPEG/WebP sont tous
	// des sorties légitimes du pipeline actuel.
	const totalUnknown = reports.reduce((s, r) => s + r.stats.formats.unknown, 0);

	if (JSON_LOGS) {
		console.log(
			JSON.stringify({
				event: "blur-placeholder-audit",
				totals: { totalMissingBlur, totalMissingDims, totalUnknown },
				reports: reports.map((r) => ({
					table: r.tableName,
					...r.stats,
					samplesWithoutBlur: r.samplesWithoutBlur,
				})),
			}),
		);
	} else {
		console.log("\n" + "=".repeat(70));
		console.log("           AUDIT DES PLACEHOLDERS & DIMENSIONS MÉDIAS");
		console.log("=".repeat(70));

		for (const { tableName, stats, samplesWithoutBlur } of reports) {
			const coverage = stats.total > 0 ? ((stats.withBlur / stats.total) * 100).toFixed(1) : "0";

			console.log(`\n📊 ${tableName}`);
			console.log("-".repeat(40));
			console.log(`   Total médias:       ${stats.total}`);
			console.log(`   Avec blur:          ${stats.withBlur} (${coverage}%)`);
			console.log(`   Sans blur:          ${stats.withoutBlur}`);
			console.log(`   Sans dimensions:    ${stats.withoutDimensions}`);

			if (stats.withBlur > 0) {
				console.log("\n   📦 Formats (tous légitimes sauf « inconnu »):");
				console.log(`      ThumbHash PNG (serveur):   ${stats.formats.thumbhash}`);
				console.log(`      JPEG canvas (poster):      ${stats.formats["canvas-jpeg"]}`);
				console.log(`      WebP ffmpeg (poster):      ${stats.formats["ffmpeg-webp"]}`);
				console.log(`      SVG codé en dur:           ${stats.formats["color-svg"]}`);
				if (stats.formats.unknown > 0) {
					console.log(`      ⚠️  Inconnu:                ${stats.formats.unknown}`);
				}
			}

			if (samplesWithoutBlur.length > 0) {
				console.log("\n   ⚠️  Exemples sans blur (max 5):");
				for (const sample of samplesWithoutBlur) {
					const shortUrl =
						sample.url.length > 50 ? sample.url.substring(0, 50) + "..." : sample.url;
					console.log(`      - ${sample.id}: ${shortUrl}`);
				}
			}
		}

		console.log("\n" + "=".repeat(70));
		console.log("                    RÉSUMÉ");
		console.log("=".repeat(70));

		if (totalMissingBlur === 0 && totalMissingDims === 0 && totalUnknown === 0) {
			console.log("\n✅ Couverture complète. Aucune action requise.\n");
		} else {
			if (totalMissingBlur > 0) {
				console.log(`\n⚠️  ${totalMissingBlur} média(s) sans blur placeholder`);
			}
			if (totalMissingDims > 0) {
				console.log(`⚠️  ${totalMissingDims} image(s) sans dimensions (srcSet lightbox dégradé)`);
			}
			if (totalUnknown > 0) {
				console.log(`⚠️  ${totalUnknown} placeholder(s) au format non reconnu — à inspecter`);
			}
			console.log("\n   → Rattrapage : pnpm backfill:media --dry-run puis pnpm backfill:media\n");
		}
	}

	// Exit non-zéro : rend le script utilisable comme gate CI/pre-deploy.
	if (totalMissingBlur > 0 || totalMissingDims > 0 || totalUnknown > 0) {
		process.exitCode = 1;
	}
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	const skuMediaReport = await analyzeTable("SkuMedia");

	printReport([skuMediaReport]);
}

main()
	.catch((error) => {
		console.error("❌ Erreur fatale:", error);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
