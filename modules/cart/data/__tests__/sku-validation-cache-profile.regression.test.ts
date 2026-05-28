import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression sku-validation-cache-profile-2026-05-28
 *
 * Garantit que le JSDoc des fonctions de validation SKU (`fetchSkuForValidation`,
 * `fetchSkusForBatchValidation`, `fetchSkusForCheckoutValidation`) référence
 * **exactement le même profile** que celui appliqué via `cacheLife(...)`.
 *
 * Historique : avant 2026-05-28, le JSDoc annonçait un profile "realtime"
 * (30s stale / 15s revalidate / 1min expire) qui n'existait pas dans
 * `next.config.ts:cacheLife`. L'implémentation utilisait `cacheLife("checkout")`
 * (60s/30s/300s) — divergence silencieuse. Le risque d'overselling est nul
 * grâce au verrou `FOR UPDATE` dans `order-creation.service.ts`, mais
 * l'ambiguïté pouvait mener à un mauvais choix lors d'un futur audit.
 *
 * Cette régression échoue si :
 *  - un commentaire référence "realtime" sans qu'un profile éponyme existe
 *  - le profile mentionné dans le JSDoc diffère de celui appelé via cacheLife()
 */

const REPO_ROOT = process.cwd();
const SOURCE_PATH = join(REPO_ROOT, "modules/cart/data/get-sku-for-validation.ts");
const NEXT_CONFIG_PATH = join(REPO_ROOT, "next.config.ts");

const VALID_PROFILES = ["catalog", "checkout", "user", "reference"] as const;

describe("Cart — SKU validation cache profile alignment", () => {
	const source = readFileSync(SOURCE_PATH, "utf-8");
	const nextConfig = readFileSync(NEXT_CONFIG_PATH, "utf-8");

	it("aucun JSDoc ne référence un profile cacheLife inexistant", () => {
		const referenced = source.match(/`(\w+)` profile/g) ?? [];
		const declaredProfiles = VALID_PROFILES.filter((p) =>
			new RegExp(`${p}\\s*:\\s*\\{`).test(nextConfig),
		);
		for (const ref of referenced) {
			const profile = ref.match(/`(\w+)` profile/)?.[1];
			expect(
				profile,
				`JSDoc mentions \`${profile}\` profile which is not declared in next.config.ts:cacheLife`,
			).toBeDefined();
			expect(declaredProfiles).toContain(profile);
		}
	});

	it("le profile JSDoc correspond au cacheLife() appelé dans la même fonction", () => {
		// Sépare le fichier en blocs JSDoc + fonction (heuristique simple).
		const blocks = source.split(/\n(?=\/\*\*)/);
		for (const block of blocks) {
			const jsdocMatch = block.match(/`(\w+)` profile/);
			const codeMatch = block.match(/cacheLife\("(\w+)"\)/);
			if (!jsdocMatch || !codeMatch) continue;
			const docProfile = jsdocMatch[1];
			const codeProfile = codeMatch[1];
			expect(
				docProfile,
				`JSDoc profile (${docProfile}) must match cacheLife() argument (${codeProfile})`,
			).toBe(codeProfile);
		}
	});
});
