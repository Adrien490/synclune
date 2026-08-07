import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

/**
 * Contrat : les règles du React Compiler restent actives sur le code applicatif.
 *
 * `eslint.config.mjs` ne mentionne JAMAIS `react-hooks`. Les 16 règles arrivent
 * par `...nextConfig` : `eslint-config-next` étale le preset `recommended` de
 * `eslint-plugin-react-hooks` v7, qui embarque — contrairement à la v6 — les 14
 * règles issues du compilateur (pureté, immutabilité, refs, set-state-in-render…).
 *
 * Cet héritage est INVISIBLE dans la config du dépôt : un bump d'`eslint-config-next`
 * qui changerait de preset, ou un retour à un plugin v6, retirerait ces règles sans
 * qu'aucun fichier versionné ne bouge et sans qu'aucun test ne rougisse. C'est
 * exactement le trou que ce contrat ferme.
 *
 * Alternative écartée : déclarer `eslint-plugin-react-hooks` en devDep directe et
 * appliquer `configs["recommended-latest"]` explicitement. Le seul gain de règle
 * serait `void-use-memo` (inutile ici : le dépôt a zéro `useMemo`), au prix d'une
 * ré-résolution du lockfile sous `minimumReleaseAge` — cf. l'incident où un
 * `pnpm add` en période de quarantaine a effacé les 8 `@next/swc-*`.
 */

const REPO_ROOT = process.cwd();

// Fichier témoin : un composant client réel, pour que la config résolue soit celle
// qui s'applique vraiment au code React du dépôt (et pas celle des tests ou d'e2e).
const WITNESS_FILE = "shared/components/ui/carousel.tsx";

/** Règles du compilateur qui DOIVENT être bloquantes. */
const COMPILER_RULES_AS_ERROR = [
	"react-hooks/config",
	"react-hooks/error-boundaries",
	"react-hooks/gating",
	"react-hooks/globals",
	"react-hooks/immutability",
	"react-hooks/preserve-manual-memoization",
	"react-hooks/purity",
	"react-hooks/refs",
	"react-hooks/set-state-in-effect",
	"react-hooks/set-state-in-render",
	"react-hooks/static-components",
	"react-hooks/use-memo",
	// Pas une règle du compilateur, mais le socle sans lequel il ne peut rien.
	"react-hooks/rules-of-hooks",
] as const;

/**
 * Règles laissées en `warn` par le preset amont. Elles sont bloquantes malgré tout
 * grâce au `--max-warnings=0` de `pnpm lint` — assertion plus bas, sans quoi
 * `unsupported-syntax` (les bail-outs du compilateur : `try/finally`, `??=`…)
 * n'arrêterait aucune PR.
 */
const COMPILER_RULES_AS_WARNING = [
	"react-hooks/exhaustive-deps",
	"react-hooks/incompatible-library",
	"react-hooks/unsupported-syntax",
] as const;

function severityOf(value: unknown): number | string | undefined {
	return Array.isArray(value) ? (value[0] as number | string) : (value as number | string);
}

describe("Contrat — règles React Compiler actives dans ESLint", () => {
	const configPromise = new ESLint().calculateConfigForFile(WITNESS_FILE);

	it.for(COMPILER_RULES_AS_ERROR)("%s est bloquante", async (rule) => {
		const config = await configPromise;
		expect(severityOf(config.rules?.[rule])).toBeOneOf([2, "error"]);
	});

	it.for(COMPILER_RULES_AS_WARNING)("%s est active (au moins en warning)", async (rule) => {
		const config = await configPromise;
		expect(severityOf(config.rules?.[rule])).toBeOneOf([1, "warn", 2, "error"]);
	});

	it("`pnpm lint` refuse les warnings, ce qui rend les 3 règles ci-dessus bloquantes", () => {
		const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf-8")) as {
			scripts: Record<string, string>;
		};

		expect(pkg.scripts.lint).toContain("--max-warnings=0");
	});
});
