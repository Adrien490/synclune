import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression order-status-invalidation-2026-05-29
 *
 * Gèle l'invariant CACHE-AUDIT-010 (cf. CLAUDE.md § Caching) : toute mutation de
 * `Order.status` / `Order.paymentStatus` (Server Action, webhook handler, cron)
 * DOIT invalider le cache via `getOrderInvalidationTags(userId, orderId)`
 * (`modules/orders/constants/cache.ts`) — jamais via une liste de tags écrite à
 * la main. Une liste partielle (ex: `[LIST, ADMIN_ORDERS_LIST, ADMIN_BADGES]`)
 * laisse le détail commande (DETAIL/CONFIRMATION/HISTORY) ET l'espace client
 * user-scopé (USER_ORDERS/LAST_ORDER) stale jusqu'à l'expiration du
 * profil `user` (~10 min).
 *
 * Ce test a été ajouté après la découverte d'une violation réelle dans
 * `dispute-handlers.ts` (chargeback perdu → `paymentStatus` muté via une variable
 * + invalidation manuelle partielle), passée sous le radar des greps littéraux
 * d'enum. La détection ci-dessous matche donc AUSSI les affectations par variable
 * (`paymentStatus: newPaymentStatus`), pas seulement `PaymentStatus.REFUNDED`.
 *
 * Deux gardes :
 *  1. Le SET des fichiers qui mutent le statut dans un bloc `data:` d'un
 *     `order.update(Many)` est gelé (allowlist) → un nouveau mutateur fait
 *     échouer le test tant qu'il n'est pas catégorisé consciemment.
 *  2. Chaque mutateur "auto-invalidant" (hors délégateurs) DOIT appeler
 *     `getOrderInvalidationTags(` → attrape la suppression accidentelle de l'appel.
 */

const REPO_ROOT = process.cwd();

function walkTs(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (
			entry === "node_modules" ||
			entry === ".next" ||
			entry === "dist" ||
			entry === "generated" ||
			entry.startsWith(".")
		) {
			continue;
		}
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			walkTs(full, out);
		} else if (
			(entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
			!entry.endsWith(".test.ts") &&
			!entry.endsWith(".test.tsx") &&
			!entry.endsWith(".d.ts") &&
			!full.includes("/__tests__/") &&
			!full.includes("/__mocks__/")
		) {
			out.push(full);
		}
	}
	return out;
}

function relPath(abs: string): string {
	return relative(REPO_ROOT, abs).replaceAll("\\", "/");
}

const allSourceFiles = [
	...walkTs(join(REPO_ROOT, "modules")),
	...walkTs(join(REPO_ROOT, "app")),
	...walkTs(join(REPO_ROOT, "shared")),
	// Le client Prisma généré déclare `status:`/`paymentStatus:` dans ses types,
	// hors scope. walkTs l'exclut déjà via le filtre `generated`.
];

/**
 * Affectation concrète de `status:` ou `paymentStatus:` (literal enum OU variable),
 * en excluant `: true`/`: false` (clauses `select`). `\b` exclut `fulfillmentStatus`
 * (FulfillmentStatus n'est PAS dans le périmètre CACHE-AUDIT-010) et
 * `newPaymentStatus`/`previousPaymentStatus` (audit trail, casse différente).
 */
const STATUS_WRITE = /\b(?:status|paymentStatus)\s*:\s*(?!true\b|false\b)/;

/**
 * Détecte une mutation de statut dans le bloc `data: { … }` d'un
 * `order.update(Many)`. On scanne chaque `.order.update(`/`.order.updateMany(`
 * (donc on ignore `.order.create(`, hors scope, et `.dispute.update(`), on
 * localise le `data: {` qui suit, puis on extrait EXACTEMENT cet objet par
 * équilibrage d'accolades — on teste STATUS_WRITE uniquement à l'intérieur. Cela
 * évite les faux positifs (`return { status: ActionStatus.SUCCESS }`, clause
 * `where:`, appels `createOrderAuditTx` voisins).
 */
