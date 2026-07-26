/**
 * @regression admin-role-db-recheck — aucune confiance directe au rôle du cookie
 *
 * Invariant CLAUDE.md : « Ne JAMAIS faire confiance à `session.user.role` pour un
 * chemin de privilège (cookie-cache Better Auth stale ~5 min). Toujours passer par
 * un helper `requireAdmin*` / `isVerifiedAdmin()` qui re-vérifie en DB. »
 *
 * Bug corrigé : `modules/auth/utils/guards.ts::isAdmin()` retournait
 * `session?.user.role === "ADMIN"` sans re-check DB, et servait de garde unique à
 * ~23 fonctions du data layer admin (liste clients, sessions, tokens de
 * vérification, facturation). Un admin rétrogradé gardait donc l'accès en lecture
 * pendant toute la fenêtre `AUTH_SESSION_CONFIG.cookieCache.maxAge` (5 min) —
 * d'autant que `change-user-role.ts` ne révoque pas les sessions.
 *
 * Ce garde-fou scanne les sources et échoue si une comparaison
 * `<session>.user.role === "ADMIN"` apparaît hors de l'allowlist ci-dessous.
 * Les comparaisons sur le rôle d'un utilisateur *chargé depuis la DB*
 * (`user.role === "ADMIN"`) ne matchent pas : c'est précisément le pattern voulu.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

const SCAN_DIRS = ["app", "modules", "shared"];
const SCAN_FILES = ["proxy.ts"];

const SKIP_DIRS = new Set(["node_modules", "__tests__", "generated", ".next"]);

/**
 * Fichiers autorisés à lire `session.user.role` comme PRÉ-FILTRE.
 * Toute addition ici exige une justification (commentaire obligatoire).
 */
const ALLOWLIST = new Map<string, string>([
	[
		"modules/auth/lib/require-auth.ts",
		"Pré-filtre gratuit (court-circuit) TOUJOURS suivi de fetchUserForAuth() + re-check user.role en DB.",
	],
	[
		"modules/orders/utils/resolve-invoice-admin.ts",
		"Idem : pré-filtre suivi d'un prisma.user.findUnique de confirmation (EINV-SEC-008).",
	],
	[
		"proxy.ts",
		"Pré-filtrage UX du middleware (fail-open assumé, cf. commentaire) ; la garde réelle est app/admin/layout.tsx.",
	],
	[
		"app/(shop)/(home)/_components/navbar/navbar.tsx",
		"Affichage conditionnel d'un lien vers /admin — aucune donnée privilégiée exposée.",
	],
	[
		"shared/components/admin-dashboard-fab.tsx",
		"Affichage conditionnel d'un FAB — aucune donnée privilégiée exposée.",
	],
]);

/**
 * Comparaison du rôle porté par une SESSION (`session.user.role`,
 * `sessionData?.user.role`, …). Volontairement ancré sur `.user.role` pour ne
 * pas matcher un `user.role` issu d'un `prisma.user.findUnique`.
 */
const SESSION_ROLE_COMPARISON = /\.user\.role\s*[!=]==\s*(?:"ADMIN"|'ADMIN'|`ADMIN`|Role\.ADMIN)/;

/**
 * Neutralise les commentaires ligne par ligne (les lignes sont vidées, pas
 * supprimées, pour garder les numéros de ligne exacts).
 *
 * Volontairement line-wise plutôt qu'un `replace` global sur `/*…*\/` : `proxy.ts`
 * contient un `/*` À L'INTÉRIEUR d'un commentaire `//`, ce qui faisait avaler
 * ~110 lignes de code réel à un stripper naïf (et masquait donc des fautifs).
 */
function stripComments(source: string): string {
	return source
		.split("\n")
		.map((line) => {
			const trimmed = line.trimStart();
			// Ligne de commentaire pure, y compris le corps d'un bloc JSDoc.
			if (/^(\/\/|\/\*|\*)/.test(trimmed)) return "";
			// Commentaire de fin de ligne (le `[^:]` évite de couper une URL).
			return line.replace(/(^|[^:])\/\/.*$/, "$1");
		})
		.join("\n");
}

