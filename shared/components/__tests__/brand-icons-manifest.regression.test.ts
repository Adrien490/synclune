import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ICONS_CONFIG } from "@/shared/constants/icons-config";

/**
 * @regression brand-icons-manifest
 *
 * Tous les rasters de marque (favicons PNG, icônes Apple/MS, `favicon.ico`,
 * `logo.png`, splash iOS) sont GÉNÉRÉS depuis la SSOT vectorielle par
 * `scripts/generate-brand-icons.ts`, qui écrit leurs SHA-256 dans
 * `scripts/brand-icons.manifest.json`.
 *
 * Pourquoi ce verrou (audit logo 2026-08-15) : ces fichiers sont invisibles à
 * tout outil — ni typecheck, ni lint, ni rendu de test ne les lit. C'est ainsi
 * que les icônes Apple/MS sont restées figées sur l'ANCIEN raster pendant que
 * le vectoriel évoluait : selon la surface (onglet, écran d'accueil iOS,
 * Google, boîte mail), la marque n'avait pas le même rendu, et personne ne
 * pouvait le voir depuis le code.
 *
 * Deux assertions, complémentaires :
 * 1. chaque asset du manifest existe et son haché correspond — un export
 *    manuel déposé par-dessus (le mode de dérive historique) fait échouer ;
 * 2. tout ce que `ICONS_CONFIG` déclare est couvert par le manifest — une
 *    icône ajoutée à la déclaration sans passer par le script est attrapée.
 *
 * Si ce test échoue après une évolution du mark : relancer
 * `pnpm generate:brand-icons` (qui régénère assets ET manifest), ne JAMAIS
 * retoucher un raster ou le manifest à la main.
 */

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, "scripts/brand-icons.manifest.json");

const manifest: Record<string, string> = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

describe("@regression brand-icons-manifest", () => {
	it("chaque asset généré existe et correspond à son haché", () => {
		const mismatches: string[] = [];
		for (const [rel, sha] of Object.entries(manifest)) {
			const abs = join(ROOT, rel);
			if (!existsSync(abs)) {
				mismatches.push(`${rel} — fichier absent`);
				continue;
			}
			const actual = createHash("sha256").update(readFileSync(abs)).digest("hex");
			if (actual !== sha) mismatches.push(`${rel} — haché divergent (retouche manuelle ?)`);
		}
		expect(mismatches, "Relancer `pnpm generate:brand-icons` — jamais d'export manuel.").toEqual(
			[],
		);
	});

	it("tout ce que ICONS_CONFIG déclare sort du pipeline", () => {
		const icons = ICONS_CONFIG as {
			icon: Array<{ url: string }>;
			apple: Array<{ url: string }>;
			other: Array<{ url: string }>;
		};
		const declaredUrls = [...icons.icon, ...icons.apple, ...icons.other].map(({ url }) => url);

		const uncovered = declaredUrls.filter((url) => !(`public${url}` in manifest));
		expect(uncovered, "Ajouter l'asset à scripts/generate-brand-icons.ts et régénérer.").toEqual(
			[],
		);
	});

	it("couvre aussi les assets hors ICONS_CONFIG : favicon.ico et logo.png", () => {
		// `app/favicon.ico` est injecté par Next hors de `metadata.icons` ;
		// `public/logo.png` est servi aux e-mails et au JSON-LD (`seo-config.ts`).
		expect(manifest).toHaveProperty(["app/favicon.ico"]);
		expect(manifest).toHaveProperty(["public/logo.png"]);
	});
});
