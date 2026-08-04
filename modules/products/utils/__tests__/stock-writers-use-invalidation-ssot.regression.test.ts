import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression STOCK-CANCEL-INVALIDATION-001
 *
 * Audit « cache catalogue » (2026-07-31).
 *
 * Contrat : **tout écrivain de stock doit invalider via la SSOT.** Modelé sur
 * `modules/orders/services/__tests__/order-status-invalidation.regression.test.ts`,
 * qui impose le même contrat aux mutations de `Order.status` — l'équivalent
 * catalogue n'existait pas, et c'est précisément pourquoi les trois chemins de
 * restock avaient divergé chacun de leur côté :
 *
 *  - `cancel-order.ts` recréditait `inventory` ET réactivait `isActive` en
 *    n'invalidant **aucun** tag catalogue. La PDP gardait « rupture de stock » et un
 *    produit mono-SKU réactivé restait en 404 EN CACHE jusqu'à expiration du profil
 *    `catalog` (6 h) ;
 *  - `process-refund.ts` et `reconcile-refunds.service.ts` écrivaient chacun leur
 *    liste, toutes deux amputées de `SKU_DETAIL_BY_ID`, `SKUS_LIST`, `LIST` et
 *    `ADMIN_BADGES` — soit exactement les tags pour lesquels
 *    `getInventoryInvalidationTags` avait été fait SSOT (STOCK-STALE-BASELINE-001).
 *
 * Le test scanne les SOURCES : un helper d'invalidation n'existe que pour ses
 * appelants, et c'est au point d'appel que la divergence se produit.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..", "..");

/** Helpers SSOT acceptés — tous convergent vers `getInventoryInvalidationTags`. */
const SSOT_HELPERS = [
	"collectStockInvalidationTags",
	"getInventoryInvalidationTags",
	"getSkuInvalidationTags",
	"collectBulkInvalidationTags",
];

/**
 * Écritures d'inventaire, Prisma et SQL brut. `inventory: { increment/decrement }`
 * couvre l'ORM ; `"inventory" =` couvre le `$queryRaw`/`$executeRaw` de
 * `cancel-order.ts`, que le premier motif rate.
 */
const STOCK_WRITE_PATTERNS = [
	/inventory:\s*\{\s*(increment|decrement)/,
	/"inventory"\s*=/,
	/inventory:\s*\{\s*set:/,
];

/**
 * Fichiers qui écrivent le stock SANS avoir à invalider eux-mêmes, avec la raison.
 * Toute nouvelle entrée doit expliquer QUI invalide à sa place.
 */
const ALLOWLIST: Record<string, string> = {
	// Décrément du checkout (`processOrderFromPaymentIntent`). L'invalidation est
	// composée hors de ce fichier par `checkout-post-tasks.service.ts`, qui appelle
	// bien `collectStockInvalidationTags` et émet une tâche `INVALIDATE_CACHE` —
	// exécutée par `post-webhook-tasks.service.ts` via `revalidateTagsInBackground`
	// (contexte webhook/cron ⇒ `updateTag` y throw, E872). Les deux appelants
	// passent par ce SSOT : `webhooks/handlers/payment-handlers.ts:230` et
	// `cron/services/sync-async-payments.service.ts:128`.
	"modules/webhooks/services/checkout-order-processing.service.ts":
		"invalidé par checkout-post-tasks.service.ts (collectStockInvalidationTags)",
	// Services transactionnels appelés par webhooks/cron : idem, l'appelant compose.
	// (`modules/refunds/services/refund.service.ts` retiré : le fichier n'existe
	// plus — entrée périmée que rien ne détectait, d'où l'assertion dédiée infra.)
	"modules/webhooks/services/payment-intent.service.ts": "invalidé par ses appelants",
	"modules/payments/services/order-creation.service.ts":
		"décrément dans la tx de création — invalidé par checkout-post-tasks",
	// Journal de mouvements : écrit `StockMovement`, pas `ProductSku.inventory`.
	"modules/skus/services/stock-movement.service.ts": "n'écrit pas l'inventaire",
};

function collectSources(dir: string, acc: string[] = []): string[] {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return acc;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "__tests__" || entry === "node_modules" || entry === "generated") continue;
			collectSources(full, acc);
		} else if (
			entry.endsWith(".ts") &&
			!entry.endsWith(".test.ts") &&
			!entry.endsWith(".integration.test.ts")
		) {
			acc.push(full);
		}
	}
	return acc;
}

/** Retire commentaires : un motif cité en prose ne doit pas déclencher le garde-fou. */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const SOURCES = collectSources(join(REPO_ROOT, "modules")).map((path) => ({
	rel: path.slice(REPO_ROOT.length + 1),
	code: stripComments(readFileSync(path, "utf8")),
}));

const STOCK_WRITERS = SOURCES.filter(({ code }) =>
	STOCK_WRITE_PATTERNS.some((pattern) => pattern.test(code)),
);

