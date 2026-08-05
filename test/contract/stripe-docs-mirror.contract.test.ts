/**
 * @regression stripe-docs-mirror
 *
 * `docs/stripe/INDEX.md` décrit un mirror que RIEN ne vérifiait. C'est la seule
 * surface du dépôt où une doc et son artefact pouvaient diverger sans qu'aucun
 * outil ne s'en aperçoive — et l'audit du 2026-08-05 y a trouvé quatre dérives,
 * toutes silencieuses :
 *
 *  1. **Quatre pages stockées en index de variantes.** `docs.stripe.com` sert, pour
 *     les pages déclinées par intégration ou par langage, un sommaire de ~500 o :
 *     « This article has multiple variants… ». Le script ne testait que le corps
 *     vide, il écrivait donc le placeholder comme si c'était de la doc.
 *     `payments/accept-a-payment` — la page d'intégration de référence du tunnel —
 *     était stockée en 1053 o là où sa variante en fait 77 695. ~110 Ko absents,
 *     invisibles à la lecture d'un bundle de 860 Ko.
 *  2. **Mirror désynchronisé du manifeste** : 64 pages sur disque, 66 déclarées.
 *     Deux pages ajoutées au manifeste sans re-run — et `INDEX.md` avait DÉJÀ été
 *     mis à jour aux chiffres post-régénération, décrivant un état inexistant.
 *  3. **« 10 méthodes SDK »** alors qu'il y en avait 12 (`refunds.list` manquait).
 *  4. **La SSOT de la version d'API citée au mauvais chemin**, contredite par le
 *     tableau de correspondance du même fichier, 60 lignes plus bas.
 *
 * Ce test verrouille les deux moitiés :
 *
 *  · Assertions TOUJOURS actives — elles ne lisent que des fichiers VERSIONNÉS
 *    (`INDEX.md`, le manifeste, `package.json`, la SSOT de version), donc elles
 *    tournent en CI, où les bundles gitignorés sont absents.
 *  · Assertions sur le DISQUE — skippées si les bundles n'ont pas été générés,
 *    comme les suites d'intégration le font sans `INTEGRATION_DATABASE_URL`.
 *
 * ⚠️ Le manifeste est importé, pas parsé : `scripts/fetch-stripe-docs.ts` garde son
 * `await main()` derrière un garde de point d'entrée précisément pour que cet
 * import ne déclenche pas 68 fetches réseau.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { BUNDLES } from "@/scripts/fetch-stripe-docs";
import { STRIPE_API_VERSION } from "@/shared/constants/stripe-api-version";

const REPO_ROOT = join(__dirname, "..", "..");
const MIRROR_DIR = join(REPO_ROOT, "docs", "stripe");
const INDEX_PATH = join(MIRROR_DIR, "INDEX.md");

const indexMd = readFileSync(INDEX_PATH, "utf-8");
const packageJson = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf-8")) as {
	dependencies: Record<string, string>;
};

const TOTAL_PAGES = BUNDLES.reduce((sum, bundle) => sum + bundle.pages.length, 0);

/** `| \`01-payments.md\` | 21 | 944 Ko | … |` → { file, pages } */
function bundleRowsFromIndex(): { file: string; pages: number }[] {
	return Array.from(
		indexMd.matchAll(/^\|\s*`(\d\d-[a-z-]+\.md)`\s*\|\s*(\d+)\s*\|/gm),
		(match) => ({ file: match[1]!, pages: Number(match[2]) }),
	);
}

/** Les URLs de provenance réellement écrites dans un bundle. */
function sourceUrlsOnDisk(file: string): string[] {
	const contents = readFileSync(join(MIRROR_DIR, file), "utf-8");
	return Array.from(contents.matchAll(/^<!-- Source : (\S+) -->$/gm), (match) => match[1]!);
}

const bundlesExist = BUNDLES.every((bundle) => existsSync(join(MIRROR_DIR, bundle.file)));

