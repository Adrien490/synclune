/**
 * @regression image-quality-explicit
 *
 * `next/image` émet `q=75` quand la prop `quality` est absente
 * (`next/dist/shared/lib/get-img-props.js` : `quality: qualityInt || 75`), et
 * l'optimiseur REFUSE toute qualité absente de `images.qualities`
 * (`next/dist/server/image-optimizer.js` : `if (!qualities.includes(quality))
 * return errorMessage`). Comme l'audit coûts a ramené `qualities` de 7 valeurs
 * à `[65, 80]`, **75 n'en fait plus partie** : tout `<Image>` sans `quality`
 * répond donc `400 — "q" parameter (quality) of 75 is not allowed`, et affiche
 * une image cassée.
 *
 * Vérifié par requête réelle le 2026-08-05 :
 *   /_next/image?url=%2Flogo.webp&w=96&q=75 → 400
 *   /_next/image?url=%2Flogo.webp&w=96&q=65 → 200
 *   /_next/image?url=%2Flogo.webp&w=64&q=80 → 200
 *
 * ## Pourquoi AUCUN outil ne le signalait
 *
 * L'avertissement de développement de Next est gardé par
 * `if (qualityInt && config.qualities && !config.qualities.includes(qualityInt))`
 * (`get-img-props.js:423`). Quand `quality` est absent, `qualityInt` vaut
 * `undefined` : la condition est fausse et **rien n'est loggué**. Ni au build,
 * ni au typecheck (la prop est optionnelle), ni en dev. L'audit du logo a
 * trouvé **25 occurrences** d'un coup — la quasi-totalité du catalogue admin,
 * la recherche rapide, le méga-menu et la page « boutique fermée ».
 *
 * ## Deux sorties possibles, et pourquoi c'est celle-ci
 *
 * Réintroduire 75 dans `qualities` corrigerait tout en une ligne, mais
 * rouvrirait un TROISIÈME palier : les images servies à 75 cesseraient de
 * partager leurs variantes avec celles à 65/80, ce que l'audit coûts avait
 * précisément consolidé (Vercel facture par couple source × largeur × qualité).
 * On déclare donc la qualité au call site, et ce test empêche l'oubli.
 *
 * ⚠️ Si un jour `images.qualities` contient 75, ce test se neutralise tout seul
 * — l'omission redevient sûre, il n'y a plus rien à garder.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import nextConfig from "@/next.config";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const SCAN_DIRS = ["app", "modules", "shared", "emails"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__tests__", "__snapshots__"]);

/** Qualité que `next/image` émet quand la prop est absente. */
const NEXT_DEFAULT_QUALITY = 75;

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (entry.endsWith(".tsx")) out.push(full);
	}
	return out;
}

/**
 * Retire les commentaires avant le scan : `product-image-cell.tsx` documente le
 * motif `<Image src>` dans un JSDoc, et un scan naïf le compte comme un appel.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

const IMAGE_TAG = /<Image\b[^>]*?\/>/gs;

function findUnqualifiedImages(): string[] {
	const offenders: string[] = [];

	for (const scanDir of SCAN_DIRS) {
		const root = join(REPO_ROOT, scanDir);
		for (const file of walk(root)) {
			const raw = readFileSync(file, "utf8");
			// Seuls les fichiers qui montent réellement `next/image` nous concernent.
			if (!raw.includes("next/image")) continue;

			const source = stripComments(raw);
			for (const match of source.matchAll(IMAGE_TAG)) {
				if (match[0].includes("quality")) continue;
				const line = source.slice(0, match.index).split("\n").length;
				offenders.push(`${relative(REPO_ROOT, file)}:${line}`);
			}
		}
	}

	return offenders.sort();
}

describe("@regression image-quality-explicit", () => {
	it("images.qualities ne contient PAS la valeur par défaut de next/image", () => {
		// Sentinelle : c'est ce fait qui rend le scan ci-dessous obligatoire.
		// S'il devient faux, le scan doit être supprimé, pas contourné.
		expect(nextConfig.images?.qualities).toBeDefined();
		expect(nextConfig.images?.qualities).not.toContain(NEXT_DEFAULT_QUALITY);
	});

	it("aucun <Image> n'omet la prop quality", () => {
		const qualities = nextConfig.images?.qualities ?? [];
		if (qualities.includes(NEXT_DEFAULT_QUALITY)) return; // garde devenue sans objet

		expect(
			findUnqualifiedImages(),
			`Ces <Image> émettent q=${NEXT_DEFAULT_QUALITY}, absent de images.qualities [${qualities.join(", ")}] : ` +
				"l'optimiseur répondra 400 et l'image sera cassée, sans aucun avertissement. " +
				"Poser quality={IMAGE_QUALITY.THUMBNAIL} (≤ 120 px) ou quality={IMAGE_QUALITY.STANDARD}.",
		).toEqual([]);
	});
});
