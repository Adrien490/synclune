/**
 * @regression ord-test-008 — Auth bypass contract (Server Actions admin)
 *
 * Garde-fou : toute Server Action admin DOIT vérifier l'autorisation via
 * `requireAdmin()` ou `requireAdminWithUser()` AVANT toute mutation ou
 * lecture sensible. Sans ce contrat, une nouvelle action admin pourrait
 * laisser un trou RBAC silencieux (cf. CLAUDE.md § Server Actions Pattern).
 *
 * Stratégie : static source-grep des fichiers actions/ — pour chaque action
 * détectée comme « admin only » (mention `requireAdmin*` dans le module ou
 * verbe métier admin), vérifier :
 *   1. import de `requireAdmin` ou `requireAdminWithUser`
 *   2. appel du helper en tout début de fonction
 *   3. pattern early-return `if ("error" in <var>) return <var>.error`
 *
 * Une nouvelle action admin sans ce pattern fait casser le test
 * → force review humain (whitelist explicite si action publique légitime).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..");

/**
 * Modules dont les actions/ doivent être quasi-exclusivement admin.
 * Toute action publique (customer-facing) sous ces dossiers DOIT figurer
 * dans la whitelist ci-dessous (PUBLIC_OR_CUSTOMER_ACTIONS).
 */
const ADMIN_ACTION_DIRS = [
	"modules/orders/actions",
	"modules/refunds/actions",
	"modules/invoices/actions",
	"modules/store-settings/actions",
	// Catalogue (audit « Admin catalogue » 2026-07-26) : 54 actions admin vivaient
	// hors de ce contrat. Toutes étaient gardées, mais rien ne l'imposait — une
	// nouvelle action oubliant requireAdmin passait en silence.
	"modules/products/actions",
	"modules/variants/actions",
	"modules/collections/actions",
	"modules/colors/actions",
	"modules/materials/actions",
	"modules/product-types/actions",
	// Audit « Admin role & re-check DB » 2026-07-31 : 11 actions admin mutantes
	// vivaient encore hors contrat. Toutes étaient gardées, rien ne l'imposait.
	// `discounts` porte en outre le seul sous-dossier d'actions du repo
	// (`actions/admin/`), d'où le scan récursif ci-dessous.
	"modules/media/actions",
	"modules/dashboard/actions",
	// Audit « Server Actions sécurisées » 2026-08-07 : deux dossiers portant chacun
	// une action admin restaient hors contrat.
	//
	// `cron/actions` → `runMaintenanceTask` déclenche la réconciliation des
	// remboursements Stripe, la synchro des paiements asynchrones et la purge des
	// médias orphelins. Un déclencheur d'opérations lourdes et irréversibles.
	//
	"modules/cron/actions",
	// `admin-auth/actions` (migration lean, lot 1) : `login` et `logout` sont les
	// surfaces NON authentifiées du parcours de connexion — whitelistées ci-dessous.
	// Le dossier reste scanné pour attraper toute future action qui s'y logerait.
	"modules/admin-auth/actions",
	// `retractations/actions` (migration lean, lot 5) : le workflow admin du
	// remboursement (colis reçu / rembourser / rejeter) — `request-retractation`
	// est LA surface publique du module, whitelistée ci-dessous.
	"modules/retractations/actions",
];

/**
 * Whitelist explicite — actions sous ADMIN_ACTION_DIRS qui ne sont PAS admin.
 * Toute addition ici demande justification métier (commentaire obligatoire).
 */
