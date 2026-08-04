import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";
import {
	CUSTOMER_SHIPPING_PII_SCRUB,
	ORDER_HISTORY_PII_SCRUB,
	ORDER_PII_SCRUB,
	PURGED_ORDER_NOTE_CONTENT,
	REFUND_PII_SCRUB,
	UNPAID_ORDER_PII_SCRUB,
} from "@/modules/orders/constants/pii-scrub";

/**
 * @regression purge-pii-scrub-contract
 *
 * Verrouille le CONTRAT de champs des payloads de purge PII (cron
 * `hard-delete-retention` → `purgeExpiredOrderPii`/`purgeAbandonedOrderPii`,
 * SSOT `modules/orders/constants/pii-scrub.ts`), appliqués aux commandes dont
 * la rétention légale de 10 ans est échue (`paidAt + 10 ans`) et aux commandes
 * jamais payées passées la fenêtre F-A. Invariant #10 du cycle RGPD/conservation
 * en 2 temps (CLAUDE.md § Facturation électronique) :
 *
 *  (a) Les surfaces PII DOIVENT être scrubées — base légale de conservation
 *      expirée ⇒ limitation de conservation RGPD Art. 5.1.e :
 *      shipping* + invoiceDataSnapshot/Hash + pointeurs PDF facture/avoir +
 *      identifiants Stripe pseudonymes (cus_/pi_) + tracking (trackingNumber/Url,
 *      audit 2026-08-03) + avoirs par-refund (Refund.creditNotePdf*) + textes
 *      libres (Refund.note, OrderNote.content, OrderHistory.note/metadata —
 *      arbitrage 2026-08-03 : immuable PENDANT la rétention, pas au-delà).
 *  (b) Les champs comptables non-PII NE DOIVENT JAMAIS figurer dans le scrub —
 *      la ligne survit (Art. L123-22) : numéros (invoiceNumber/creditNoteNumber),
 *      montants (total/subtotal/discountAmount/shippingCost/amount) et
 *      dates d'encaissement (paidAt/processedAt) restent intacts.
 *
 * Le test `hard-delete-retention.service.test.ts` couvre la SÉLECTION (where) et
 * la suppression des PDF UploadThing ; il n'inspecte PAS le `data` du scrub. Sans
 * cette garde, une régression ajoutant `total: 0` ou `invoiceNumber: null` au
 * payload détruirait l'enregistrement comptable SANS test rouge (audit couverture
 * facturation 2026-05-30, finding P1-A ; étendu Refund/unpaid — audit rétention
 * PII 2026-07-09).
 */

const SCRUB = ORDER_PII_SCRUB as Record<string, unknown>;
const UNPAID_SCRUB = UNPAID_ORDER_PII_SCRUB as Record<string, unknown>;
const REFUND_SCRUB = REFUND_PII_SCRUB as Record<string, unknown>;

/** Champs PII opérationnels + facture qui DOIVENT être effacés à 10 ans. */
const MUST_BE_SCRUBBED = [
	"customerEmail",
	"customerName",
	// Ni `customerPhone` ni `stripeCustomerId` : colonnes retirées le 2026-08-04
	// (la première n'était jamais écrite au checkout — le téléphone vit dans
	// `shippingPhone`, scrubé plus bas ; la seconde n'avait aucun lecteur).
	// Audit rétention PII 2026-07-09 : `pi_xxx` est rattachable à une personne via
	// Stripe au même titre que `cus_xxx` — nullé à échéance (pas à l'anonymisation,
	// où refunds/litiges restent possibles).
	"stripePaymentIntentId",
	"shippingFirstName",
	"shippingLastName",
	"shippingAddress1",
	"shippingAddress2",
	"shippingPostalCode",
	"shippingCity",
	"shippingPhone",
	// Pas de `billing*` : les 9 colonnes sont parties le 2026-08-04 — jamais
	// renseignées sur une commande réelle. L'adresse portée par la facture est
	// l'adresse de livraison, déjà scrubée juste au-dessus.
	// Audit rétention PII 2026-08-03 : identifiant transporteur rattaché à la
	// livraison d'une personne nommée — scrubé comme l'adresse et le téléphone.
	"trackingNumber",
	"trackingUrl",
	"invoiceDataSnapshot",
	"invoiceDataHash",
	"invoicePdfUrl",
	"invoicePdfHash",
	"creditNotePdfUrl",
	"creditNotePdfHash",
] as const;

/**
 * Champs comptables non-PII qui DOIVENT survivre (Art. L123-22 / L102 B LPF) —
 * leur PRÉSENCE dans le payload de scrub est une régression réglementaire.
 */