function collectSourceFiles(): string[] {
	const files: string[] = [];

	function walk(absDir: string) {
		for (const entry of readdirSync(absDir)) {
			if (SKIP_DIRS.has(entry)) continue;
			const abs = join(absDir, entry);
			if (statSync(abs).isDirectory()) {
				walk(abs);
				continue;
			}
			if (!/\.tsx?$/.test(entry) || /\.(test|spec)\.tsx?$/.test(entry)) continue;
			if (entry.endsWith(".d.ts")) continue;
			files.push(relative(REPO_ROOT, abs).split(sep).join("/"));
		}
	}

	for (const dir of SCAN_DIRS) walk(join(REPO_ROOT, dir));
	files.push(...SCAN_FILES);

	return files.sort();
}

describe("@regression admin-role-db-recheck", () => {
	const files = collectSourceFiles();

	it("scans a meaningful number of source files", () => {
		// Sanity check : si le walker casse, le test passerait à vide.
		expect(files.length).toBeGreaterThan(500);
	});

	it("no privileged path compares session.user.role to ADMIN outside the allowlist", () => {
		const offenders: string[] = [];

		for (const relativePath of files) {
			const source = stripComments(readFileSync(join(REPO_ROOT, relativePath), "utf-8"));
			if (!SESSION_ROLE_COMPARISON.test(source)) continue;
			if (ALLOWLIST.has(relativePath)) continue;

			const line = source.split("\n").findIndex((l) => SESSION_ROLE_COMPARISON.test(l));
			offenders.push(`${relativePath}:${line + 1}`);
		}

		expect(
			offenders,
			`Ces fichiers font confiance au rôle du cookie de session (stale ~5 min).\n` +
				`Utiliser requireAdmin() / requireAdminWithUser() / requireAdminApiRoute() ` +
				`(Server Actions & routes) ou isVerifiedAdmin(session) / isAdmin() (branche booléenne), ` +
				`qui re-vérifient le rôle en DB.\n` +
				`Si l'usage est purement cosmétique (affichage), l'ajouter à ALLOWLIST avec justification.\n` +
				`Fautifs : ${offenders.join(", ")}`,
		).toEqual([]);
	});

	it("isAdmin() delegates to the DB-verified helper", () => {
		const source = readFileSync(join(REPO_ROOT, "modules/auth/utils/guards.ts"), "utf-8");

		expect(source).toMatch(
			/import\s+\{[^}]*\bisVerifiedAdmin\b[^}]*\}\s+from\s+["']@\/modules\/auth\/lib\/require-auth["']/,
		);
		expect(stripComments(source)).not.toMatch(SESSION_ROLE_COMPARISON);
	});

	describe("allowlist sanity", () => {
		it("every allowlisted file exists and still needs the exemption", () => {
			for (const [relativePath, reason] of ALLOWLIST) {
				const source = stripComments(readFileSync(join(REPO_ROOT, relativePath), "utf-8"));
				expect(
					SESSION_ROLE_COMPARISON.test(source),
					`${relativePath} est allowlisté mais ne lit plus session.user.role — retirer l'entrée. (${reason})`,
				).toBe(true);
			}
		});

		it("the two auth pre-filters still confirm the role against the DB", () => {
			// L'exemption de ces deux fichiers ne tient QUE parce qu'ils re-vérifient
			// derrière. Si la query de confirmation disparaît, l'allowlist ment.
			for (const relativePath of [
				"modules/auth/lib/require-auth.ts",
				"modules/orders/utils/resolve-invoice-admin.ts",
			]) {
				const source = readFileSync(join(REPO_ROOT, relativePath), "utf-8");
				expect(source, `${relativePath} doit confirmer le rôle en DB`).toMatch(
					/prisma\.user\.findUnique/,
				);
				expect(source).toMatch(/\buser\??\.role\s*[!=]==\s*"ADMIN"/);
			}
		});
	});
});
