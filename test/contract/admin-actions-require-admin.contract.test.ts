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
	"modules/skus/actions",
	"modules/collections/actions",
	"modules/colors/actions",
	"modules/materials/actions",
	"modules/product-types/actions",
];

/**
 * Whitelist explicite — actions sous ADMIN_ACTION_DIRS qui ne sont PAS admin.
 * Toute addition ici demande justification métier (commentaire obligatoire).
 */
const PUBLIC_OR_CUSTOMER_ACTIONS = new Set<string>([
	// Customer-facing : un client peut annuler sa propre commande PENDING.
	"modules/orders/actions/cancel-order-customer.ts",
	// Customer-facing : un client peut demander un retour sur sa commande
	// livrée (transition Order → RETURNED via webhook downstream).
	"modules/refunds/actions/request-return.ts",
	// Customer-facing : refresh des données de la page commandes.
	"modules/orders/actions/refresh-orders.ts",
	// Customer-facing : rafraîchissement par le client de SES propres commandes
	// (bouton « Actualiser » de l'espace client + geste pull-to-refresh). Scopé à
	// `session.user.id`, aucun paramètre accepté.
	"modules/orders/actions/refresh-user-orders.ts",
	// Customer-facing : refresh des données de la page remboursements.
	"modules/refunds/actions/refresh-refunds.ts",
	// Admin read utility : retour custom (RefundableOrderOption[]), pas ActionState,
	// donc incompatible avec l'early-return canonique `return admin.error`. L'auth
	// admin est bien vérifiée (requireAdmin en tête + re-check DB via getOrders) ;
	// sur échec on renvoie une liste vide. Exempt du contrat ActionState, pas de l'auth.
	"modules/refunds/actions/search-refundable-orders.ts",
	// --- Catalogue : surfaces storefront (aucune n'est admin) ---
	// Recherche rapide publique de la boutique (lecture seule, retour custom
	// QuickSearchResult, pas ActionState).
	"modules/products/actions/quick-search.ts",
	// Pagination « voir plus » du catalogue public (lecture seule).
	"modules/products/actions/load-more-products.ts",
	// Historique de recherche / produits vus du visiteur — stocké en cookie,
	// scopé à son propre navigateur, aucune écriture DB.
	"modules/products/actions/add-recent-search.ts",
	"modules/products/actions/remove-recent-search.ts",
	"modules/products/actions/clear-recent-searches.ts",
	"modules/products/actions/add-recent-product.ts",
]);

interface ActionFile {
	relativePath: string;
	source: string;
}

function listActionFiles(): ActionFile[] {
	const files: ActionFile[] = [];
	for (const dir of ADMIN_ACTION_DIRS) {
		const absDir = join(REPO_ROOT, dir);
		let entries: string[];
		try {
			entries = readdirSync(absDir);
		} catch {
			continue; // dossier inexistant (ex. invoices/actions pas encore créé)
		}
		for (const entry of entries) {
			if (!entry.endsWith(".ts") || entry.endsWith(".d.ts")) continue;
			const relativePath = `${dir}/${entry}`;
			const source = readFileSync(join(REPO_ROOT, relativePath), "utf-8");
			files.push({ relativePath, source });
		}
	}
	return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

const AUTH_IMPORT_PATTERN =
	/import\s+\{[^}]*\b(requireAdmin|requireAdminWithUser|requireAdminApiRoute)\b[^}]*\}\s+from\s+["']@\/modules\/auth\/lib\/require-auth["']/;

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
		// passerait à vide. On force au moins 60 fichiers détectés (81 à ce jour,
		// dont 54 pour le catalogue).
		expect(files.length).toBeGreaterThanOrEqual(60);
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
