/**
 * Backfill des métadonnées d'images : `blurDataUrl` + `width`/`height`.
 *
 * Comble deux trous identifiés par l'audit « Images produit et performance » :
 *
 * 1. **Blur manquant (IMG-04)** — la génération du ThumbHash à l'upload est
 *    best-effort : `app/api/uploadthing/core.ts` avale l'échec (Sentry seul) et
 *    publie le média sans placeholder. Il n'existait AUCUN chemin de rattrapage :
 *    `scripts/check-blur-placeholders.ts` renvoyait vers un
 *    `scripts/migrate-to-thumbhash.ts` supprimé du dépôt. Le trou était définitif.
 *
 * 2. **Dimensions manquantes (IMG-06)** — les colonnes `SkuMedia.width/height`
 *    viennent d'être ajoutées (migration 20260726160000) : toutes les lignes
 *    antérieures sont à NULL, ce qui prive la lightbox de son `srcSet`.
 *
 * Un seul passage réseau par média couvre les deux besoins (le buffer téléchargé
 * sert au ThumbHash ET à la lecture des dimensions).
 *
 * ============================================================================
 * Variables d'environnement requises:
 * - DATABASE_URL: Connection string PostgreSQL
 * ============================================================================
 *
 * Usage :
 *   pnpm backfill:media --dry-run          # simulation, aucune écriture
 *   pnpm backfill:media                    # exécution
 *   pnpm backfill:media --parallel=8       # concurrence (défaut 5)
 *   pnpm backfill:media --only=blur        # ne traiter que le blur
 *   pnpm backfill:media --only=dimensions  # ne traiter que les dimensions
 *   pnpm backfill:media --json             # logs JSON pour monitoring
 *
 * @module scripts/backfill-media-metadata
 */

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";
import { requireScriptEnvVars } from "../shared/utils/script-env";
import { downloadImage, truncateUrl } from "../modules/media/services/image-downloader.service";
import { generateThumbHashFromBuffer } from "../modules/media/services/generate-thumbhash";
import { readImageDimensions } from "../modules/media/services/validate-image-dimensions.service";

// ============================================================================
// ARGUMENTS CLI
// ============================================================================
// `--help` est traité AVANT la validation d'environnement : afficher l'aide ne
// doit pas exiger un DATABASE_URL.

if (process.argv.includes("--help") || process.argv.includes("-h")) {
	console.log(`
🖼️  Backfill des métadonnées d'images (blurDataUrl + width/height)

Usage:
  pnpm backfill:media [options]

Options:
  --dry-run              Simuler sans aucune écriture DB
  --parallel=N           Médias traités en parallèle (défaut: 5, max: 10)
  --only=blur            Ne traiter que les placeholders manquants
  --only=dimensions      Ne traiter que les dimensions manquantes
  --json                 Logs JSON (monitoring)
  --help, -h             Afficher cette aide
`);
	process.exit(0);
}

const DRY_RUN = process.argv.includes("--dry-run");
const JSON_LOGS = process.argv.includes("--json");

const PARALLEL_ARG = process.argv.find((arg) => arg.startsWith("--parallel="));
const parsedParallel = Number.parseInt(PARALLEL_ARG?.split("=")[1] ?? "", 10);
const PARALLEL_COUNT =
	Number.isInteger(parsedParallel) && parsedParallel > 0 ? Math.min(parsedParallel, 10) : 5;

const ONLY_ARG = process.argv.find((arg) => arg.startsWith("--only="));
const ONLY = ONLY_ARG?.split("=")[1];
if (ONLY && ONLY !== "blur" && ONLY !== "dimensions") {
	console.error(`❌ --only accepte "blur" ou "dimensions" (reçu: "${ONLY}")`);
	process.exit(1);
}
const DO_BLUR = ONLY !== "dimensions";
const DO_DIMENSIONS = ONLY !== "blur";

// ============================================================================
// VALIDATION ENVIRONNEMENT
// ============================================================================

const SCRIPT_NAME = "backfill-media-metadata";
const env = requireScriptEnvVars(["DATABASE_URL"] as const, SCRIPT_NAME);

// Client dédié : `shared/lib/prisma` fait `import "server-only"`, non résoluble
// hors bundler Next (convention partagée par tous les scripts du dossier).
const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ============================================================================
// TYPES
// ============================================================================

type Table = "SkuMedia";

interface Candidate {
	id: string;
	url: string;
	needsBlur: boolean;
	needsDimensions: boolean;
}

interface TableOutcome {
	table: Table;
	candidates: number;
	blurWritten: number;
	dimensionsWritten: number;
	failures: { id: string; url: string; reason: string }[];
}

// ============================================================================
// SÉLECTION DES CANDIDATS
// ============================================================================

/**
 * `SkuMedia` : seules les IMAGES ont un ThumbHash serveur et des dimensions
 * exploitables. Une VIDÉO porte le blur/les dimensions de son POSTER, produit
 * côté client (canvas) ou par `generate:video-thumbnails` — hors périmètre ici.
 */