const MUST_BE_PRESERVED = [
	"invoiceNumber",
	"creditNoteNumber",
	"invoiceStatus",
	"invoiceGeneratedAt",
	"invoiceVoidedAt",
	"creditNoteGeneratedAt",
	"total",
	"subtotal",
	"discountAmount",
	"shippingCost",
	"paidAt",
	"orderNumber",
	"paymentMethod",
	"vendorLegalName",
	"vendorSiren",
	"vendorSiret",
	"vendorVatNumber",
] as const;

describe("ORDER_PII_SCRUB — contrat de champs (purge 10 ans, commandes payées)", () => {
	it.each(MUST_BE_SCRUBBED)("scrub le champ PII %s", (field) => {
		expect(Object.prototype.hasOwnProperty.call(SCRUB, field)).toBe(true);
		// Audit rétention PII 2026-08-03 (P2-A) : la présence de la clé ne suffit
		// pas — Prisma IGNORE silencieusement une valeur `undefined` (colonne non
		// touchée), et le test du service spread la même constante, donc un
		// `field: someVar` devenu undefined laisserait survivre le champ à la
		// purge avec deux tests verts. null / DbNull / valeur de remplacement
		// restent tous valides ; seul undefined est interdit.
		expect(SCRUB[field]).not.toBeUndefined();
	});

	it.each(MUST_BE_PRESERVED)("ne touche JAMAIS le champ comptable %s", (field) => {
		expect(Object.prototype.hasOwnProperty.call(SCRUB, field)).toBe(false);
	});

	it("efface le snapshot facture via Prisma.DbNull (champ Json) et non null", () => {
		// invoiceDataSnapshot est un champ Json? → l'effacement passe par DbNull,
		// pas `null` (qui poserait JsonNull). Régression silencieuse sinon.
		expect(SCRUB.invoiceDataSnapshot).toBe(Prisma.DbNull);
	});

	it("nulle les pointeurs PDF (URL + hash) pour les deux documents", () => {
		expect(SCRUB.invoicePdfUrl).toBeNull();
		expect(SCRUB.invoicePdfHash).toBeNull();
		expect(SCRUB.creditNotePdfUrl).toBeNull();
		expect(SCRUB.creditNotePdfHash).toBeNull();
	});

	it("ne contient aucune clé inattendue au-delà du contrat (anti-dérive)", () => {
		const allowed = new Set<string>([...MUST_BE_SCRUBBED]);
		for (const key of Object.keys(SCRUB)) {
			expect(allowed.has(key)).toBe(true);
		}
	});
});

describe("UNPAID_ORDER_PII_SCRUB — contrat de champs (commandes jamais payées, F-A)", () => {
	it("couvre toute la surface opérationnelle partagée + les identifiants Stripe", () => {
		for (const key of Object.keys(CUSTOMER_SHIPPING_PII_SCRUB)) {
			expect(Object.prototype.hasOwnProperty.call(UNPAID_SCRUB, key)).toBe(true);
			// P2-A : undefined est invisible à Prisma — cf. le même garde sur SCRUB.
			expect(UNPAID_SCRUB[key]).not.toBeUndefined();
		}
		expect(UNPAID_SCRUB.stripePaymentIntentId).toBeNull();
	});

	it("ne touche AUCUNE surface facture (inexistante sur une commande non payée)", () => {
		const invoiceSurfaces = [
			"invoiceDataSnapshot",
			"invoiceDataHash",
			"invoicePdfUrl",
			"invoicePdfHash",
			"creditNotePdfUrl",
			"creditNotePdfHash",
			"invoiceNumber",
			"creditNoteNumber",
		];
		for (const key of invoiceSurfaces) {
			expect(Object.prototype.hasOwnProperty.call(UNPAID_SCRUB, key)).toBe(false);
		}
	});
});

describe("REFUND_PII_SCRUB — contrat de champs (avoirs par-refund, purge 10 ans)", () => {
	/** Surfaces PII du Refund : pointeurs PDF avoir (identité acheteur) + note libre. */
	const REFUND_MUST_BE_SCRUBBED = ["creditNotePdfUrl", "creditNotePdfHash", "note"] as const;

	/** Champs comptables du Refund qui DOIVENT survivre (Art. L123-22). */
	const REFUND_MUST_BE_PRESERVED = [
		"creditNoteNumber",
		"creditNoteGeneratedAt",
		"amount",
		"currency",
		"stripeRefundId",
		"status",
		"reason",
		"processedAt",
		"attemptCount",
	] as const;

	it.each(REFUND_MUST_BE_SCRUBBED)("scrub le champ PII Refund.%s", (field) => {
		expect(Object.prototype.hasOwnProperty.call(REFUND_SCRUB, field)).toBe(true);
		expect(REFUND_SCRUB[field]).toBeNull();
	});

	it.each(REFUND_MUST_BE_PRESERVED)("ne touche JAMAIS Refund.%s (comptable)", (field) => {
		expect(Object.prototype.hasOwnProperty.call(REFUND_SCRUB, field)).toBe(false);
	});

	it("ne contient aucune clé inattendue (anti-dérive)", () => {
		const allowed = new Set<string>([...REFUND_MUST_BE_SCRUBBED]);
		for (const key of Object.keys(REFUND_SCRUB)) {
			expect(allowed.has(key)).toBe(true);
		}
	});
});