function mutatesOrderStatusViaUpdate(content: string): boolean {
	const callRe = /\.order\.(?:update|updateMany)\s*\(/g;
	let m: RegExpExecArray | null;
	while ((m = callRe.exec(content)) !== null) {
		const after = content.slice(m.index);
		const dataMatch = /data\s*:\s*\{/.exec(after);
		// `data:` doit appartenir à cet appel (proche du `.update(`).
		if (!dataMatch || dataMatch.index > 400) continue;
		const objStart = dataMatch.index + dataMatch[0].length - 1; // position du `{`
		let depth = 0;
		let end = -1;
		for (let j = objStart; j < after.length; j++) {
			const c = after[j];
			if (c === "{") depth++;
			else if (c === "}" && --depth === 0) {
				end = j;
				break;
			}
		}
		if (end === -1) continue;
		if (STATUS_WRITE.test(after.slice(objStart, end + 1))) return true;
	}
	return false;
}

/**
 * Allowlist gelée des fichiers qui mutent `Order.status`/`paymentStatus` dans un
 * `order.update(Many)`. Générée par grep + inspection manuelle (audit cache
 * 2026-05-29). Ajouter une entrée = décision consciente (le mutateur doit soit
 * appeler le helper, soit être déclaré délégateur ci-dessous).
 */
const EXPECTED_STATUS_MUTATORS = [
	"modules/cron/services/cleanup-pending-orders.service.ts",
	"modules/cron/services/reconcile-refunds.service.ts",
	"modules/orders/actions/cancel-order-customer.ts",
	"modules/orders/actions/cancel-order.ts",
	"modules/orders/actions/mark-as-delivered.ts",
	"modules/orders/actions/mark-as-fully-refunded.ts",
	"modules/orders/actions/mark-as-paid.ts",
	"modules/orders/actions/mark-as-processing.ts",
	"modules/orders/actions/mark-as-shipped.ts",
	"modules/orders/actions/revert-to-processing.ts",
	"modules/refunds/actions/process-refund.ts",
	"modules/webhooks/handlers/dispute-handlers.ts",
	// Délégateurs (cf. DELEGATES_TO_CALLER) : mutent le statut mais l'invalidation
	// est portée par l'appelant.
	"modules/webhooks/services/payment-intent.service.ts",
	"modules/webhooks/services/refund.service.ts",
	// NB : `checkout-order-processing.service.ts` mute aussi le statut (PROCESSING/
	// PAID) mais via `data: orderUpdateData` (variable) — angle mort du détecteur
	// source-level, donc ABSENT de cette liste à dessein. Sa délégation est tout
	// de même verrouillée par le test "delegating services" via DELEGATES_TO_CALLER.
];

/**
 * Services qui mutent le statut SANS s'auto-invalider : l'invalidation est
 * déléguée à l'appelant (handler webhook), qui appelle `getOrderInvalidationTags`.
 *  - `payment-intent.service.ts` (markOrderAs{Paid,Failed,Cancelled}) → appelants
 *    `payment-handlers.ts` (handlePaymentFailure:~332, handlePaymentCanceled:~429,
 *    handleOversell:~238).
 *  - `checkout-order-processing.service.ts` (processOrderFromPaymentIntent) →
 *    `checkout-post-tasks.service.ts:buildPostCheckoutTasksFromPI` (helper).
 *  - `refund.service.ts` (updateOrderPaymentStatus) → `refund-handlers.ts` +
 *    `reconcile-refunds.service.ts` (helper).
 *
 * Ces fichiers ne référencent volontairement PAS le helper (au plus un
 * commentaire). Si l'un se met à l'appeler — ou inversement — c'est une revue
 * consciente à faire.
 */
const DELEGATES_TO_CALLER = [
	"modules/webhooks/services/checkout-order-processing.service.ts",
	"modules/webhooks/services/payment-intent.service.ts",
	"modules/webhooks/services/refund.service.ts",
];

describe("CACHE-AUDIT-010 — invalidation des mutations de statut commande", () => {
	const actualMutators = allSourceFiles
		.filter((f) => mutatesOrderStatusViaUpdate(readFileSync(f, "utf-8")))
		.map(relPath)
		.sort();

	it("freezes the set of files mutating Order.status/paymentStatus via order.update", () => {
		expect(actualMutators).toEqual([...EXPECTED_STATUS_MUTATORS].sort());
	});

	it("every self-invalidating mutator routes through getOrderInvalidationTags()", () => {
		const selfInvalidating = EXPECTED_STATUS_MUTATORS.filter(
			(f) => !DELEGATES_TO_CALLER.includes(f),
		);
		const missing = selfInvalidating.filter((rel) => {
			const content = readFileSync(join(REPO_ROOT, rel), "utf-8");
			return !/getOrderInvalidationTags\s*\(/.test(content);
		});
		expect(missing).toEqual([]);
	});

	it("delegating services do NOT call the helper themselves (caller is responsible)", () => {
		const violators = DELEGATES_TO_CALLER.filter((rel) => {
			const content = readFileSync(join(REPO_ROOT, rel), "utf-8");
			return /getOrderInvalidationTags\s*\(/.test(content);
		});
		// Si un délégateur appelle le helper, soit le retirer de DELEGATES_TO_CALLER
		// (il s'auto-invalide désormais), soit retirer l'appel : revue consciente.
		expect(violators).toEqual([]);
	});
});