async function collectSkuMediaCandidates(): Promise<Candidate[]> {
	const rows = await prisma.skuMedia.findMany({
		where: {
			mediaType: "IMAGE",
			OR: [
				...(DO_BLUR ? [{ blurDataUrl: null }] : []),
				...(DO_DIMENSIONS ? [{ width: null }, { height: null }] : []),
			],
		},
		select: { id: true, url: true, blurDataUrl: true, width: true, height: true },
	});

	return rows.map((r) => ({
		id: r.id,
		url: r.url,
		needsBlur: DO_BLUR && r.blurDataUrl === null,
		needsDimensions: DO_DIMENSIONS && (r.width === null || r.height === null),
	}));
}

// ============================================================================
// TRAITEMENT
// ============================================================================

/**
 * Télécharge le média UNE fois et en dérive ce qui manque.
 *
 * Le buffer distant est la source de vérité : les dimensions sont lues sur
 * l'image RÉELLEMENT publiée (elle a pu être re-encodée / EXIF-strippée, et
 * `sharp.rotate()` peut intervertir largeur et hauteur).
 */
async function buildUpdate(
	candidate: Candidate,
): Promise<{ blurDataUrl?: string; width?: number; height?: number }> {
	const buffer = await downloadImage(candidate.url);
	const update: { blurDataUrl?: string; width?: number; height?: number } = {};

	if (candidate.needsBlur) {
		const { dataUrl } = await generateThumbHashFromBuffer(buffer);
		update.blurDataUrl = dataUrl;
	}

	if (candidate.needsDimensions) {
		const dims = await readImageDimensions(buffer);
		if (dims) {
			update.width = dims.width;
			update.height = dims.height;
		}
	}

	return update;
}

async function processTable(table: Table, candidates: Candidate[]): Promise<TableOutcome> {
	const outcome: TableOutcome = {
		table,
		candidates: candidates.length,
		blurWritten: 0,
		dimensionsWritten: 0,
		failures: [],
	};

	for (let i = 0; i < candidates.length; i += PARALLEL_COUNT) {
		const batch = candidates.slice(i, i + PARALLEL_COUNT);

		const results = await Promise.all(
			batch.map(async (candidate) => {
				try {
					return { candidate, update: await buildUpdate(candidate) };
				} catch (error) {
					return {
						candidate,
						reason: error instanceof Error ? error.message : String(error),
					};
				}
			}),
		);

		for (const result of results) {
			if (!("update" in result) || !result.update) {
				outcome.failures.push({
					id: result.candidate.id,
					url: truncateUrl(result.candidate.url),
					reason: "reason" in result ? result.reason! : "inconnu",
				});
				continue;
			}

			const { candidate, update } = result;
			if (Object.keys(update).length === 0) continue;

			if (!DRY_RUN) {
				await prisma.skuMedia.update({ where: { id: candidate.id }, data: update });
			}

			if (update.blurDataUrl) outcome.blurWritten++;
			if (update.width && update.height) outcome.dimensionsWritten++;
		}

		if (!JSON_LOGS) {
			const done = Math.min(i + PARALLEL_COUNT, candidates.length);
			console.log(`   ${table}: ${done}/${candidates.length} traités`);
		}
	}

	return outcome;
}

// ============================================================================
// RAPPORT
// ============================================================================

function report(outcomes: TableOutcome[]): void {
	const totalFailures = outcomes.reduce((s, o) => s + o.failures.length, 0);

	if (JSON_LOGS) {
		console.log(
			JSON.stringify({
				event: "backfill-media-metadata",
				dryRun: DRY_RUN,
				scope: { blur: DO_BLUR, dimensions: DO_DIMENSIONS },
				outcomes,
			}),
		);
	} else {
		console.log("\n" + "=".repeat(70));
		console.log(`     BACKFILL MÉTADONNÉES MÉDIAS${DRY_RUN ? " (DRY-RUN)" : ""}`);
		console.log("=".repeat(70));

		for (const o of outcomes) {
			console.log(`\n📊 ${o.table}`);
			console.log(`   Candidats:            ${o.candidates}`);
			console.log(`   Placeholders écrits:  ${o.blurWritten}`);
			if (o.table === "SkuMedia") {
				console.log(`   Dimensions écrites:   ${o.dimensionsWritten}`);
			}
			if (o.failures.length > 0) {
				console.log(`   ⚠️  Échecs:            ${o.failures.length}`);
				for (const f of o.failures.slice(0, 5)) {
					console.log(`      - ${f.id}: ${f.url} (${f.reason})`);
				}
				if (o.failures.length > 5) {
					console.log(`      … et ${o.failures.length - 5} autre(s)`);
				}
			}
		}

		console.log(
			totalFailures === 0
				? "\n✅ Backfill terminé sans échec.\n"
				: `\n⚠️  ${totalFailures} média(s) en échec — relancer le script les retentera.\n`,
		);
	}

	// Exit non-zéro sur échec : le script est utilisable comme gate.
	if (totalFailures > 0) process.exitCode = 1;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	const skuCandidates = await collectSkuMediaCandidates();

	if (skuCandidates.length === 0) {
		console.log("✅ Aucun média à backfiller.");
		return;
	}

	report([await processTable("SkuMedia", skuCandidates)]);
}

main()
	.catch((error: unknown) => {
		console.error("❌ Erreur fatale:", error);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