describe("ORDER_HISTORY_PII_SCRUB — contrat de champs (neutralisation à l'échéance)", () => {
	// Arbitrage 2026-08-03 (audit rétention PII) : l'immutabilité d'OrderHistory
	// (invariant 3) vaut PENDANT la rétention 10 ans, pas au-delà. Seuls les deux
	// champs à valeurs libres sont neutralisés — la ligne d'audit survit.
	const HISTORY_SCRUB = ORDER_HISTORY_PII_SCRUB as Record<string, unknown>;

	/** Champs d'audit qui DOIVENT survivre (action, statuts, dates, auteur staff). */
	const HISTORY_MUST_BE_PRESERVED = [
		"action",
		"previousStatus",
		"newStatus",
		"previousPaymentStatus",
		"newPaymentStatus",
		"authorId",
		"authorName",
		"source",
		"createdAt",
		"orderId",
	] as const;

	it("neutralise note (null) et metadata (DbNull — champ Json)", () => {
		expect(HISTORY_SCRUB.note).toBeNull();
		expect(HISTORY_SCRUB.metadata).toBe(Prisma.DbNull);
	});

	it.each(HISTORY_MUST_BE_PRESERVED)("ne touche JAMAIS OrderHistory.%s (audit)", (field) => {
		expect(Object.prototype.hasOwnProperty.call(HISTORY_SCRUB, field)).toBe(false);
	});

	it("ne contient aucune clé inattendue (anti-dérive)", () => {
		expect(Object.keys(HISTORY_SCRUB).sort()).toEqual(["metadata", "note"]);
	});
});

describe("PURGED_ORDER_NOTE_CONTENT — contenu de remplacement des notes internes", () => {
	it("est un libellé neutre sans interpolation (aucune PII possible)", () => {
		expect(typeof PURGED_ORDER_NOTE_CONTENT).toBe("string");
		expect(PURGED_ORDER_NOTE_CONTENT.length).toBeGreaterThan(0);
		expect(PURGED_ORDER_NOTE_CONTENT).not.toMatch(/\$\{/);
	});
});

describe("tables couvertes par chaque passe de purge (source scan)", () => {
	// P2 (audit « Admin commandes » 2026-08-01) : le contrat ci-dessus verrouille
	// la FORME des payloads, mais pas QUELLES tables chaque passe scrube.
	// `purgeAbandonedOrderPii` (commandes jamais payées, 3 ans) ne scrubait que les
	// colonnes Order : les notes internes (texte libre) survivaient indéfiniment —
	// une commande `paidAt: null` n'atteint JAMAIS la purge 10 ans (clé `paidAt`).
	const source = readFileSync(join(__dirname, "..", "hard-delete-retention.service.ts"), "utf8");

	function bodyOf(fnName: string): string {
		const start = source.indexOf(`async function ${fnName}`);
		expect(start, `${fnName} introuvable dans hard-delete-retention.service.ts`).toBeGreaterThan(
			-1,
		);
		const nextFn = source.indexOf("async function", start + 1);
		return source.slice(start, nextFn === -1 ? undefined : nextFn);
	}

	it("purgeExpiredOrderPii (10 ans) scrube Order + Refund + OrderNote + OrderHistory", () => {
		const body = bodyOf("purgeExpiredOrderPii");
		expect(body).toContain("refund.updateMany");
		expect(body).toContain("orderNote.updateMany");
		expect(body).toContain("PURGED_ORDER_NOTE_CONTENT");
		expect(body).toContain("orderHistory.updateMany");
		expect(body).toContain("ORDER_HISTORY_PII_SCRUB");
	});

	it("purgeAbandonedOrderPii (jamais payées, 3 ans) scrube Order + OrderNote + OrderHistory", () => {
		const body = bodyOf("purgeAbandonedOrderPii");
		expect(body).toContain("orderNote.updateMany");
		expect(body).toContain("PURGED_ORDER_NOTE_CONTENT");
		expect(body).toContain("orderHistory.updateMany");
		expect(body).toContain("ORDER_HISTORY_PII_SCRUB");
	});
});
