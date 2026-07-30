import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression checkout-voice-tutoiement-2026-07-26
 *
 * Le tunnel de paiement mélangeait tutoiement et vouvoiement, et deux paires
 * étaient **co-visibles à l'écran** :
 *
 *  - hors ligne → Alert « Vérifi**ez votre** connexion internet… » empilée
 *    au-dessus du hint « Vérifi**e ta** connexion internet… » sous le CTA ;
 *  - résumé → titre visible « **Ta** commande » au-dessus d'un tooltip
 *    « …facturée sur **vos** commandes ».
 *
 * Convention repo : tutoiement (cf. CLAUDE.md § Conventions).
 *
 * EXCEPTION ALLOWLISTÉE — `mapStripeErrorMessage` affiche `error.message`, copie
 * produite par Stripe en `locale: "fr"` donc vouvoyante (« Votre carte a été
 * refusée. »). Elle porte le MOTIF du refus et n'est pas réécrivable ; seuls nos
 * propres fallbacks tutoient. Le fichier est donc scanné hors de ses commentaires,
 * qui documentent l'exception.
 *
 * Périmètre volontairement limité au tunnel : les libellés de rate limit
 * (« Trop de tentatives. Veuillez réessayer plus tard. ») sont partagés avec
 * `discounts` sur une vingtaine de fichiers et relèvent d'une passe transverse.
 *
 * Audit UI/UX paiement 2026-07-26, F7.
 */

const REPO_ROOT = process.cwd();

const SCANNED_DIRS = ["modules/payments/components", "app/paiement"];
const SCANNED_FILES = ["modules/payments/hooks/use-checkout-submit.ts"];

/** `vous` / `votre` / `vos` en mot entier, insensible à la casse. */
const VOUVOIEMENT = /\b(vous|votre|vos)\b/i;

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
 * Retire les commentaires AVANT la recherche. Sans ça, le test échouerait sur la
 * prose des docblocks (dont celui qui documente l'exception Stripe) plutôt que
 * sur de la copie réellement affichée.
 */
function stripComments(source: string): string {
	return source
		.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, "");
}

const FILES = [...SCANNED_DIRS.flatMap(collectSourceFiles), ...SCANNED_FILES];

describe("Checkout — voix unique (tutoiement)", () => {
	it("le scan couvre bien les fichiers attendus (garde-fou du garde-fou)", () => {
		expect(FILES.length).toBeGreaterThanOrEqual(15);
		expect(FILES).toContain(join("modules/payments/components", "checkout-summary.tsx"));
		expect(FILES).toContain(join("modules/payments/components", "checkout-form-body.tsx"));
		expect(FILES).toContain(join("modules/payments/components", "checkout-contact-section.tsx"));
		expect(FILES).toContain("modules/payments/hooks/use-checkout-submit.ts");
	});

	it("le regex de détection mord réellement (garde-fou du garde-fou)", () => {
		expect(VOUVOIEMENT.test("Vérifiez votre connexion")).toBe(true);
		expect(VOUVOIEMENT.test("Connectez-vous pour accéder à vos adresses")).toBe(true);
		// Pas de faux positif sur un mot qui contient la sous-chaîne.
		expect(VOUVOIEMENT.test("Nous avons envoyé un e-mail")).toBe(false);
	});

	it("aucune copie vouvoyante ne subsiste dans le tunnel", () => {
		const offenders: string[] = [];

		for (const file of FILES) {
			const stripped = stripComments(readFileSync(join(REPO_ROOT, file), "utf-8"));

			for (const [index, line] of stripped.split("\n").entries()) {
				if (VOUVOIEMENT.test(line)) {
					offenders.push(`${file}:${index + 1} — ${line.trim()}`);
				}
			}
		}

		expect(offenders).toEqual([]);
	});

	it("l'exception Stripe reste documentée au point d'affichage", () => {
		// Si quelqu'un supprime le docblock, le prochain audit re-signalera la
		// vouvoiement de Stripe comme un défaut. On verrouille la trace.
		const source = readFileSync(
			join(REPO_ROOT, "modules/payments/hooks/use-checkout-submit.ts"),
			"utf-8",
		);
		expect(source).toMatch(/EXCEPTION DE VOIX ASSUM/);
		expect(source).toMatch(/locale: "fr"/);
	});
});
