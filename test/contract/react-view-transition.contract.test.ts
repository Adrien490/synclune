/**
 * `<ViewTransition>` n'existe PAS dans le `react` installé (19.2.x stable) :
 * il vient du React canary que Next vendorise et aliase pour l'App Router
 * (`createVendoredReactAliases`, `next/dist/build/create-compiler-aliases.js`),
 * et son typage vient de `react/canary`, déclaré dans `tsconfig.json`.
 *
 * Autrement dit, les deux frontières `<ViewTransition>` des layouts reposent
 * sur deux dépendances qu'aucun fichier versionné ne nomme. Un bump de `next`
 * qui changerait de canal, ou un retrait de `"types": ["react/canary"]`, les
 * casserait — le second à la compilation, le premier **au rendu seulement**.
 *
 * Ce contrat teste la moitié runtime : le paquet vendoré exporte bien le
 * composant. La moitié typage est tenue par `pnpm typecheck`, qui échoue si
 * `react/canary` disparaît des `types`.
 */

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const require_ = createRequire(import.meta.url);
const REPO_ROOT = join(__dirname, "..", "..");

describe("contract: React ViewTransition", () => {
	it("le React vendoré par Next exporte ViewTransition", () => {
		const vendored = require_("next/dist/compiled/react") as Record<string, unknown>;

		expect(
			"ViewTransition" in vendored,
			"C'est ce build que Next aliase sur `react` dans l'App Router. Sans " +
				"l'export, les frontières des layouts rendent `undefined` — au RUNTIME.",
		).toBe(true);
	});

	it("tsconfig déclare les types canary", () => {
		const tsconfig = readFileSync(join(REPO_ROOT, "tsconfig.json"), "utf-8");

		expect(tsconfig).toMatch(/"types":\s*\[\s*"react\/canary"/);
	});
});