const PUBLIC_OR_CUSTOMER_ACTIONS = new Set<string>([
	// Retrait de l'espace client (2026-07-31) — cinq entrées ont quitté cette liste :
	//
	// Supprimées avec leur surface : `cancel-order-customer.ts` (annulation par le
	// client de sa commande PENDING), `request-return.ts` (demande de retour) et
	// `refresh-user-orders.ts` (bouton « Actualiser » de l'espace client). Le client
	// passe maintenant par l'email de contact, et l'admin exécute.
	//
	// `refresh-orders.ts` et `refresh-refunds.ts` étaient étiquetées « Customer-facing »
	// à tort : les deux appellent `requireAdmin()` et rafraîchissent les LISTES ADMIN.
	// Elles sortent donc de la whitelist pour être réellement soumises au contrat —
	// l'assertion d'exemption ne testait que `requireAdminWithUser`, donc leur
	// `requireAdmin()` passait sous le radar.
	// Admin read utility : retour custom (RefundableOrderOption[]), pas ActionState,
	// --- Catalogue : surfaces storefront (aucune n'est admin) ---
	// Recherche rapide publique de la boutique (lecture seule, retour custom
	// QuickSearchResult, pas ActionState).
	"modules/products/actions/quick-search.ts",
	// Compteur vivant du panneau de filtres public (« Voir les N pièces ») —
	// lecture seule d'un count PUBLIC forcé côté data, retour custom
	// CountFilteredProductsResult, rate limit nommé product-filter-count.
	"modules/products/actions/count-filtered-products.ts",
	// Pagination « voir plus » du catalogue public (lecture seule).
	"modules/products/actions/load-more-products.ts",
	// Historique de recherche du visiteur — stocké en cookie, scopé à son propre
	// navigateur, aucune écriture DB.
	"modules/products/actions/add-recent-search.ts",
	"modules/products/actions/remove-recent-search.ts",
	"modules/products/actions/clear-recent-searches.ts",
	// --- Codes promo : les deux seules surfaces client du module ---
	// Saisie d'un code au checkout par un invité. Garde volontairement faible mais
	// RÉELLE : `requireActiveAccountIfAuthenticated()` (autorise l'invité, rejette
	// une session dont le compte n'est pas ACTIVE) + rate limit. Retour custom
	// `ValidateDiscountCodeReturn`, donc incompatible avec l'early-return ActionState.
	// Fin wrapper de lecture au-dessus de `validateDiscountCode` : hérite de sa
	// garde et de son rate limit, n'écrit rien en base.
	// --- Admin-auth : les deux surfaces du parcours de connexion ---
	// `login` est LA surface non authentifiée : exiger `requireAdmin()` y serait un
	// contresens (on n'est pas encore connectée). Sa garde propre est le rate limit
	// par IP + la comparaison à temps constant.
	"modules/admin-auth/actions/login.ts",
	// Déconnexion : détruire son propre cookie ne demande aucun privilège, et
	// l'exiger empêcherait un cookie expiré d'être proprement supprimé.
	"modules/admin-auth/actions/logout.ts",
	// --- Rétractation : la surface PUBLIQUE du droit de rétractation en ligne ---
	// La cliente n'a pas de compte (checkout invité) : exiger requireAdmin y
	// serait un contresens. Sa garde propre est le token HMAC du lien de suivi,
	// vérifié contre l'email en base AVANT toute écriture (anti-énumération),
	// après parse Zod de l'entrée.
	"modules/retractations/actions/request-retractation.ts",
]);

interface ActionFile {
	relativePath: string;
	source: string;
}

/**
 * Parcours RÉCURSIF (hors `__tests__`).
 *
 * La version d'origine faisait un `readdirSync` plat : `modules/discounts/actions/admin/`
 * — le seul sous-dossier d'actions du repo — serait resté invisible même après
 * ajout de son parent à `ADMIN_ACTION_DIRS`. Un contrat qui s'arrête au premier
 * niveau donne la garantie la plus dangereuse : celle qu'on croit avoir.
 */