describe("STOCK-CANCEL-INVALIDATION-001 — les écrivains de stock passent par la SSOT", () => {
	/**
	 * Garde-fou du garde-fou. Sans cette assertion, une regex cassée réduirait
	 * `STOCK_WRITERS` à zéro et le test suivant passerait sur un ensemble vide — le
	 * mode d'échec classique d'un scan de sources.
	 */
	it("trouve bien des écrivains de stock (sanity)", () => {
		expect(SOURCES.length).toBeGreaterThan(100);
		expect(STOCK_WRITERS.length).toBeGreaterThan(3);
		// Deux écrivains aux formes DIFFÉRENTES, pour que la sanity check couvre les
		// deux motifs : `cancel-order` écrit en SQL brut (`"inventory" =`),
		// `adjust-sku-stock` en Prisma (`inventory: { increment } `). Une seule des
		// deux regex cassée laisserait donc le test rouge.
		// (Le chemin refund a quitté cette liste au Lot 6 — cf. le test infra.)
		const detected = STOCK_WRITERS.map((w) => w.rel);
		expect(detected).toContain("modules/orders/actions/cancel-order.ts");
		expect(detected).toContain("modules/skus/actions/adjust-sku-stock.ts");
	});

	it("chaque écrivain de stock référence un helper d'invalidation SSOT", () => {
		const offenders = STOCK_WRITERS.filter(({ rel, code }) => {
			if (rel in ALLOWLIST) return false;
			return !SSOT_HELPERS.some((helper) => code.includes(helper));
		}).map(({ rel }) => rel);

		expect(
			offenders,
			`Ces fichiers écrivent \`ProductSku.inventory\` sans référencer de helper ` +
				`d'invalidation SSOT :\n  ${offenders.join("\n  ")}\n\n` +
				`Utiliser \`collectStockInvalidationTags\` (ou l'un de ${SSOT_HELPERS.join(", ")}), ` +
				`jamais une liste de tags écrite à la main : c'est ainsi que \`process-refund\` et ` +
				`\`reconcile-refunds\` ont chacun omis \`SKU_DETAIL_BY_ID\` et \`SKUS_LIST\`.\n` +
				`Si l'invalidation appartient légitimement à l'appelant, ajouter le fichier à ` +
				`ALLOWLIST avec sa raison.`,
		).toEqual([]);
	});

	/**
	 * Contre-épreuve ciblée sur le P0. Un scan « le fichier mentionne le helper »
	 * pourrait être satisfait par un import mort ; on vérifie ici que `cancel-order`
	 * l'APPELLE, et sur les SKUs qu'il vient effectivement de restocker.
	 */
	it("cancel-order appelle collectStockInvalidationTags sur les SKUs restockés", () => {
		const source = SOURCES.find((s) => s.rel === "modules/orders/actions/cancel-order.ts");
		expect(source).toBeDefined();

		expect(source!.code).toMatch(
			/updateTagsAfterMutation\(\s*collectStockInvalidationTags\(\s*order\._restockedSkus/,
		);
		// …et le tableau est bien alimenté dans la boucle de restock.
		expect(source!.code).toMatch(/restockedSkus\.push\(/);
	});

	/**
	 * Le contexte d'exécution reste le critère : `updateTag` throw (E872) hors Server
	 * Action. Le cron doit continuer de sortir par `revalidateTagsInBackground`, quel
	 * que soit le helper qui compose ses tags.
	 */
	it("la finalisation compose via la SSOT sans invalider ; le cron sort par revalidateTagsInBackground", () => {
		// P1-C (audit 2026-08-01) : la composition des tags vit dans le service de
		// finalisation PARTAGÉ (webhook + cron), qui retourne son tag set SANS
		// invalider lui-même — chaque appelant sort avec l'API de SON contexte
		// (tâche INVALIDATE_CACHE côté webhook, revalidateTagsInBackground côté
		// cron ; `updateTag` throw E872 dans les deux).
		//
		// Lot 6 (2026-08-03) : ce service ne compose plus de tags STOCK — il
		// n'écrit plus l'inventaire depuis le drop de `RefundItem.restock`. Le
		// contrat qui subsiste, et qui est celui que ce test garde réellement,
		// c'est qu'il compose par des SSOT et n'invalide PAS lui-même.
		const service = SOURCES.find(
			(s) => s.rel === "modules/refunds/services/finalize-refund.service.ts",
		);
		expect(service).toBeDefined();
		expect(service!.code).toContain("getRefundInvalidationTags");
		expect(service!.code).toContain("getOrderInvalidationTags");
		expect(service!.code).not.toMatch(/\bupdateTag\(/);
		expect(service!.code).not.toMatch(/\brevalidateTag/);

		const cron = SOURCES.find(
			(s) => s.rel === "modules/cron/services/reconcile-refunds.service.ts",
		);
		expect(cron).toBeDefined();
		expect(cron!.code).toContain("revalidateTagsInBackground");
		expect(cron!.code).not.toMatch(/\bupdateTag\(/);
	});

	/**
	 * Anti-péremption (idiome de `server-actions-rate-limited`) : une entrée
	 * d'allowlist dont le fichier n'existe plus est un faux sentiment de
	 * couverture — `modules/refunds/services/refund.service.ts` a traîné ici
	 * après sa suppression sans que rien ne le signale.
	 */
	it("aucune entrée d'allowlist périmée (fichier disparu)", () => {
		const stale = Object.keys(ALLOWLIST).filter((rel) => !existsSync(join(REPO_ROOT, rel)));
		expect(stale).toEqual([]);
	});
});
