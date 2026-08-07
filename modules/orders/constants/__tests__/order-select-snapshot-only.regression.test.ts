import { describe, expect, it } from "vitest";
import {
	CONFIRMATION_ORDER_SELECT,
	GET_ORDER_SELECT_ADMIN,
	GET_ORDER_SELECT_CUSTOMER,
	GET_ORDER_TRACKING_SELECT,
	GET_ORDERS_SELECT,
	MARK_AS_PAID_ORDER_SELECT,
	RESEND_EMAIL_ORDER_SELECT,
} from "../order.constants";

/**
 * @regression order-select-snapshot-only-2026-07-02
 *
 * Pendant read-side de l'invariant #4 (snapshots OrderItem figés au checkout,
 * cf. CLAUDE.md § "Facturation électronique — invariants" et
 * `order-item-snapshot-immutability.regression.test.ts` qui verrouille le côté
 * ÉCRITURE) : les sélecteurs d'affichage des commandes ne doivent JAMAIS joindre
 * les relations live `product`/`sku`. L'affichage d'une commande passée repose
 * exclusivement sur les colonnes snapshot (productTitle, productImageUrl,
 * skuColor, skuMaterial, skuSize, price, …).
 *
 * Risque si la garde saute : un `product: { select: { title } }` ajouté à un
 * sélecteur ferait afficher le titre/prix COURANT du produit sur une commande
 * historique — divergence avec la facture archivée (Art. L102 B LPF) dès que
 * l'admin renomme un produit ou change un prix.
 *
 * Les joins live légitimes (stock, invalidation cache, reorder) vivent dans des
 * selects dédiés hors de ces constantes d'affichage.
 *
 * ⚠️ Ce test ne garde que ce qu'il peut IMPORTER. Les 4 derniers sélecteurs
 * ci-dessous vivaient en `const` local dans leur fichier appelant, donc hors de
 * portée : la garde couvrait 3 surfaces d'affichage sur 7 (audit 2026-08-07).
 * Ils ont été centralisés dans `order.constants.ts` pour entrer ici. Tout
 * nouveau sélecteur exposant `items` doit suivre le même chemin — un select
 * d'items déclaré en local est un angle mort de cet invariant.
 */

const FORBIDDEN_RELATIONS = ["product", "sku"] as const;

function findLiveJoins(node: unknown, path: string, offenders: string[]): void {
	if (node === null || typeof node !== "object") return;
	for (const [key, value] of Object.entries(node)) {
		const childPath = `${path}.${key}`;
		if ((FORBIDDEN_RELATIONS as readonly string[]).includes(key)) {
			offenders.push(childPath);
		}
		findLiveJoins(value, childPath, offenders);
	}
}

const DISPLAY_SELECTS = {
	GET_ORDERS_SELECT,
	GET_ORDER_SELECT_ADMIN,
	GET_ORDER_SELECT_CUSTOMER,
	GET_ORDER_TRACKING_SELECT,
	CONFIRMATION_ORDER_SELECT,
	RESEND_EMAIL_ORDER_SELECT,
	MARK_AS_PAID_ORDER_SELECT,
} as const;

/** Sélecteurs dont la surface rend une VIGNETTE — `productImageUrl` requis. */
const SELECTS_WITH_IMAGE = {
	GET_ORDER_SELECT_ADMIN,
	GET_ORDER_SELECT_CUSTOMER,
	GET_ORDER_TRACKING_SELECT,
	CONFIRMATION_ORDER_SELECT,
} as const;

/**
 * Sélecteurs d'e-mail : pas de vignette (les templates n'affichent que du
 * texte), donc pas de `productImageUrl` — mais les 5 autres colonnes snapshot
 * restent obligatoires, ce sont elles qui décrivent l'article acheté.
 */
const TEXT_ONLY_SELECTS = {
	RESEND_EMAIL_ORDER_SELECT,
	MARK_AS_PAID_ORDER_SELECT,
} as const;

const TEXT_SNAPSHOT_COLUMNS = {
	productTitle: true,
	skuColor: true,
	skuMaterial: true,
	skuSize: true,
	price: true,
	quantity: true,
} as const;

describe("Sélecteurs d'affichage commandes — snapshots uniquement (Invariant #4, read-side)", () => {
	for (const [name, select] of Object.entries(DISPLAY_SELECTS)) {
		it(`${name} ne joint pas les relations live product/sku`, () => {
			const offenders: string[] = [];
			findLiveJoins(select, name, offenders);
			expect(offenders).toEqual([]);
		});
	}

	// Garde-fou complémentaire : si quelqu'un remplace les colonnes snapshot par
	// un join (échappant au test ci-dessus via un renommage), l'absence des
	// colonnes le signale.
	for (const [name, select] of Object.entries(SELECTS_WITH_IMAGE)) {
		it(`${name} expose les colonnes snapshot, vignette comprise`, () => {
			expect(select.items.select).toMatchObject({
				...TEXT_SNAPSHOT_COLUMNS,
				productImageUrl: true,
			});
		});
	}

	for (const [name, select] of Object.entries(TEXT_ONLY_SELECTS)) {
		it(`${name} expose les colonnes snapshot textuelles`, () => {
			expect(select.items.select).toMatchObject(TEXT_SNAPSHOT_COLUMNS);
		});
	}
});