function listActionFiles(): ActionFile[] {
	const files: ActionFile[] = [];

	function walk(dir: string) {
		const absDir = join(REPO_ROOT, dir);
		let entries: string[];
		try {
			entries = readdirSync(absDir, { withFileTypes: true }).map((e) =>
				e.isDirectory() ? `${e.name}/` : e.name,
			);
		} catch {
			return; // dossier inexistant (ex. invoices/actions pas encore créé)
		}
		for (const entry of entries) {
			if (entry.endsWith("/")) {
				const name = entry.slice(0, -1);
				if (name === "__tests__") continue;
				walk(`${dir}/${name}`);
				continue;
			}
			if (!entry.endsWith(".ts") || entry.endsWith(".d.ts")) continue;
			const relativePath = `${dir}/${entry}`;
			const source = readFileSync(join(REPO_ROOT, relativePath), "utf-8");
			files.push({ relativePath, source });
		}
	}

	for (const dir of ADMIN_ACTION_DIRS) walk(dir);
	return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

const AUTH_IMPORT_PATTERN =
	/import\s+\{[^}]*\b(requireAdmin|requireAdminApiRoute)\b[^}]*\}\s+from\s+["']@\/modules\/admin-auth\/lib\/require-admin["']/;

const AUTH_CALL_PATTERN = /\b(requireAdmin|requireAdminWithUser|requireAdminApiRoute)\s*\(/;

/**
 * Pattern early-return canonique :
 *   const admin = await requireAdminWithUser();
 *   if ("error" in admin) return admin.error;
 * OU
 *   const auth = await requireAdmin();
 *   if ("error" in auth) return auth.error;
 */
const EARLY_RETURN_PATTERN = /if\s*\(\s*["']error["']\s+in\s+\w+\s*\)\s+return\s+\w+\.error/;

describe("@regression ord-test-008 — Auth bypass contract", () => {
	const files = listActionFiles();

	it("scans at least 60 action files across orders/refunds/invoices/catalogue", () => {
		// Sanity check : si un dev déplace tout le code ailleurs, le test
		// passerait à vide. On force au moins 40 fichiers détectés (44 après la jour,
		// dont 54 pour le catalogue).
		expect(files.length).toBeGreaterThanOrEqual(40);
	});

	it("snapshot the list of admin actions audited (drift detection)", () => {
		// Toute nouvelle action sous un dossier de ADMIN_ACTION_DIRS force
		// update de ce snapshot, ce qui implique une review humaine pour
		// décider si elle est admin (vérifiée par le contrat ci-dessous) ou
		// publique (à ajouter à PUBLIC_OR_CUSTOMER_ACTIONS).
		const auditedAdmin = files
			.filter((f) => !PUBLIC_OR_CUSTOMER_ACTIONS.has(f.relativePath))
			.map((f) => f.relativePath);
		expect(auditedAdmin).toMatchSnapshot();
	});

	describe("each admin action enforces requireAdmin* pattern", () => {
		const adminFiles = files.filter((f) => !PUBLIC_OR_CUSTOMER_ACTIONS.has(f.relativePath));

		for (const file of adminFiles) {
			describe(file.relativePath, () => {
				it("imports requireAdmin or requireAdminWithUser from auth/lib", () => {
					expect(file.source).toMatch(AUTH_IMPORT_PATTERN);
				});

				it("calls requireAdmin*() in the action body", () => {
					expect(file.source).toMatch(AUTH_CALL_PATTERN);
				});

				it('uses canonical early-return: if ("error" in x) return x.error', () => {
					expect(file.source).toMatch(EARLY_RETURN_PATTERN);
				});

				it("calls requireAdmin* BEFORE any prisma.* mutation", () => {
					// Garde-fou anti-TOCTOU : si une action écrit en DB avant
					// l'auth check, un appel non-admin pourrait avoir un effet
					// même si l'action retourne ensuite ERROR.
					const authCallIdx = file.source.search(AUTH_CALL_PATTERN);
					const prismaMutationIdx = file.source.search(
						/prisma\.\w+\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\b/,
					);
					// Si pas de mutation Prisma → rien à protéger.
					if (prismaMutationIdx === -1) return;
					expect(authCallIdx).toBeGreaterThan(-1);
					expect(authCallIdx).toBeLessThan(prismaMutationIdx);
				});
			});
		}
	});

	describe("whitelist sanity", () => {
		it("every whitelist entry points to a real file", () => {
			for (const relativePath of PUBLIC_OR_CUSTOMER_ACTIONS) {
				const matching = files.find((f) => f.relativePath === relativePath);
				expect(matching, `${relativePath} listed in whitelist but not found on disk`).toBeDefined();
			}
		});

		it("whitelist entries do NOT use requireAdmin* (else they should be removed from whitelist)", () => {
			for (const relativePath of PUBLIC_OR_CUSTOMER_ACTIONS) {
				const file = files.find((f) => f.relativePath === relativePath);
				if (!file) continue;
				// requireAdminWithUser is a stronger signal than requireAdmin
				// (the latter is sometimes used for partial admin checks).
				expect(
					file.source,
					`${relativePath} is whitelisted as public but uses requireAdmin* — review whitelist`,
				).not.toMatch(/\brequireAdminWithUser\s*\(/);
			}
		});
	});
});
