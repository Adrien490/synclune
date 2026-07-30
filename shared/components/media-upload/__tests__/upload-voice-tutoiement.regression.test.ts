import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression upload-voice-tutoiement-2026-07-30
 *
 * Les surfaces d'upload mélangeaient tutoiement et vouvoiement, et plusieurs
 * paires étaient **co-visibles** :
 *
 *  - la zone de dépôt disait « Glissez vos fichiers ou cliquez » juste au-dessus
 *    d'un hint qui, lui, tutoyait ;
 *  - l'action sheet mobile proposait « Choisir un cliché de **votre** galerie » et
 *    « Depuis **vos** dossiers personnels » ;
 *  - la carte Médias annonçait « **Confiez** jusqu'à 6 médias de **votre** bijou »
 *    puis « **Glissez-déposez** pour réorganiser » ;
 *  - la confirmation de suppression demandait « **Êtes-vous** sûr… ».
 *
 * Convention repo : tutoiement (cf. CLAUDE.md § Conventions → Voix).
 *
 * Même forme que `modules/payments/__tests__/checkout-voice-tutoiement.regression.test.ts`,
 * mais **sans allowlist** : contrairement au tunnel de paiement, aucune copie de
 * cette surface n'est produite par un tiers (Stripe y renvoie ses propres messages
 * vouvoyants ; UploadThing, non — nos middlewares écrivent les leurs).
 *
 * Périmètre volontairement hors libellés de rate limit partagés (cf. KI-003), qui
 * relèvent d'une passe transverse.
 */

const REPO_ROOT = process.cwd();

const SCANNED_DIRS = ["shared/components/media-upload", "modules/media/components/admin"];
const SCANNED_FILES = [
	"modules/products/components/admin/product-media-card-shared.tsx",
	"modules/products/components/admin/shared/media-array-card.tsx",
	"modules/products/hooks/use-media-field-upload.ts",
	"modules/media/hooks/use-media-upload.ts",
	"modules/media/utils/upload-helpers.ts",
];

/** `vous` / `votre` / `vos` en mot entier, insensible à la casse. */
const VOUVOIEMENT = /\b(vous|votre|vos)\b/i;

/**
 * Terminaison de 2ᵉ personne du pluriel.
 *
 * ⚠️ **Détection par terminaison, pas par énumération.** La première version de ce
 * test listait les verbes un par un (`glissez|cliquez|relâchez|confiez|…`) et
 * passait au VERT en laissant filer « Utilisez les flèches pour déplacer » et
 * « Réorganisez d'abord » — simplement parce que `utilisez` et `réorganisez`
 * n'étaient pas dans la liste. Un garde-fou dont la couverture dépend de
 * l'exhaustivité d'une liste écrite à la main ne garde rien.
 *
 * En français d'interface, un mot en `-ez` est quasi toujours un verbe vouvoyant ;
 * les rares exceptions sont allowlistées.
 */
const IMPERATIF_PLURIEL = /\b\w{3,}ez\b/i;

/** Mots en `-ez` qui ne sont pas des verbes de 2ᵉ personne du pluriel. */
const NOT_VOUVOIEMENT = new Set(["chez", "assez", "aisez"]);

/** Vrai si la ligne contient du vouvoiement (pronom, possessif ou verbe en `-ez`). */
function hasVouvoiement(line: string): boolean {
	if (VOUVOIEMENT.test(line)) return true;
	for (const match of line.matchAll(/\b\w{3,}ez\b/gi)) {
		if (!NOT_VOUVOIEMENT.has(match[0].toLowerCase())) return true;
	}
	return false;
}

function collectSourceFiles(relativeDir: string): string[] {
	const absolute = join(REPO_ROOT, relativeDir);
	const found: string[] = [];

	for (const entry of readdirSync(absolute, { withFileTypes: true })) {
		if (entry.name === "__tests__" || entry.name === "node_modules") continue;
		const relativePath = join(relativeDir, entry.name);
		if (entry.isDirectory()) {
			found.push(...collectSourceFiles(relativePath));
		} else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
			found.push(relativePath);
		}
	}

	return found;
}

