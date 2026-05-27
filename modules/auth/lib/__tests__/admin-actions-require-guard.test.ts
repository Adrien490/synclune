/**
 * @regression ord-test-008 — admin guard convention enforcement
 *
 * Bug théorique : un développeur ajoute une nouvelle action sous
 * `modules/orders/actions/` ou `modules/refunds/actions/` et oublie
 * d'appeler `requireAdmin()` / `requireAdminWithUser()`. L'action
 * devient alors accessible à n'importe quel utilisateur authentifié.
 *
 * Garde-fou : ce test parse statiquement chaque fichier d'action admin
 * et vérifie qu'il contient un appel à un guard d'auth admin. Si une
 * action admin sans guard apparaît, le test échoue avant prod.
 *
 * Le bouclier au runtime existe déjà (cross-role-authorization.test.ts
 * couvre le comportement de `requireAdmin` / `requireAdminWithUser`
 * eux-mêmes ; chaque action a aussi son test individuel "auth error
 * when not admin"). Ce meta-test enforce la **convention** d'usage,
 * pas le comportement du guard.
 *
 * Pour les actions destinées aux clients (request-return, cancel
 * d'une commande par le client, etc.) ajouter le fichier à la
 * `CUSTOMER_ACTION_ALLOWLIST` avec un commentaire explicatif.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ACTION_DIRS = ["modules/orders/actions", "modules/refunds/actions"] as const;

/**
 * Fichiers d'actions qui sont légitimement accessibles aux clients
 * (pas aux admins). Doivent vérifier `requireAuth()` à la place mais
 * pas `requireAdmin()`.
 */
const CUSTOMER_ACTION_ALLOWLIST = new Set<string>([
	// Annulation par le client de sa propre commande
	"cancel-order-customer.ts",
	// Demande de retour initiée par le client
	"request-return.ts",
]);

const ADMIN_GUARD_PATTERNS = [
	/\brequireAdmin\s*\(/,
	/\brequireAdminWithUser\s*\(/,
	// Wrappers qui appellent requireAdmin() en interne. Si tu ajoutes un
	// nouvel helper de ce genre, étends cette liste après audit.
	/\brunCrossPageIdsAction\s*\(/,
];

function listActionFiles(dir: string): string[] {
	try {
		return readdirSync(join(process.cwd(), dir)).filter(
			(f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"),
		);
	} catch {
		return [];
	}
}

describe("Admin action guard convention", () => {
	for (const dir of ACTION_DIRS) {
		describe(dir, () => {
			const files = listActionFiles(dir);

			it("should find action files in the directory", () => {
				expect(files.length).toBeGreaterThan(0);
			});

			for (const file of files) {
				const isCustomerAction = CUSTOMER_ACTION_ALLOWLIST.has(file);

				it(
					isCustomerAction
						? `${file} is allowlisted as customer-facing (no admin guard required)`
						: `${file} must call requireAdmin or requireAdminWithUser`,
					() => {
						const path = join(process.cwd(), dir, file);
						const source = readFileSync(path, "utf-8");

						if (isCustomerAction) {
							// Customer actions should NOT call admin guards
							const hasAdminGuard = ADMIN_GUARD_PATTERNS.some((p) => p.test(source));
							expect(
								hasAdminGuard,
								`${file} is in CUSTOMER_ACTION_ALLOWLIST but calls an admin guard. Remove it from the allowlist or remove the guard.`,
							).toBe(false);
							// Customer actions should call requireAuth() instead
							expect(
								/\brequireAuth\s*\(/.test(source),
								`Customer action ${file} should call requireAuth() to verify the user is logged in.`,
							).toBe(true);
							return;
						}

						const hasAdminGuard = ADMIN_GUARD_PATTERNS.some((p) => p.test(source));
						expect(
							hasAdminGuard,
							`Admin action ${file} does not call requireAdmin() or requireAdminWithUser(). ` +
								`Add the guard at the top of the action, or add this file to CUSTOMER_ACTION_ALLOWLIST if it is intentionally customer-facing.`,
						).toBe(true);
					},
				);
			}
		});
	}
});
