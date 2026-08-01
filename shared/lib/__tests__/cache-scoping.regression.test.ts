import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression cache-user-scoping-2026-07-03
 *
 * Généralise `modules/cart/data/__tests__/sku-validation-cache-profile.regression.test.ts`
 * (limité à un seul fichier) à TOUS les fichiers source de `modules/`, `shared/` et `app/`
 * (hors tests). Verrouille six invariants du système de cache
 * (audits « cache utilisateur et checkout » 2026-07-03 + « usage cache Next.js » 2026-07-06) :
 *
 * 1. Tout `cacheLife("X")` référence un profile déclaré dans `next.config.ts:cacheLife`.
 * 2. Aucun JSDoc/commentaire ne mentionne un profile inexistant (historique : profile
 *    « realtime » fantôme dans get-sku-for-validation.ts puis get-order-for-confirmation.ts).
 * 3. Toute fonction cachée dont la signature porte l'identité (`userId`/`sessionId`)
 *    utilise `"use cache: private"` — jamais `"use cache"` public. Une fonction publique
 *    avec l'identité en argument servirait des données personnelles depuis le cache
 *    partagé : fuite cross-user potentielle (P0).
 * 4. Tout fichier contenant une directive `"use cache"` pose un tag : appel `cacheTag(`
 *    direct OU import d'un helper de module `cacheXxx()` (convention `constants/cache` /
 *    `utils/cache` / `shared/lib/cache`). Une entrée sans tag est non invalidable.
 * 5. Aucun appel à `cacheDashboard()` sans argument : c'est le seul helper à tag
 *    optionnel — sans tag l'entrée est non invalidable (historique : get-account.ts).
 * 6. Aucune résolution d'identité DANS un corps caché : `cookies()`, `headers()`,
 *    `getSession()`, `getCurrentSession()`, `isAdmin()` sont incompatibles avec
 *    `"use cache"` — le wrapper pattern (identité résolue hors cache, passée en
 *    argument) est obligatoire.
 *
 * Si le check 3 casse sur un nouveau fetcher : soit le passer en `"use cache: private"`
 * (cas normal pour des données user-scoped), soit — si la donnée n'est réellement pas
 * personnelle — renommer le paramètre pour refléter sa nature (pas un identifiant user).
 */

const REPO_ROOT = process.cwd();
const NEXT_CONFIG_PATH = join(REPO_ROOT, "next.config.ts");

/**
 * Fonctions cachées qui portent l'identité en ARGUMENT et restent volontairement
 * en `"use cache"` public (audit « usage correct du cache Next.js » 2026-07-31).
 *
 * Toute entrée ajoutée ici doit répondre OUI à : « la valeur retournée serait-elle
 * publiable telle quelle ? ». L'identité sert à CHOISIR la donnée, pas à la
 * qualifier de personnelle.
 */
const PUBLIC_IDENTITY_SCOPED_CACHES = new Set<string>([
	// Retourne des `ProductCarouselItem` — du catalogue public. `userId` ne sert
	// qu'à choisir quels bijoux montrer ; l'historique lui-même n'est pas renvoyé.
	"fetchPersonalizedRelatedProducts",
]);

function collectDataFiles(dir: string, acc: string[] = []): string[] {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return acc;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "__tests__" || entry === "node_modules") continue;
			collectDataFiles(full, acc);
		} else if (
			(entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
			!entry.endsWith(".test.ts") &&
			!entry.endsWith(".test.tsx")
		) {
			acc.push(full);
		}
	}
	return acc;
}

function getSourceFiles(): string[] {
	const roots = [join(REPO_ROOT, "modules"), join(REPO_ROOT, "shared"), join(REPO_ROOT, "app")];
	const files: string[] = [];
	for (const root of roots) {
		collectDataFiles(root, files);
	}
	return files;
}

