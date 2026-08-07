/**
 * @regression vat-mention-ssot
 *
 * Garde-fou repo-wide : la mention légale de franchise en base de TVA
 * (Art. 293 B CGI) ne s'écrit **nulle part en littéral** — elle vient toujours
 * de `DEFAULT_FRANCHISE_VAT_MENTION` (`shared/constants/vat-franchise.ts`).
 *
 * ## Le bug que ce test verrouille
 *
 * La bascule de la mention CGI → CIBS est promise
 * (ordonnance 2025-1247, tolérance jusqu'au 31/12/2027) « via la variable d'env
 * `VENDOR_VAT_EXEMPTION_TEXT`, override sans déploiement ».
 *
 * Cet override ne touchait en réalité **que le PDF de facture**. Quatre surfaces
 * client portaient la chaîne en dur et seraient restées sur l'ancien article :
 *
 * - `modules/payments/components/checkout-summary.tsx` (récapitulatif paiement) ;
 * - `app/(legal)/mentions-legales/page.tsx` ;
 * - `app/(legal)/cgv/page.tsx` § 3 Prix ;
 * - `emails/_components/email-layout.tsx` — qui avait **déjà** dérivé, écrivant
 *   « article 293 B » là où toutes les autres surfaces écrivent « art. 293 B ».
 *
 * Cette dérive silencieuse est la démonstration du problème : quatre copies
 * d'un même libellé légal divergent sans que rien ne le signale. Audit
 * « Franchise TVA micro-entreprise » 2026-07-27.
 *
 * ## La règle
 *
 * Importer `DEFAULT_FRANCHISE_VAT_MENTION`. Le texte **explicatif** autour de la
 * mention reste libre (« Franchise en base art. 293 B CGI », tooltips, JSDoc,
 * commentaires) : ce test ne vise que la mention elle-même, celle qui doit
 * basculer d'un bloc le jour du passage au CIBS.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_FRANCHISE_VAT_MENTION } from "../vat-franchise";

const REPO_ROOT = join(__dirname, "..", "..", "..");

const SCAN_DIRS = ["app", "modules", "shared", "emails"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__snapshots__"]);

/**
 * Fichiers autorisés à contenir la mention en littéral. Toute addition ici doit
 * être justifiée en commentaire.
 */
const ALLOWLIST = new Set<string>([
	// La SSOT elle-même.
	"shared/constants/vat-franchise.ts",
	// Ce fichier — sa documentation cite le pattern interdit.
	"shared/constants/__tests__/vat-mention-ssot.regression.test.ts",
]);

/**
 * Attrape « TVA non applicable, art. 293 B », « TVA non applicable art 293B »,
 * et la forme longue « article » qui avait dérivé dans l'email. Ne matche PAS
 * une prose qui parle du régime sans réciter la mention (« Franchise en base
 * art. 293 B CGI », « TVA non applicable (art. 293 B du CGI) » en commentaire).
 */
const MENTION_PATTERN = /TVA\s+non\s+applicable\s*,?\s+articles?\.?\s*293/i;

/** Une ligne dont le premier caractère non blanc ouvre un commentaire. */
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/;

function collectFiles(): string[] {
	const files: string[] = [];

	function walk(absDir: string) {
		for (const entry of readdirSync(absDir)) {
			if (SKIP_DIRS.has(entry)) continue;
			const abs = join(absDir, entry);
			if (statSync(abs).isDirectory()) {
				walk(abs);
				continue;
			}
			if (!/\.tsx?$/.test(entry)) continue;
			// Les tests figent légitimement la chaîne attendue en littéral — c'est
			// même leur rôle (`render-invoice-pdf.test.ts` assert le texte imprimé).
			if (/\.(test|spec)\.tsx?$/.test(entry) || entry.endsWith(".d.ts")) continue;
			files.push(relative(REPO_ROOT, abs).split(sep).join("/"));
		}
	}

	for (const dir of SCAN_DIRS) walk(join(REPO_ROOT, dir));
	return files.filter((f) => !ALLOWLIST.has(f)).sort();
}

describe("@regression vat-mention-ssot", () => {
	const sourceFiles = collectFiles();

	it("scans a meaningful number of files", () => {
		// Sanity check : si le walker casse, l'assertion suivante passerait à vide
		// — un garde-fou vert pour la mauvaise raison ne garde rien.
		expect(sourceFiles.length).toBeGreaterThan(500);
		expect(sourceFiles).toContain("modules/payments/components/checkout-summary.tsx");
		expect(sourceFiles).toContain("emails/_components/email-layout.tsx");
	});

	it("n'écrit la mention 293 B nulle part en littéral hors SSOT", () => {
		const offenders: string[] = [];

		for (const relativePath of sourceFiles) {
			const lines = readFileSync(join(REPO_ROOT, relativePath), "utf-8").split("\n");
			lines.forEach((line, index) => {
				if (COMMENT_LINE.test(line)) return;
				if (MENTION_PATTERN.test(line)) {
					offenders.push(`${relativePath}:${index + 1} — ${line.trim()}`);
				}
			});
		}

		expect(
			offenders,
			"Mention de franchise TVA écrite en littéral. Importer " +
				"DEFAULT_FRANCHISE_VAT_MENTION (shared/constants/vat-franchise.ts) : sinon la " +
				"bascule CGI → CIBS (échéance 31/12/2027) laisse cette surface sur l'ancien " +
				"article, comme l'email l'avait déjà fait avec « article » vs « art. ».\n" +
				offenders.join("\n"),
		).toEqual([]);
	});

	it("la SSOT porte bien la forme courte « art. » attendue par les surfaces", () => {
		// Verrouille la forme exacte : c'est elle qui est figée 10 ans dans
		// `invoiceDataSnapshot` (Art. L102 B LPF) et rendue au PDF.
		expect(DEFAULT_FRANCHISE_VAT_MENTION).toBe("TVA non applicable, art. 293 B du CGI");
	});
});
