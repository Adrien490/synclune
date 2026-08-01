/**
 * @regression admin-role-db-recheck — aucune confiance directe au rôle du cookie
 *
 * Invariant CLAUDE.md : « Ne JAMAIS faire confiance à `session.user.role` pour un
 * chemin de privilège (cookie-cache Better Auth stale ~5 min). Toujours passer par
 * un helper `requireAdmin*` / `isVerifiedAdmin()` qui re-vérifie en DB. »
 *
 * Bug corrigé (2026-07-26) : `modules/auth/utils/guards.ts::isAdmin()` retournait
 * `session?.user.role === "ADMIN"` sans re-check DB, et servait de garde unique à
 * ~23 fonctions du data layer admin. Un admin rétrogradé gardait donc l'accès en
 * lecture pendant toute la fenêtre `AUTH_SESSION_CONFIG.cookieCache.maxAge`.
 *
 * Deuxième bug, même famille (2026-07-31) : `modules/orders/utils/resolve-invoice-admin.ts`
 * re-vérifiait bien en base, mais avec SA PROPRE query, qui ne filtrait que
 * `deletedAt` + `role`. Un admin *suspendu* y gardait le bypass d'ownership sur les
 * PDF facture/avoir (PII client) et le quota 200/h. Le fichier est supprimé : les
 * 3 routes appellent `isVerifiedAdmin()` directement, et la dernière assertion de ce
 * fichier interdit désormais toute nouvelle copie de ce check hors couche auth.
 *
 * Ce garde-fou scanne les sources et échoue si une comparaison
 * `<session>.user.role === "ADMIN"` apparaît hors de l'allowlist ci-dessous.
 * Les comparaisons sur le rôle d'un utilisateur *chargé depuis la DB*
 * (`user.role === "ADMIN"`) ne matchent pas : c'est précisément le pattern voulu.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

const SCAN_DIRS = ["app", "modules", "shared"];
// Fichiers racine hors `SCAN_DIRS` qui s'exécutent côté serveur et pourraient
// donc porter une décision de privilège.
const SCAN_FILES = ["proxy.ts", "instrumentation.ts"];

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

const ADMIN_LITERAL = `(?:"ADMIN"|'ADMIN'|\`ADMIN\`|Role\\.ADMIN)`;

/**
 * Comparaison du rôle porté par une SESSION (`session.user.role`,
 * `sessionData?.user.role`, …). Volontairement ancré sur `.user`+`.role` pour ne
 * pas matcher un `user.role` issu d'un `prisma.user.findUnique` — c'est
 * précisément le pattern qu'on VEUT.
 *
 * `\??` des deux côtés et `[!=]==?` : l'optional chaining (`session?.user?.role`)
 * et l'égalité lâche (`==`) échappaient à la version d'origine. Aucun des deux
 * n'était présent dans le code — mais un simple reformatage suffisait à rendre
 * ce garde-fou aveugle, ce qui est la pire propriété pour un garde-fou.
 */
const SESSION_ROLE_COMPARISON = new RegExp(`\\.user\\??\\.role\\s*[!=]==?\\s*${ADMIN_LITERAL}`);

/**
 * Le rôle de session extrait AVANT d'être comparé — destructuration ou variable
 * intermédiaire. `const { role } = session.user` puis `role === "ADMIN"` passe
 * sous le nez de la regex ci-dessus, alors que c'est exactement la même faute.
 *
 * On refuse l'extraction elle-même plutôt que la comparaison qui suit : elle est
 * plus facile à reconnaître, et il n'existe aucune raison légitime de sortir le
 * rôle d'une session dans une variable (les usages cosmétiques allowlistés
 * comparent en place).
 */