describe("INDEX.md ↔ manifeste (toujours vérifié — fichiers versionnés)", () => {
	it("annonce le nombre total de pages du manifeste", () => {
		expect(indexMd, `INDEX.md doit annoncer ${TOTAL_PAGES} pages (total du manifeste)`).toContain(
			`${TOTAL_PAGES} pages`,
		);
	});

	it("liste les 6 bundles, dans l'ordre du manifeste, avec leur compte de pages", () => {
		const rows = bundleRowsFromIndex();

		expect(rows.map((row) => row.file)).toEqual(BUNDLES.map((bundle) => bundle.file));

		for (const [index, row] of rows.entries()) {
			expect(
				row.pages,
				`INDEX.md annonce ${row.pages} pages pour ${row.file}, le manifeste en déclare ${BUNDLES[index]!.pages.length}`,
			).toBe(BUNDLES[index]!.pages.length);
		}
	});

	it("cite la version d'API réellement épinglée", () => {
		expect(
			indexMd,
			`INDEX.md doit citer ${STRIPE_API_VERSION} (SSOT shared/constants/stripe-api-version.ts)`,
		).toContain(STRIPE_API_VERSION);

		// Une version d'API citée mais NON épinglée est le cas dangereux : le lecteur
		// croit lire l'état du dépôt. La seule autre version tolérée est celle de la
		// section « montée en attente », qui se déclare comme telle.
		const citedVersions = new Set(
			Array.from(indexMd.matchAll(/`(20\d\d-\d\d-\d\d\.[a-z]+)`/g), (match) => match[1]!),
		);
		citedVersions.delete(STRIPE_API_VERSION);

		for (const version of citedVersions) {
			expect(
				indexMd,
				`INDEX.md cite ${version} sans section « Montée de version en attente » qui l'explique`,
			).toMatch(/Montée de version en attente/);
		}
	});

	it("cite les versions de SDK réellement installées", () => {
		for (const pkg of ["stripe", "@stripe/stripe-js", "@stripe/react-stripe-js"] as const) {
			const version = packageJson.dependencies[pkg]!.replace(/^[\^~]/, "");
			expect(indexMd, `INDEX.md doit citer \`${pkg}@${version}\``).toContain(`${pkg}@${version}`);
		}
	});

	it("ne cite aucun chemin de fichier inexistant", () => {
		// Le défaut originel : « épinglée (`shared/lib/stripe.ts`) » alors que la SSOT
		// avait déménagé — un chemin qui EXISTE mais ne porte plus la valeur passerait
		// ici ; celui qui n'existe plus du tout est attrapé.
		const paths = Array.from(
			indexMd.matchAll(/`((?:app|modules|shared|test|scripts|docs)\/[\w./-]+\.\w+)`/g),
			(match) => match[1]!,
		);

		expect(paths.length, "aucun chemin détecté — la regex a dû dériver").toBeGreaterThan(10);

		const missing = [...new Set(paths)].filter((path) => !existsSync(join(REPO_ROOT, path)));
		expect(missing, `chemins cités par INDEX.md mais absents :\n${missing.join("\n")}`).toEqual([]);
	});
});

describe.skipIf(!bundlesExist)("bundles sur disque (skippé sans `pnpm docs:stripe`)", () => {
	it("contient exactement les pages du manifeste, bundle par bundle", () => {
		for (const bundle of BUNDLES) {
			const onDisk = sourceUrlsOnDisk(bundle.file);

			expect(
				onDisk.length,
				`${bundle.file} : ${onDisk.length} pages sur disque, ${bundle.pages.length} au manifeste — relancer \`pnpm docs:stripe\``,
			).toBe(bundle.pages.length);

			// Le chemin du manifeste (variante comprise) doit se retrouver dans l'URL.
			for (const [index, entry] of bundle.pages.entries()) {
				const [docPath] = entry.split("?", 1);
				expect(onDisk[index], `${bundle.file} — page ${index + 1}`).toContain(`/${docPath}.md`);
			}
		}
	});

	it("ne stocke AUCUN index de variantes à la place du contenu", () => {
		for (const bundle of BUNDLES) {
			const contents = readFileSync(join(MIRROR_DIR, bundle.file), "utf-8");
			expect(
				contents,
				`${bundle.file} contient un sommaire de variantes au lieu de la doc — ` +
					`désigner la variante voulue dans le manifeste (cf. INDEX.md § pages à variantes)`,
			).not.toContain("This article has multiple variants");
		}
	});

	it("épingle la locale sur chaque page récupérée", () => {
		for (const bundle of BUNDLES) {
			for (const url of sourceUrlsOnDisk(bundle.file)) {
				expect(url, `${bundle.file} — URL sans locale épinglée : ${url}`).toContain("locale=");
			}
		}
	});
});