function getDeclaredProfiles(): string[] {
	const nextConfig = readFileSync(NEXT_CONFIG_PATH, "utf-8");
	const block = nextConfig.match(/cacheLife:\s*\{([\s\S]*?)\n\t\}/)?.[1];
	expect(block, "next.config.ts must declare a cacheLife block").toBeDefined();
	return [...(block as string).matchAll(/(\w+):\s*\{/g)].map((m) => m[1] as string);
}

/**
 * Retire les commentaires (bloc + ligne) : une directive `"use cache"` citée dans
 * un exemple JSDoc (ex. get-current-session.ts) ne doit pas déclencher les checks.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * Extrait le corps de la fonction cachée à partir de la position de la directive
 * `"use cache"` (premier statement du corps → profondeur 1 à la directive), par
 * équilibrage d'accolades — même technique que order-status-invalidation.
 * Heuristique source-level : un `{`/`}` dans un template literal fausse le compte,
 * acceptable pour ce scan.
 */
function extractCachedBody(source: string, directiveIndex: number): string {
	let depth = 1;
	for (let i = directiveIndex; i < source.length; i++) {
		const char = source[i];
		if (char === "{") depth++;
		else if (char === "}") {
			depth--;
			if (depth === 0) return source.slice(directiveIndex, i);
		}
	}
	return source.slice(directiveIndex);
}

describe("Cache — scoping et profiles sur modules/ + shared/ + app/", () => {
	const dataFiles = getSourceFiles();
	const declaredProfiles = getDeclaredProfiles();

	it("trouve les fichiers source et les profiles déclarés (sanity)", () => {
		expect(dataFiles.length).toBeGreaterThan(50);
		expect(dataFiles.some((f) => f.includes(`${join(REPO_ROOT, "app")}`))).toBe(true);
		expect(declaredProfiles).toEqual(
			expect.arrayContaining(["catalog", "checkout", "reference", "user"]),
		);
	});

	it("tout cacheLife() référence un profile déclaré dans next.config.ts", () => {
		for (const file of dataFiles) {
			const source = readFileSync(file, "utf-8");
			for (const match of source.matchAll(/cacheLife\("(\w+)"\)/g)) {
				expect(
					declaredProfiles,
					`${file} calls cacheLife("${match[1]}") but this profile is not declared in next.config.ts`,
				).toContain(match[1]);
			}
		}
	});

	it("aucun JSDoc/commentaire ne mentionne un profile cacheLife inexistant", () => {
		for (const file of dataFiles) {
			const source = readFileSync(file, "utf-8");
			const mentions = [
				...source.matchAll(/`(\w+)` profile/gi),
				...source.matchAll(/[Pp]rofile?s? `(\w+)`/g),
				...source.matchAll(/[Pp]rofil `(\w+)`/g),
			];
			for (const mention of mentions) {
				expect(
					declaredProfiles,
					`${file} mentions profile \`${mention[1]}\` in a comment but it is not declared in next.config.ts (phantom profile)`,
				).toContain(mention[1]);
			}
		}
	});

	it('toute fonction cachée avec userId/sessionId en paramètre est "use cache: private" OU explicitement allowlistée', () => {
		const offenders: string[] = [];
		for (const file of dataFiles) {
			const source = readFileSync(file, "utf-8");
			const cachedFns = source.matchAll(
				/async function (\w+)\s*\(([^)]*)\)[^{]*\{\s*"use cache(: private)?";/g,
			);
			for (const fn of cachedFns) {
				const [, name, params, privateSuffix] = fn;
				const carriesIdentity = /\buserId\b|\bsessionId\b/.test(params ?? "");
				if (!carriesIdentity || privateSuffix) continue;
				if (PUBLIC_IDENTITY_SCOPED_CACHES.has(name as string)) continue;
				offenders.push(`${file} -> ${name}(${(params ?? "").trim()})`);
			}
		}
		expect(
			offenders,
			`Ces fonctions cachées portent l'identité en argument et utilisent "use cache" public sans être allowlistées.\n` +
				`Ce n'est PAS un risque de fuite (les arguments sont la clé de cache), c'est une décision de confidentialité : ` +
				`la donnée retournée est-elle personnelle ? Si oui → "use cache: private". Si non (catalogue, agrégat, compteur) → ` +
				`ajoute la fonction à PUBLIC_IDENTITY_SCOPED_CACHES avec sa justification.\n${offenders.join("\n")}`,
		).toEqual([]);
	});

	it("l'allowlist publique ne contient que des fonctions réellement `use cache` public (contre-épreuve)", () => {
		// Sans ça, une entrée d'allowlist devenue obsolète (fonction repassée en
		// `private`, ou supprimée) resterait à couvrir un cas qui n'existe plus, et
		// masquerait silencieusement la prochaine vraie violation portant le même nom.
		const publicIdentityFns = new Set<string>();
		for (const file of dataFiles) {
			const source = readFileSync(file, "utf-8");
			for (const fn of source.matchAll(
				/async function (\w+)\s*\(([^)]*)\)[^{]*\{\s*"use cache(: private)?";/g,
			)) {
				const [, name, params, privateSuffix] = fn;
				if (privateSuffix) continue;
				if (!/\buserId\b|\bsessionId\b/.test(params ?? "")) continue;
				publicIdentityFns.add(name as string);
			}
		}

		const stale = [...PUBLIC_IDENTITY_SCOPED_CACHES].filter((name) => !publicIdentityFns.has(name));

		expect(
			stale,
			`Entrées d'allowlist obsolètes (ces fonctions ne sont plus des caches publics avec identité en argument) : ${stale.join(", ")}`,
		).toEqual([]);
	});

	it('tout fichier avec une directive "use cache" pose un tag (cacheTag direct ou helper cacheXxx)', () => {
		const offenders: string[] = [];
		for (const file of dataFiles) {
			const source = stripComments(readFileSync(file, "utf-8"));
			if (!/"use cache(: private)?";/.test(source)) continue;

			const callsCacheTag = /\bcacheTag\(/.test(source);
			// Helpers de module (cacheProducts, cacheDashboard(tag), cacheCart, …)
			// importés depuis constants/cache, utils/cache ou shared/lib/cache.
			const importsCacheHelper = /import\s*(?:type\s*)?\{[^}]*\bcache[A-Z]\w*/.test(source);
			if (!callsCacheTag && !importsCacheHelper) {
				offenders.push(file);
			}
		}
		expect(
			offenders,
			`Ces fichiers contiennent une directive "use cache" mais ne posent aucun tag (ni cacheTag() direct, ni helper cacheXxx importé) — entrées non invalidables :\n${offenders.join("\n")}`,
		).toEqual([]);
	});

	it("aucun cacheDashboard() appelé sans tag (entrée non invalidable)", () => {
		const offenders: string[] = [];
		for (const file of dataFiles) {
			const source = readFileSync(file, "utf-8");
			// Exclure la définition du helper lui-même (paramètre optionnel légitime)
			if (file.endsWith(join("shared", "lib", "cache.ts"))) continue;
			for (const match of source.matchAll(/cacheDashboard\(\s*\)/g)) {
				const line = source.slice(0, match.index).split("\n").length;
				offenders.push(`${file}:${line}`);
			}
		}
		expect(
			offenders,
			`cacheDashboard() appelé sans argument : l'entrée cachée n'a aucun tag et devient non invalidable. Passer un tag SSOT :\n${offenders.join("\n")}`,
		).toEqual([]);
	});

	it("aucune résolution d'identité (cookies/headers/getSession) dans un corps caché", () => {
		// `await` requis : évite les faux positifs sur la prose (« cookies (traceurs) »
		// des pages légales) — les APIs identité sont toutes async.
		const FORBIDDEN_IN_CACHED_BODY =
			/\bawait\s+(cookies|headers|getSession|getCurrentSession|isAdmin)\s*\(/g;
		const offenders: string[] = [];
		for (const file of dataFiles) {
			const source = stripComments(readFileSync(file, "utf-8"));
			for (const directive of source.matchAll(/"use cache(: private)?";/g)) {
				const body = extractCachedBody(source, directive.index + directive[0].length);
				for (const forbidden of body.matchAll(FORBIDDEN_IN_CACHED_BODY)) {
					offenders.push(`${file} -> await ${forbidden[1]}()`);
				}
			}
		}
		expect(
			offenders,
			`Résolution d'identité DANS un corps "use cache" (incompatible — wrapper pattern obligatoire : résoudre hors cache et passer en argument) :\n${offenders.join("\n")}`,
		).toEqual([]);
	});
});