const SESSION_ROLE_EXTRACTION = new RegExp(
	[
		// const { role } = session.user   /   const { role, id } = ctx?.user
		`(?:const|let|var)\\s*\\{[^}]*\\brole\\b[^}]*\\}\\s*=\\s*[A-Za-z_$][\\w$]*\\??\\.user\\b`,
		// const role = session.user.role
		//
		// ⚠️ Le lookahead exclut `const x = session.user.role === "ADMIN"` — une
		// comparaison EN PLACE affectée à un booléen, que l'assertion précédente
		// couvre déjà (c'est le cas de `navbar.tsx`). L'espace est DANS le
		// lookahead, pas devant : `\s*(?!…)` ne filtrerait rien, le moteur
		// backtrackant sur zéro espace pour satisfaire un lookahead évalué face à
		// une espace.
		`(?:const|let|var)\\s+[A-Za-z_$][\\w$]*\\s*=\\s*[A-Za-z_$][\\w$]*\\??\\.user\\??\\.role\\b(?!\\s*[!=]==?)`,
	].join("|"),
);

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
	files.push(...SCAN_FILES.filter((f) => existsSync(join(REPO_ROOT, f))));

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

	it("no file extracts the session role into a variable before comparing it", () => {
		const offenders: string[] = [];

		for (const relativePath of files) {
			const source = stripComments(readFileSync(join(REPO_ROOT, relativePath), "utf-8"));
			if (!SESSION_ROLE_EXTRACTION.test(source)) continue;
			// Pas d'exemption d'allowlist ici : même les usages cosmétiques comparent
			// en place (`session?.user.role === "ADMIN"`), aucun n'a besoin d'extraire.
			const line = source.split("\n").findIndex((l) => SESSION_ROLE_EXTRACTION.test(l));
			offenders.push(`${relativePath}:${line + 1}`);
		}

		expect(
			offenders,
			`Ces fichiers sortent le rôle d'une session dans une variable — la comparaison qui suit ` +
				`échappe alors au scan de l'assertion précédente, alors que c'est la même faute.\n` +
				`Comparer en place, ou mieux : appeler un helper qui re-vérifie en base.\n` +
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

		it("the auth pre-filter still confirms the role AND the account status against the DB", () => {
			// L'exemption de `require-auth.ts` ne tient QUE parce qu'il re-vérifie
			// derrière. Et la re-vérification ne vaut que si elle couvre le STATUT DE
			// COMPTE : `resolve-invoice-admin.ts` (supprimé, audit 2026-07-31) ne
			// filtrait que `deletedAt` + `role`, donc un admin *suspendu* gardait le
			// bypass d'ownership sur les PDF facture/avoir. Cette même assertion
			// l'exemptait, parce qu'elle ne vérifiait que la PRÉSENCE d'un findUnique.
			const source = readFileSync(join(REPO_ROOT, "modules/auth/lib/require-auth.ts"), "utf-8");

			expect(source, "require-auth.ts doit confirmer le rôle en DB").toMatch(
				/prisma\.user\.findUnique/,
			);
			expect(source).toMatch(/\buser\??\.role\s*[!=]==\s*"ADMIN"/);
			expect(source, "la query de confirmation doit filtrer suspendedAt").toMatch(
				/suspendedAt:\s*null/,
			);
			expect(source, "la query de confirmation doit filtrer accountStatus").toMatch(
				/accountStatus:\s*\{\s*in:/,
			);
			// Une seule query utilisateur dans le fichier ⇒ tous les helpers passent par
			// `fetchUserForAuth`. Une deuxième signifierait un chemin qui contourne le
			// filtre ci-dessus.
			expect(
				source.match(/prisma\.user\.findUnique/g)?.length,
				"une seule query utilisateur (fetchUserForAuth) doit exister dans require-auth.ts",
			).toBe(1);
		});
	});

	/**
	 * Généralisation du défaut ci-dessus : plus aucun fichier ne doit ré-implémenter
	 * « je relis l'utilisateur en base pour décider s'il est admin ». C'est exactement
	 * ce que faisait `resolve-invoice-admin.ts`, et sa copie de la query avait raté le
	 * filtre de statut de compte. Une seule implémentation ne peut pas diverger.
	 */
	it("no file re-implements the admin DB re-check outside the auth layer", () => {
		const ALLOWED_DB_ROLE_CHECKS = new Set([
			// LA implémentation (fetchUserForAuth), celle que tout le monde consomme.
			"modules/auth/lib/require-auth.ts",
			// Le plugin `customSession` de Better Auth : c'est lui qui PRODUIT le rôle
			// porté par la session, il ne peut pas le consommer d'ailleurs.
			"modules/auth/lib/auth.ts",
		]);

		const USER_QUERY = /prisma\.user\.(findUnique|findFirst)\s*\(/;
		const ROLE_DECISION = /\brole\b[^\n]*[!=]==\s*(?:"ADMIN"|'ADMIN'|Role\.ADMIN)/;

		const offenders = files.filter((relativePath) => {
			if (ALLOWED_DB_ROLE_CHECKS.has(relativePath)) return false;
			const source = stripComments(readFileSync(join(REPO_ROOT, relativePath), "utf-8"));
			return USER_QUERY.test(source) && ROLE_DECISION.test(source);
		});

		expect(
			offenders,
			`Ces fichiers relisent l'utilisateur en base pour décider d'un privilège admin.\n` +
				`Consommer isVerifiedAdmin(session) / isAdmin() / requireAdmin*() à la place : ` +
				`eux seuls filtrent deletedAt + suspendedAt + accountStatus.\n` +
				`Fautifs : ${offenders.join(", ")}`,
		).toEqual([]);
	});
});
