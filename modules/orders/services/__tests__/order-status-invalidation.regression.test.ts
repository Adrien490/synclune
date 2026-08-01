import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression order-status-invalidation-2026-05-29
 *
 * Gèle l'invariant CACHE-AUDIT-010 (cf. CLAUDE.md § Caching) : toute mutation de
 * `Order.status` / `Order.paymentStatus` (Server Action, webhook handler, cron)
 * DOIT invalider le cache via `getOrderInvalidationTags(orderId)`
 * (`modules/orders/constants/cache.ts`) — jamais via une liste de tags écrite à
 * la main. Une liste partielle (ex: `[LIST, ADMIN_ORDERS_LIST, ADMIN_BADGES]`)
 * laisse le détail commande (DETAIL/CONFIRMATION/HISTORY) stale jusqu'à
 * l'expiration du profil `user`.
 *
 * Ce test a été ajouté après la découverte d'une violation réelle dans
 * `dispute-handlers.ts` (chargeback perdu → `paymentStatus` muté via une variable
 * + invalidation manuelle partielle), passée sous le radar des greps littéraux
 * d'enum. La détection ci-dessous matche donc AUSSI les affectations par variable
 * (`paymentStatus: newPaymentStatus`), pas seulement `PaymentStatus.REFUNDED`.
 *
 * Quatre gardes — les 2 premiers raisonnent au FICHIER, les 2 derniers au SITE :
 *  1. Le SET des fichiers qui mutent le statut dans un bloc `data:` d'un
 *     `order.update(Many)` est gelé (allowlist) → un nouveau mutateur fait
 *     échouer le test tant qu'il n'est pas catégorisé consciemment.
 *  2. Chaque mutateur "auto-invalidant" (hors délégateurs) DOIT appeler
 *     `getOrderInvalidationTags(` → attrape la suppression accidentelle de l'appel.
 *  3. Aucun `tags:` d'une tâche `INVALIDATE_CACHE` ne nomme `ORDERS_CACHE_TAGS.*`
 *     sans spreader le helper (ajouté à l'audit invalidation commandes 2026-07-31 :
 *     les gardes 1-2 laissaient `handleDisputeCreated` écrire sa liste à la main
 *     dans un fichier que `handleDisputeClosed` suffisait à valider).
 *  4. Tout fetcher caché qui interroge `prisma.order.` pose au moins un tag que le
 *     helper émet — sinon aucune transition de statut ne peut l'atteindre. C'est
 *     le garde qui manquait à `get-order-for-refund.ts`, tagué `REFUNDS(orderId)`
 *     seul alors qu'il sert de garde d'accès à `/remboursements/nouveau`.
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
// `cancel-order-customer.ts` a quitté cette liste avec l'espace client
// (2026-07-31) : l'annulation en self-service n'existe plus, le client écrit à
// l'atelier et l'admin exécute via `cancel-order.ts`.
const EXPECTED_STATUS_MUTATORS = [
	"modules/cron/services/cleanup-pending-orders.service.ts",
	// P1-C (audit 2026-08-01) : la finalisation asynchrone (claim COMPLETED +
	// paymentStatus) a quitté reconcile-refunds.service.ts pour ce service
	// PARTAGÉ webhook refund.updated + cron. Il référence le helper pour composer
	// son tag set retourné ; l'invalidation effective est faite par l'appelant
	// avec l'API de son contexte.
	"modules/refunds/services/finalize-refund.service.ts",
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
 *  - `refund.service.ts` (updateOrderPaymentStatus) → `refund-handlers.ts`.
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

	/**
	 * Les 2 gardes ci-dessus raisonnent au FICHIER : ils demandent que le mutateur
	 * mentionne le helper QUELQUE PART. `dispute-handlers.ts` les passait donc grâce à
	 * `handleDisputeClosed` pendant que `handleDisputeCreated`, 350 lignes plus haut,
	 * écrivait encore sa liste à la main. Les 2 gardes ci-DESSOUS raisonnent au SITE.
	 */
	it("no INVALIDATE_CACHE task builds its order tags by hand", () => {
		// Un `tags:` qui nomme `ORDERS_CACHE_TAGS.*` en dur reproduit une liste dont la
		// SSOT est `getOrderInvalidationTags` — il dérivera dès que celle-ci gagnera un
		// tag. Composer (`[...getOrderInvalidationTags(id), UN_TAG_EN_PLUS]`) reste
		// autorisé : c'est le spread qui est exigé, pas l'exclusivité.
		const offenders: string[] = [];
		for (const file of allSourceFiles) {
			const content = readFileSync(file, "utf-8");
			if (!content.includes('type: "INVALIDATE_CACHE"')) continue;

			for (const match of content.matchAll(/type:\s*"INVALIDATE_CACHE",\s*(?:\/\/[^\n]*\n\s*)*/g)) {
				// Fenêtre = le reste du littéral de tâche, borné au `tags:` qui suit.
				const rest = content.slice(match.index + match[0].length);
				const tagsBlock = /^tags:\s*(\[[\s\S]*?\]|[^\n]+)/.exec(rest);
				if (!tagsBlock) continue;
				const block = tagsBlock[1] ?? "";
				if (!block.includes("ORDERS_CACHE_TAGS.")) continue;
				if (!/getOrderInvalidationTags\s*\(/.test(block)) {
					offenders.push(`${relPath(file)} :: ${block.replace(/\s+/g, " ").slice(0, 90)}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	/**
	 * Le garde qui aurait attrapé l'écart le plus coûteux de l'audit invalidation
	 * commandes : `get-order-for-refund.ts` lisait `status`/`paymentStatus` en ne posant
	 * que `REFUNDS(orderId)` — un tag qu'AUCUN mutateur de statut n'émet. La page
	 * `/remboursements/nouveau` en dérivait sa garde d'accès, donc le bouton
	 * « Rembourser » renvoyait l'admin sur le détail commande après un `mark-as-paid`.
	 *
	 * Règle : tout fetcher caché qui interroge `prisma.order` doit poser au moins un des
	 * tags que `getOrderInvalidationTags` émet — sinon aucune transition de statut ne
	 * peut l'atteindre.
	 */
	it("every cached fetcher querying prisma.order posts a tag the helper emits", () => {
		// Miroir de la sortie de `getOrderInvalidationTags` (cf. constants/cache.ts).
		const REACHABLE_TAG_MARKERS = [
			"ORDERS_CACHE_TAGS.LIST",
			"ORDERS_CACHE_TAGS.HISTORY(",
			"ORDERS_CACHE_TAGS.CONFIRMATION(",
			"ORDERS_CACHE_TAGS.DETAIL(",
			"ADMIN_BADGES",
			"ADMIN_ORDERS_LIST",
		];

		const unreachable = allSourceFiles
			.filter((f) => relPath(f).includes("/data/"))
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				// Directive ancrée en début de ligne + `;` final : `get-order-for-tracking.ts`
				// et `get-action-items.ts` DOCUMENTENT en commentaire pourquoi ils ne sont
				// pas cachés, et une recherche de sous-chaîne les comptait comme cachés.
				//
				// `prisma\.order\.` : le point final exclut `prisma.orderHistory.` /
				// `prisma.orderNote.`, qui ont leurs propres tags et leurs propres mutateurs.
				return /^\s*"use cache(?::\s*private)?";/m.test(content) && /prisma\.order\./.test(content);
			})
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				return !REACHABLE_TAG_MARKERS.some((marker) => content.includes(marker));
			})
			.map(relPath)
			.sort();

		expect(unreachable).toEqual([]);
	});
});