/**
 * Vrai si la ligne est une ligne de COMMENTAIRE. Les docblocks de cette surface
 * citent les anciennes formulations vouvoyantes pour expliquer ce qui a été
 * corrigé : sans ce filtre le test échouerait sur cette prose, pas sur la copie.
 *
 * ⚠️ **Filtrage ligne à ligne, JAMAIS un stripper `/\*…\*\/` global.** La première
 * version de ce test faisait
 * `source.replace(/\/\*[\s\S]*?\*\//g, "")` : sur `media-upload-grid.tsx` cette
 * seule règle **avalait 245 des 428 lignes** — dont
 * « Utilisez les flèches pour déplacer » et « Réorganisez d'abord », qui sont
 * passées au vert alors qu'elles étaient bien présentes. Un `/*` de commentaire JSX
 * non apparié par la règle précédente fait matcher jusqu'au `*\/` suivant, très
 * loin en dessous, et emporte tout le code intermédiaire.
 *
 * Un filtre par ligne ne peut jamais supprimer du contenu qui n'est pas un
 * commentaire — c'est la propriété qui manquait.
 */
function isCommentLine(line: string): boolean {
	const trimmed = line.trimStart();
	return (
		trimmed.startsWith("//") ||
		trimmed.startsWith("*") ||
		trimmed.startsWith("/*") ||
		trimmed.startsWith("{/*")
	);
}

const FILES = [...SCANNED_DIRS.flatMap(collectSourceFiles), ...SCANNED_FILES];

describe("Upload — voix unique (tutoiement)", () => {
	it("scanne bien les surfaces attendues", () => {
		// Un périmètre qui se vide (fichier renommé, dossier déplacé) ferait passer ce
		// test à vide sans que rien ne le signale.
		expect(FILES.length).toBeGreaterThanOrEqual(10);
		expect(FILES).toContain(join("shared/components/media-upload", "native-dropzone.tsx"));
		expect(FILES).toContain(join("shared/components/media-upload", "upload-action-sheet.tsx"));
	});

	it("le filtre de commentaires ne mange aucune ligne de copie", () => {
		// ⚠️ Garde-fou du garde-fou, sur le PLUS GROS fichier de la surface — la
		// version précédente ne vérifiait que `native-dropzone.tsx` (144 lignes), où
		// le stripper défectueux fonctionnait par chance. Sur ce fichier-ci il
		// détruisait 57 % des lignes en silence.
		const source = readFileSync(
			join(REPO_ROOT, "shared/components/media-upload/media-upload-grid.tsx"),
			"utf-8",
		);
		const lines = source.split("\n");
		const kept = lines.filter((line) => !isCommentLine(line));

		// Les commentaires sont bien écartés…
		expect(lines.some((l) => l.trimStart().startsWith("//"))).toBe(true);
		expect(kept.some((l) => l.trimStart().startsWith("//"))).toBe(false);
		// …mais la très grande majorité du fichier reste analysée.
		expect(kept.length).toBeGreaterThan(lines.length * 0.75);
		// …et la copie affichée survit, y compris celle qui vouvoyait.
		expect(kept.join("\n")).toContain("setAnnouncement");
	});

	it("détecte un impératif pluriel absent de toute liste écrite à la main", () => {
		// Contre-épreuve intégrée : ces deux verbes manquaient à la première version du
		// test, qui énumérait les formes. Ils doivent être détectés par la TERMINAISON.
		expect(IMPERATIF_PLURIEL.test("Utilisez les flèches pour déplacer.")).toBe(true);
		expect(IMPERATIF_PLURIEL.test("Réorganisez d'abord.")).toBe(true);
		// …et les faux amis, non.
		for (const word of NOT_VOUVOIEMENT) {
			expect(hasVouvoiement(word)).toBe(false);
		}
	});

	it.each(FILES)("%s ne vouvoie pas", (relativePath) => {
		const offending = readFileSync(join(REPO_ROOT, relativePath), "utf-8")
			.split("\n")
			.map((line, index) => ({ line: line.trim(), number: index + 1 }))
			.filter(({ line }) => !isCommentLine(line) && hasVouvoiement(line));

		expect(
			offending.map(({ number, line }) => `L${number}: ${line}`),
			`Vouvoiement détecté dans ${relativePath}`,
		).toEqual([]);
	});
});
